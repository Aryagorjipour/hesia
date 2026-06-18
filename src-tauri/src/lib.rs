mod commands;
mod relay;
mod tray;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::update_tray_locale,
            commands::get_app_version,
            commands::get_autostart,
            commands::set_autostart,
            commands::show_notification,
            commands::relay_health,
            commands::smtp_config_get,
            commands::smtp_config_put,
            commands::smtp_test,
            commands::smtp_send,
            commands::mcp_servers_get,
            commands::mcp_servers_put,
            commands::mcp_tools,
            commands::mcp_call,
        ])
        .setup(|app| {
            tray::setup_tray(app.handle())?;
            let relay_handle = app.handle().clone();
            tauri::async_runtime::spawn(relay::start(relay_handle));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Hesia");
}
