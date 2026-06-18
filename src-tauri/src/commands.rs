use std::collections::HashMap;

use serde_json::{json, Value};
use tauri::State;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_notification::NotificationExt;

use crate::relay::{self, McpServerConfig, RelayState, SmtpConfig};

#[tauri::command]
pub fn update_tray_locale(app: tauri::AppHandle, locale: String) -> Result<(), String> {
    crate::tray::rebuild_tray_menu(&app, &locale).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub fn get_autostart(app: tauri::AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or(false)
}

#[tauri::command]
pub fn set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    if enabled {
        app.autolaunch().enable().map_err(|e| e.to_string())
    } else {
        app.autolaunch().disable().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn show_notification(app: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn relay_health(state: State<'_, RelayState>) -> Result<Value, String> {
    let cfg = state.config.read().await;
    let smtp_configured = cfg.smtp.as_ref().is_some_and(|c| c.is_configured());
    let mcp_server_count = cfg
        .mcp_servers
        .iter()
        .filter(|s| s.enabled.unwrap_or(true))
        .count();
    Ok(json!({
        "ok": true,
        "version": env!("CARGO_PKG_VERSION"),
        "smtpConfigured": smtp_configured,
        "mcpBridgeReady": true,
        "mcpServerCount": mcp_server_count,
    }))
}

#[tauri::command]
pub async fn smtp_config_get(state: State<'_, RelayState>) -> Result<Value, String> {
    let cfg = state.config.read().await;
    let configured = cfg.smtp.as_ref().is_some_and(|c| c.is_configured());
    let public = cfg.smtp.as_ref().map(|c| c.to_public());
    Ok(json!({ "ok": true, "configured": configured, "config": public }))
}

#[tauri::command]
pub async fn smtp_config_put(
    state: State<'_, RelayState>,
    host: String,
    port: u16,
    secure: Option<bool>,
    user: String,
    pass: Option<String>,
    from: String,
) -> Result<Value, String> {
    let host = host.trim().to_string();
    let user = user.trim().to_string();
    let from = from.trim().to_string();

    if host.is_empty() || user.is_empty() || from.is_empty() {
        return Err("host, user, and from are required".into());
    }
    if port == 0 {
        return Err("port must be between 1 and 65535".into());
    }

    let mut cfg = state.config.write().await;
    let existing_pass = cfg.smtp.as_ref().and_then(|c| {
        if c.pass.is_empty() {
            None
        } else {
            Some(c.pass.clone())
        }
    });

    let new_pass = pass.as_deref().unwrap_or("").trim().to_string();
    let resolved_pass = if !new_pass.is_empty() {
        new_pass
    } else if let Some(p) = existing_pass {
        p
    } else {
        return Err("app password is required for first-time setup".into());
    };

    let secure = secure.unwrap_or(port == 465);
    let smtp = SmtpConfig {
        host,
        port,
        secure,
        user,
        pass: resolved_pass,
        from,
    };
    let public = smtp.to_public();
    let configured = smtp.is_configured();
    cfg.smtp = Some(smtp);
    let _ = state.persist.send(cfg.clone());

    Ok(json!({ "ok": true, "configured": configured, "config": public }))
}

#[tauri::command]
pub async fn smtp_test(state: State<'_, RelayState>) -> Result<Value, String> {
    let cfg = state.config.read().await;
    let smtp = cfg
        .smtp
        .as_ref()
        .filter(|c| c.is_configured())
        .ok_or("Save your email settings before testing")?
        .clone();
    drop(cfg);

    relay::smtp::test_connection(&smtp).await?;

    Ok(json!({ "ok": true, "message": "SMTP connection successful" }))
}

#[tauri::command]
pub async fn smtp_send(
    state: State<'_, RelayState>,
    to: String,
    subject: String,
    text: String,
    html: Option<String>,
) -> Result<Value, String> {
    let cfg = state.config.read().await;
    let smtp = cfg
        .smtp
        .as_ref()
        .filter(|c| c.is_configured())
        .ok_or("Email not set up — open Settings \u{2192} Integrations and save SMTP")?
        .clone();
    drop(cfg);

    let to = to.trim().to_string();
    let subject = subject.trim().to_string();
    let text = text.trim().to_string();

    if to.is_empty() || subject.is_empty() || text.is_empty() {
        return Err("to, subject, and text are required".into());
    }

    let message_id =
        relay::smtp::send_mail(&smtp, &to, &subject, &text, html.as_deref()).await?;

    Ok(json!({ "ok": true, "messageId": message_id }))
}

#[tauri::command]
pub async fn mcp_servers_get(state: State<'_, RelayState>) -> Result<Value, String> {
    let cfg = state.config.read().await;
    Ok(json!({ "ok": true, "servers": cfg.mcp_servers }))
}

#[tauri::command]
pub async fn mcp_servers_put(
    state: State<'_, RelayState>,
    servers: Vec<McpServerConfig>,
) -> Result<Value, String> {
    for srv in &servers {
        if srv.id.is_empty() {
            return Err("Each connection needs an id".into());
        }
        if srv.name.is_empty() {
            return Err("Each connection needs a name".into());
        }
        if !["stdio", "sse", "http"].contains(&srv.transport.as_str()) {
            return Err(format!("Invalid transport for {}", srv.name));
        }
        if srv.transport == "stdio" && srv.command.as_deref().unwrap_or("").is_empty() {
            return Err(format!("{} needs a command", srv.name));
        }
        if (srv.transport == "sse" || srv.transport == "http")
            && srv.url.as_deref().unwrap_or("").is_empty()
        {
            return Err(format!("{} needs a server address", srv.name));
        }
    }

    state.mcp.lock().await.shutdown().await;

    let mut cfg = state.config.write().await;
    cfg.mcp_servers = servers.clone();
    let _ = state.persist.send(cfg.clone());

    Ok(json!({ "ok": true, "servers": servers }))
}

#[tauri::command]
pub async fn mcp_tools(state: State<'_, RelayState>) -> Result<Value, String> {
    let servers = state.config.read().await.mcp_servers.clone();
    let tools = state.mcp.lock().await.list_all_tools(&servers).await;
    Ok(json!({ "tools": tools }))
}

#[tauri::command]
pub async fn mcp_call(
    state: State<'_, RelayState>,
    server_id: String,
    name: String,
    arguments: Option<HashMap<String, Value>>,
) -> Result<Value, String> {
    let cfg = state.config.read().await;
    let servers = cfg.mcp_servers.clone();
    let smtp = cfg.smtp.clone();
    drop(cfg);

    let args = arguments.unwrap_or_default();
    let result = state
        .mcp
        .lock()
        .await
        .call_tool(&servers, &smtp, &server_id, &name, args)
        .await;

    serde_json::to_value(result).map_err(|e| e.to_string())
}
