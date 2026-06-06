//! Minimal Tauri shell for ARWEB API Tester.
//!
//! Design rule (from the roadmap): **Rust holds no business logic.** All testing,
//! catalog, agent and mock-server logic lives in the TypeScript Node sidecar.
//! This file does exactly two things:
//!   1. Create the application window (the React frontend).
//!   2. In a packaged build, launch the bundled Node sidecar and stop it on exit.
//!
//! In development the sidecar is started by `npm run dev` (concurrently with
//! Vite), so the spawn here is intentionally best-effort: if the sidecar binary
//! isn't bundled (dev), we log and carry on rather than failing to open.

#[cfg(not(debug_assertions))]
use tauri::Manager;
#[cfg(not(debug_assertions))]
use tauri_plugin_shell::{process::CommandChild, ShellExt};
#[cfg(not(debug_assertions))]
use std::sync::Mutex;

/// Holds the sidecar child so we can terminate it when the app closes.
#[cfg(not(debug_assertions))]
#[derive(Default)]
struct SidecarState(Mutex<Option<CommandChild>>);

pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init());

    #[cfg(not(debug_assertions))]
    let builder = builder
        .manage(SidecarState::default())
        .setup(|app| {
            // Resolve the user-specific AppData path for the SQLite database.
            // Passed as DB_PATH so the sidecar does NOT fall back to the
            // dev-time repo-relative path (data/app.db).
            let db_path = app
                .path()
                .app_data_dir()
                .map(|d| d.join("arweb.db").to_string_lossy().into_owned())
                .unwrap_or_default();

            match app.shell().sidecar("arweb-sidecar") {
                Ok(cmd) => {
                    let cmd = if db_path.is_empty() {
                        cmd
                    } else {
                        cmd.env("DB_PATH", &db_path)
                    };
                    match cmd.spawn() {
                        Ok((_rx, child)) => {
                            let state = app.state::<SidecarState>();
                            *state.0.lock().unwrap() = Some(child);
                        }
                        Err(e) => eprintln!("[arweb] failed to spawn sidecar: {e}"),
                    }
                }
                Err(e) => eprintln!("[arweb] sidecar binary not found ({e}); \
                    expecting an externally-running sidecar"),
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<SidecarState>();
                if let Some(child) = state.0.lock().unwrap().take() {
                    let _ = child.kill();
                };
            }
        });

    builder
        .run(tauri::generate_context!())
        .expect("error while running ARWEB API Tester");
}
