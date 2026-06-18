mod config;
pub(crate) mod mcp;
mod migrate;
pub(crate) mod smtp;

use std::sync::Arc;

use tauri::Manager;
use tokio::sync::{mpsc::UnboundedSender, Mutex, RwLock};

pub use config::{McpServerConfig, RelayConfig, SmtpConfig};

#[derive(Clone)]
pub struct RelayState {
    pub config: Arc<RwLock<RelayConfig>>,
    pub persist: UnboundedSender<RelayConfig>,
    pub mcp: Arc<Mutex<mcp::McpPool>>,
}

pub async fn start<R: tauri::Runtime + 'static>(app: tauri::AppHandle<R>) {
    let relay_config = config::load_from_store(&app);

    let shared = Arc::new(RwLock::new(relay_config));
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<RelayConfig>();

    let app_for_persist = app.clone();
    tokio::spawn(async move {
        while let Some(cfg) = rx.recv().await {
            config::persist_to_store(&app_for_persist, &cfg);
        }
    });

    let state = RelayState {
        config: shared,
        persist: tx,
        mcp: Arc::new(Mutex::new(mcp::McpPool::new())),
    };

    // Manage state before migration so commands are never unresolved.
    app.manage(state.clone());

    // Async migration — updates managed state in the background.
    if state.config.read().await.smtp.is_none() {
        if let Some(smtp) = migrate::try_migrate_smtp().await {
            eprintln!("[relay] migrated SMTP config from Bun relay (password must be re-entered)");
            let mut cfg = state.config.write().await;
            cfg.smtp = Some(smtp);
            let _ = state.persist.send(cfg.clone());
        }
    }
}
