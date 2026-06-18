use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "relay.json";
const SMTP_KEY: &str = "smtp";
const MCP_KEY: &str = "mcp_servers";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SmtpConfig {
    pub host: String,
    pub port: u16,
    pub secure: bool,
    pub user: String,
    pub pass: String,
    pub from: String,
}

impl SmtpConfig {
    pub fn is_configured(&self) -> bool {
        !self.host.is_empty() && !self.user.is_empty() && !self.from.is_empty()
    }

    pub fn to_public(&self) -> PublicSmtpConfig {
        PublicSmtpConfig {
            host: self.host.clone(),
            port: self.port,
            secure: self.secure,
            user: self.user.clone(),
            from: self.from.clone(),
            pass_configured: !self.pass.is_empty(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicSmtpConfig {
    pub host: String,
    pub port: u16,
    pub secure: bool,
    pub user: String,
    pub from: String,
    #[serde(rename = "passConfigured")]
    pub pass_configured: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerConfig {
    pub id: String,
    pub name: String,
    pub transport: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub env: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Default)]
pub struct RelayConfig {
    pub smtp: Option<SmtpConfig>,
    pub mcp_servers: Vec<McpServerConfig>,
}

pub fn load_from_store<R: Runtime>(app: &AppHandle<R>) -> RelayConfig {
    let Ok(store) = app.store(STORE_FILE) else {
        return RelayConfig::default();
    };

    let smtp = store
        .get(SMTP_KEY)
        .and_then(|v| serde_json::from_value::<SmtpConfig>(v).ok());

    let mcp_servers = store
        .get(MCP_KEY)
        .and_then(|v| serde_json::from_value::<Vec<McpServerConfig>>(v).ok())
        .unwrap_or_default();

    RelayConfig { smtp, mcp_servers }
}

pub fn persist_to_store<R: Runtime>(app: &AppHandle<R>, config: &RelayConfig) {
    let Ok(store) = app.store(STORE_FILE) else {
        return;
    };

    if let Some(smtp) = &config.smtp {
        if let Ok(v) = serde_json::to_value(smtp) {
            store.set(SMTP_KEY, v);
        }
    } else {
        let _ = store.delete(SMTP_KEY);
    }

    if let Ok(v) = serde_json::to_value(&config.mcp_servers) {
        store.set(MCP_KEY, v);
    }

    let _ = store.save();
}
