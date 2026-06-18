use std::collections::HashMap;

use rmcp::{
    RoleClient, ServiceExt,
    model::{CallToolRequestParams, RawContent},
    transport::TokioChildProcess,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::process::Command;

use crate::relay::config::{McpServerConfig, SmtpConfig};
use crate::relay::smtp;

/// `RunningService` derefs to `Peer<RoleClient>`, which has `list_tools`/`call_tool`.
pub type McpPeer = rmcp::service::RunningService<RoleClient, ()>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BridgeTool {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(rename = "inputSchema", skip_serializing_if = "Option::is_none")]
    pub input_schema: Option<Value>,
    #[serde(rename = "serverId", skip_serializing_if = "Option::is_none")]
    pub server_id: Option<String>,
    #[serde(rename = "serverName", skip_serializing_if = "Option::is_none")]
    pub server_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCallResult {
    pub ok: bool,
    pub content: Vec<ContentItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentItem {
    #[serde(rename = "type")]
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
}

const BUILTIN_TOOLS: &[(&str, &str, &str)] = &[
    (
        "hesia_send_email",
        "Send an email through the local Hesia relay SMTP transport. Requires relay SMTP config.",
        r#"{"type":"object","properties":{"to":{"type":"string"},"subject":{"type":"string"},"text":{"type":"string"},"html":{"type":"string"}},"required":["to","subject","text"]}"#,
    ),
    (
        "hesia_relay_health",
        "Check whether the Hesia relay is running and SMTP is configured.",
        r#"{"type":"object","properties":{}}"#,
    ),
];

fn builtin_tools() -> Vec<BridgeTool> {
    BUILTIN_TOOLS
        .iter()
        .map(|(name, desc, schema)| BridgeTool {
            name: name.to_string(),
            description: Some(desc.to_string()),
            input_schema: serde_json::from_str(schema).ok(),
            server_id: Some("hesia-relay".to_string()),
            server_name: Some("Hesia Relay".to_string()),
        })
        .collect()
}

pub struct McpPool {
    clients: HashMap<String, McpPeer>,
}

impl McpPool {
    pub fn new() -> Self {
        Self {
            clients: HashMap::new(),
        }
    }

    async fn connect(&mut self, server: &McpServerConfig) -> Result<&McpPeer, String> {
        if self.clients.contains_key(&server.id) {
            return Ok(self.clients.get(&server.id).unwrap());
        }

        let peer: McpPeer = match server.transport.as_str() {
            "stdio" => {
                let cmd_str = server
                    .command
                    .as_deref()
                    .ok_or_else(|| format!("{} requires a command", server.name))?;

                let mut cmd = Command::new(cmd_str);
                if let Some(args) = &server.args {
                    cmd.args(args);
                }
                if let Some(env) = &server.env {
                    cmd.envs(env);
                }

                let transport = TokioChildProcess::new(cmd).map_err(|e| e.to_string())?;
                ().serve(transport).await.map_err(|e| e.to_string())?
            }
            "sse" | "http" => {
                return Err(format!(
                    "{}: SSE/HTTP MCP transport requires a future update. Use stdio for now.",
                    server.name
                ));
            }
            other => return Err(format!("unsupported transport: {other}")),
        };

        self.clients.insert(server.id.clone(), peer);
        Ok(self.clients.get(&server.id).unwrap())
    }

    pub async fn list_all_tools(&mut self, servers: &[McpServerConfig]) -> Vec<BridgeTool> {
        let mut tools = builtin_tools();

        for server in servers.iter().filter(|s| s.enabled.unwrap_or(true)) {
            match self.connect(server).await {
                Ok(peer) => match peer.list_tools(None).await {
                    Ok(result) => {
                        for tool in result.tools {
                            tools.push(BridgeTool {
                                name: tool.name.to_string(),
                                description: tool.description.map(|d| d.to_string()),
                                input_schema: Some(Value::Object((*tool.input_schema).clone())),
                                server_id: Some(server.id.clone()),
                                server_name: Some(server.name.clone()),
                            });
                        }
                    }
                    Err(e) => eprintln!("[mcp] list_tools failed for {}: {e}", server.name),
                },
                Err(e) => eprintln!("[mcp] connect failed for {}: {e}", server.name),
            }
        }

        tools
    }

    pub async fn call_tool(
        &mut self,
        servers: &[McpServerConfig],
        smtp: &Option<SmtpConfig>,
        server_id: &str,
        name: &str,
        args: HashMap<String, Value>,
    ) -> ToolCallResult {
        if server_id == "hesia-relay" {
            return self.call_builtin(smtp, name, args).await;
        }

        let Some(server) = servers.iter().find(|s| s.id == server_id) else {
            return err_result(format!("unknown server: {server_id}"));
        };

        let peer = match self.connect(server).await {
            Ok(p) => p,
            Err(e) => return err_result(e),
        };

        let arguments: serde_json::Map<String, Value> = args.into_iter().collect();
        match peer
            .call_tool(
                CallToolRequestParams::new(name.to_string()).with_arguments(arguments),
            )
            .await
        {
            Ok(result) => {
                let content = result
                    .content
                    .iter()
                    .map(|c| match &c.raw {
                        RawContent::Text(t) => ContentItem {
                            kind: "text".to_string(),
                            text: Some(t.text.clone()),
                        },
                        _ => ContentItem {
                            kind: "resource".to_string(),
                            text: None,
                        },
                    })
                    .collect();
                ToolCallResult {
                    ok: !result.is_error.unwrap_or(false),
                    content,
                    error: if result.is_error.unwrap_or(false) {
                        Some("Tool returned error".to_string())
                    } else {
                        None
                    },
                }
            }
            Err(e) => err_result(e.to_string()),
        }
    }

    async fn call_builtin(
        &self,
        smtp: &Option<SmtpConfig>,
        name: &str,
        args: HashMap<String, Value>,
    ) -> ToolCallResult {
        match name {
            "hesia_relay_health" => {
                let ok = smtp.as_ref().is_some_and(|s| s.is_configured());
                let text = serde_json::json!({ "ok": true, "smtpConfigured": ok }).to_string();
                ToolCallResult {
                    ok: true,
                    content: vec![ContentItem {
                        kind: "text".to_string(),
                        text: Some(text),
                    }],
                    error: None,
                }
            }
            "hesia_send_email" => {
                let Some(cfg) = smtp else {
                    return err_result("SMTP not configured");
                };
                if !cfg.is_configured() {
                    return err_result("SMTP not configured");
                }

                let to = str_arg(&args, "to");
                let subject = str_arg(&args, "subject");
                let text = str_arg(&args, "text");
                let html = args.get("html").and_then(|v| v.as_str()).map(str::to_string);

                if to.is_empty() || subject.is_empty() || text.is_empty() {
                    return err_result("to, subject, and text are required");
                }

                match smtp::send_mail(cfg, &to, &subject, &text, html.as_deref()).await {
                    Ok(id) => {
                        let text = serde_json::json!({ "messageId": id }).to_string();
                        ToolCallResult {
                            ok: true,
                            content: vec![ContentItem {
                                kind: "text".to_string(),
                                text: Some(text),
                            }],
                            error: None,
                        }
                    }
                    Err(e) => err_result(e),
                }
            }
            _ => err_result(format!("unknown built-in tool: {name}")),
        }
    }

    pub async fn shutdown(&mut self) {
        for (_, peer) in self.clients.drain() {
            let _ = peer.cancel().await;
        }
    }
}

fn err_result(msg: impl Into<String>) -> ToolCallResult {
    ToolCallResult {
        ok: false,
        content: vec![],
        error: Some(msg.into()),
    }
}

fn str_arg(args: &HashMap<String, Value>, key: &str) -> String {
    args.get(key)
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string()
}
