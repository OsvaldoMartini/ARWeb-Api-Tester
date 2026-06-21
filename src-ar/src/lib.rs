//! Minimal Tauri shell for AR.
//!
//! Design rule: Rust holds no business logic. All agent/AI logic lives in the
//! C# backend executable on port 8787.
//! This file does exactly two things:
//!   1. Create the application window (the React frontend at dist-ar/).
//!   2. In a packaged build, launch the bundled C# backend and stop it on exit.
//!
//! AR uses a flat data path so the package stays simple:
//! AppData/Roaming/data/arweb.db

#[cfg(not(debug_assertions))]
use tauri::Manager;
#[cfg(not(debug_assertions))]
use tauri_plugin_shell::{process::CommandChild, ShellExt};
#[cfg(not(debug_assertions))]
use std::sync::Mutex;

/// Holds the backend child so we can terminate it when the app closes.
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
            let db_path = match app.path().data_dir() {
                Ok(dir) => {
                    let data = dir.join("data");
                    let _ = std::fs::create_dir_all(&data);
                    let p = data.join("arweb.db");
                    p.to_string_lossy().into_owned()
                }
                Err(_) => String::new(),
            };

            match app.shell().sidecar("arapi-backend") {
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
                        Err(e) => eprintln!("[ar] failed to spawn backend: {e}"),
                    }
                }
                Err(e) => eprintln!("[ar] backend binary not found ({e}); \
                    expecting an externally-running backend"),
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
        .expect("error while running AR");
}
