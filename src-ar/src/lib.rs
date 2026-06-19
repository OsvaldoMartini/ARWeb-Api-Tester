//! Minimal Tauri shell for AR Conversational.
//!
//! Design rule: Rust holds no business logic. All agent/AI logic lives in the
//! ARAPI TypeScript Node sidecar (server-arapi, port 8787).
//! This file does exactly two things:
//!   1. Create the application window (the React frontend at dist-ar/).
//!   2. In a packaged build, launch the bundled ARAPI sidecar and stop it on exit.
//!
//! Both ARAPI Tester and AR Conversational share the same SQLite database.
//! We use data_dir()/ARWebShared/arweb.db so both apps resolve to the same path
//! regardless of their bundle identifiers.

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
            // Shared DB path — same across ARAPI Tester and AR Conversational.
            // data_dir() returns AppData/Roaming on Windows (no bundle-id suffix).
            let db_path = match app.path().data_dir() {
                Ok(dir) => {
                    let shared = dir.join("ARWebShared");
                    let _ = std::fs::create_dir_all(&shared);
                    let p = shared.join("arweb.db");
                    p.to_string_lossy().into_owned()
                }
                Err(_) => String::new(),
            };

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
                        Err(e) => eprintln!("[ar-conversational] failed to spawn ARAPI sidecar: {e}"),
                    }
                }
                Err(e) => eprintln!("[ar-conversational] sidecar binary not found ({e}); \
                    expecting an externally-running ARAPI backend"),
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
        .expect("error while running AR Conversational");
}
