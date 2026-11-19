// Command CMS desktop shell. The CMS UI talks to same-origin /api, /releases and /uploads routes,
// so the window must load from the local Node server (cms/server/standalone.mjs on 127.0.0.1:1430),
// not from bundled files. In release builds this shell starts the bundled Node sidecar against the
// bundled cms/ resources, keeps its data in %APPDATA%\CommandCMS\data, and stops it on exit.
// The window opens on a small splash page and moves to the server once it answers.
// In debug builds `npm run dev` (beforeDevCommand) already serves the CMS on 1430, so we skip the sidecar.

use std::fs::{self, OpenOptions};
use std::net::{SocketAddr, TcpStream};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Manager, RunEvent};

const PORT: u16 = 1430;

struct Sidecar(Mutex<Option<Child>>);

/// Closes the server's stdin (it then shuts down cleanly) and only kills it if it has not exited in a few seconds.
fn kill_sidecar(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<Sidecar>() {
        if let Some(mut child) = state.0.lock().unwrap().take() {
            drop(child.stdin.take());
            for _ in 0..25 {
                if matches!(child.try_wait(), Ok(Some(_))) {
                    return;
                }
                std::thread::sleep(Duration::from_millis(100));
            }
            let _ = child.kill();
        }
    }
}

/// Node cannot open Windows extended-length paths (\\?\C:\...), so drop the prefix.
fn plain(p: PathBuf) -> PathBuf {
    let s = p.to_string_lossy();
    match s.strip_prefix(r"\\?\") {
        Some(rest) => PathBuf::from(rest),
        None => p,
    }
}

fn port_open() -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], PORT));
    TcpStream::connect_timeout(&addr, Duration::from_millis(300)).is_ok()
}

/// %APPDATA%\CommandCMS: data\ (draft, releases, signing keys, uploads) and cms.log.
fn home_dir(exe_dir: &PathBuf) -> PathBuf {
    std::env::var("APPDATA")
        .map(|a| PathBuf::from(a).join("CommandCMS"))
        .unwrap_or_else(|_| exe_dir.join("CommandCMS"))
}

/// Starts the bundled Node against cms/server/standalone.mjs, logging to %APPDATA%\CommandCMS\cms.log.
fn start_server(app: &tauri::AppHandle) -> Result<Child, String> {
    let exe_dir = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or("no exe dir")?
        .to_path_buf();
    // Tauri strips the target triple from externalBin when bundling, so the installed name is node.exe.
    let node = ["node.exe", "node-x86_64-pc-windows-msvc.exe"]
        .iter()
        .map(|n| exe_dir.join(n))
        .find(|p| p.exists())
        .ok_or("bundled node.exe not found next to the app")?;
    let mut roots = vec![exe_dir.clone()];
    if let Ok(r) = app.path().resource_dir() {
        roots.insert(0, r);
    }
    let cms = roots
        .iter()
        .map(|r| plain(r.join("cms")))
        .find(|p| p.join("server").join("standalone.mjs").exists())
        .ok_or("cms/server/standalone.mjs not found")?;
    let home = home_dir(&exe_dir);
    let data = home.join("data");
    fs::create_dir_all(&data).map_err(|e| e.to_string())?;
    let log = OpenOptions::new()
        .create(true)
        .append(true)
        .open(home.join("cms.log"))
        .map_err(|e| e.to_string())?;
    let err = log.try_clone().map_err(|e| e.to_string())?;
    let mut cmd = Command::new(node);
    cmd.arg(cms.join("server").join("standalone.mjs"))
        .current_dir(&cms)
        .env("COMMAND_CMS_DATA", &data)
        .env("COMMAND_CMS_DIST", cms.join("dist"))
        .env("COMMAND_CMS_SEED", cms.join("seed").join("draft.json"))
        .env("COMMAND_CMS_PORT", PORT.to_string())
        .env("COMMAND_CMS_STDIN_SHUTDOWN", "1")
        .stdin(Stdio::piped())
        .stdout(Stdio::from(log))
        .stderr(Stdio::from(err));
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    cmd.spawn().map_err(|e| e.to_string())
}

fn show_failure(app: &tauri::AppHandle, text: &str) {
    if let Some(w) = app.get_webview_window("main") {
        let js = format!("window.cmsFailed && window.cmsFailed({})", serde_json_string(text));
        let _ = w.eval(&js);
    }
}

/// Minimal JSON string escape for the failure message.
fn serde_json_string(s: &str) -> String {
    let mut out = String::from("\"");
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => {}
            c if (c as u32) < 0x20 => out.push(' '),
            c => out.push(c),
        }
    }
    out.push('"');
    out
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
        .manage(Sidecar(Mutex::new(None)))
        .setup(|app| {
            let handle = app.handle().clone();
            let mut started = false;
            // Something already answers on 1430 (npm run dev, or debug builds): use it instead of a second server.
            if !cfg!(debug_assertions) && !port_open() {
                match start_server(&handle) {
                    Ok(child) => {
                        *app.state::<Sidecar>().0.lock().unwrap() = Some(child);
                        started = true;
                    }
                    Err(e) => {
                        let msg = format!("Could not start the server: {e}");
                        let h = handle.clone();
                        std::thread::spawn(move || {
                            std::thread::sleep(Duration::from_millis(600));
                            show_failure(&h, &msg);
                        });
                        return Ok(());
                    }
                }
            }
            std::thread::spawn(move || {
                let deadline = Instant::now() + Duration::from_secs(30);
                while Instant::now() < deadline {
                    if port_open() {
                        if let Some(w) = handle.get_webview_window("main") {
                            let url = format!("http://127.0.0.1:{PORT}/").parse().unwrap();
                            let _ = w.navigate(url);
                        }
                        return;
                    }
                    // The sidecar exited early (most often: port 1430 taken by something that is not the CMS).
                    if started {
                        if let Some(state) = handle.try_state::<Sidecar>() {
                            if let Some(child) = state.0.lock().unwrap().as_mut() {
                                if let Ok(Some(status)) = child.try_wait() {
                                    show_failure(
                                        &handle,
                                        &format!("The server stopped ({status}). Details are in %APPDATA%\\CommandCMS\\cms.log"),
                                    );
                                    return;
                                }
                            }
                        }
                    }
                    std::thread::sleep(Duration::from_millis(200));
                }
                show_failure(
                    &handle,
                    "Nothing answered on 127.0.0.1:1430 within 30 seconds. Details are in %APPDATA%\\CommandCMS\\cms.log",
                );
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Command CMS");

    app.run(|handle, event| {
        if let RunEvent::Exit = event {
            kill_sidecar(handle);
        }
    });
}
