// Desktop shell. The dashboard talks to a local Node service (service/index.mjs,
// http://127.0.0.1:8787). In release builds this shell spawns the bundled Node
// sidecar against the bundled service/ resources and kills it on exit. In debug
// builds `npm run live` (beforeDevCommand) already runs the service, so we skip.

use std::fs::{self, OpenOptions};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{Manager, RunEvent};

struct Sidecar(Mutex<Option<Child>>);

fn kill_sidecar(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<Sidecar>() {
        if let Some(mut child) = state.0.lock().unwrap().take() {
            let _ = child.kill();
        }
    }
}

/// Node cannot open Windows extended-length paths (\\?\C:\...), so drop the prefix.
fn plain(p: std::path::PathBuf) -> std::path::PathBuf {
    let s = p.to_string_lossy();
    match s.strip_prefix(r"\\?\") {
        Some(rest) => std::path::PathBuf::from(rest),
        None => p,
    }
}

/// Starts the bundled Node against service/index.mjs, logging to %APPDATA%\CommandStation\service.log.
fn start_service(app: &tauri::AppHandle) -> Result<Child, String> {
    let exe_dir = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or("no exe dir")?
        .to_path_buf();
    let node = ["node.exe", "node-x86_64-pc-windows-msvc.exe"]
        .iter()
        .map(|n| exe_dir.join(n))
        .find(|p| p.exists())
        .ok_or("bundled node.exe not found next to the app")?;
    let mut roots = vec![exe_dir.clone()];
    if let Ok(r) = app.path().resource_dir() {
        roots.insert(0, r);
    }
    let service = roots
        .iter()
        .map(|r| plain(r.join("service")))
        .find(|p| p.join("index.mjs").exists())
        .ok_or("service/index.mjs not found")?;
    let log_dir = std::env::var("APPDATA")
        .map(|a| std::path::PathBuf::from(a).join("CommandStation"))
        .unwrap_or_else(|_| exe_dir.clone());
    let _ = fs::create_dir_all(&log_dir);
    let log = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_dir.join("service.log"))
        .map_err(|e| e.to_string())?;
    let err = log.try_clone().map_err(|e| e.to_string())?;
    let mut cmd = Command::new(node);
    cmd.arg(service.join("index.mjs"))
        .current_dir(&service)
        .stdin(Stdio::null())
        .stdout(Stdio::from(log))
        .stderr(Stdio::from(err));
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    cmd.spawn().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .manage(Sidecar(Mutex::new(None)))
        .setup(|app| {
            if cfg!(debug_assertions) {
                return Ok(());
            }
            match start_service(app.handle()) {
                Ok(child) => *app.state::<Sidecar>().0.lock().unwrap() = Some(child),
                Err(e) => eprintln!("could not start the service: {e}"),
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Command Station");

    app.run(|handle, event| {
        if let RunEvent::Exit = event {
            kill_sidecar(handle);
        }
    });
}
