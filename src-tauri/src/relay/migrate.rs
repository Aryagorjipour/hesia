use std::time::Duration;

use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

use crate::relay::config::SmtpConfig;

/// Probe 127.0.0.1:8787 for a running Bun relay and return its SMTP config.
/// Returns `None` quickly if the port is not listening or the response is unusable.
pub async fn try_migrate_smtp() -> Option<SmtpConfig> {
    // If the port is reachable we must be racing with an existing relay instance.
    let mut stream = tokio::time::timeout(
        Duration::from_millis(300),
        TcpStream::connect("127.0.0.1:8787"),
    )
    .await
    .ok()?
    .ok()?;

    let req =
        b"GET /smtp/config HTTP/1.1\r\nHost: 127.0.0.1:8787\r\nConnection: close\r\n\r\n";
    stream.write_all(req).await.ok()?;

    let mut buf = vec![0u8; 8192];
    let n = tokio::time::timeout(Duration::from_millis(500), stream.read(&mut buf))
        .await
        .ok()?
        .ok()?;

    let raw = String::from_utf8_lossy(&buf[..n]);
    let body = raw.split("\r\n\r\n").nth(1)?;

    let json: serde_json::Value = serde_json::from_str(body.trim()).ok()?;
    let cfg = json.get("config")?.as_object()?;

    let host = cfg.get("host")?.as_str()?.to_string();
    let port = cfg.get("port")?.as_u64()? as u16;
    let secure = cfg.get("secure").and_then(|v| v.as_bool()).unwrap_or(port == 465);
    let user = cfg.get("user")?.as_str()?.to_string();
    let from = cfg.get("from")?.as_str()?.to_string();

    if host.is_empty() || user.is_empty() || from.is_empty() {
        return None;
    }

    Some(SmtpConfig {
        host,
        port,
        secure,
        user,
        pass: String::new(), // password intentionally not migrated
        from,
    })
}
