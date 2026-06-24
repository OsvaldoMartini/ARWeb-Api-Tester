//! Minimal Tauri shell for ARAPI.
//!
//! Design rule (from the roadmap): Rust holds no business logic. All ARAPI
//! backend logic lives in the C# backend executable.
//! This file does exactly two things:
//!   1. Create the application window (the React frontend).
//!   2. In a packaged build, launch the bundled C# backend and stop it on exit.
//!
//! In development the backend may not be bundled, so the spawn is best-effort:
//! if the binary isn't present we log and carry on rather than failing to open.

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
            // Prefer a portable data folder beside ARAPI.exe when present.
            // This is the layout produced in artifacts/ARAPI for client zips.
            let portable_db = std::env::current_exe()
                .ok()
                .and_then(|exe| exe.parent().map(|dir| dir.join("data").join("arweb.db")))
                .filter(|path| path.parent().is_some_and(|dir| dir.exists()));

            let db_path = match portable_db {
                Some(path) => path.to_string_lossy().into_owned(),
                None => match app.path().data_dir() {
                    Ok(dir) => {
                        let data = dir.join("data");
                        let _ = std::fs::create_dir_all(&data);
                        let p = data.join("arweb.db");
                        p.to_string_lossy().into_owned()
                    }
                    Err(_) => String::new(),
                },
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
                        Err(e) => eprintln!("[arapi] failed to spawn backend: {e}"),
                    }
                }
                Err(e) => eprintln!("[arapi] backend binary not found ({e}); \
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
        .expect("error while running ARAPI");
}
