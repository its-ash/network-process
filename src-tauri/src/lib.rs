use serde::{Deserialize, Serialize};
use std::process::Command;
use sysinfo::System;

#[derive(Serialize, Deserialize)]
pub struct ProcessInfo {
    pid: u32,
    name: String,
    cpu: f32,
    memory: u64,
    user: String,
    ports: Vec<u16>,
}

fn get_port_mapping() -> std::collections::HashMap<u32, Vec<u16>> {
    let mut pid_to_ports: std::collections::HashMap<u32, Vec<u16>> = std::collections::HashMap::new();

    #[cfg(not(target_os = "windows"))]
    {
        let output = Command::new("lsof")
            .args(&["-i", "-P", "-n", "-sTCP:LISTEN"])
            .output();

        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            for line in stdout.lines().skip(1) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() > 8 {
                    if let Ok(pid) = parts[1].parse::<u32>() {
                        if let Some(addr) = parts[parts.len() - 2].split(':').last() {
                            if let Ok(port) = addr.parse::<u16>() {
                                pid_to_ports.entry(pid).or_default().push(port);
                            }
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let output = Command::new("netstat")
            .arg("-ano")
            .output();

        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            for line in stdout.lines() {
                let parts: Vec<&str> = line.split_whitespace().collect();
                // TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       1234
                if parts.len() >= 5 && parts[3] == "LISTENING" {
                    if let Ok(pid) = parts[parts.len() - 1].parse::<u32>() {
                        if let Some(addr) = parts[1].split(':').last() {
                            if let Ok(port) = addr.parse::<u16>() {
                                pid_to_ports.entry(pid).or_default().push(port);
                            }
                        }
                    }
                }
            }
        }
    }

    pid_to_ports
}

#[tauri::command]
fn fetch_processes() -> Vec<ProcessInfo> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let pid_to_ports = get_port_mapping();

    sys.processes()
        .iter()
        .filter_map(|(pid, process)| {
            let pid_u32 = pid.as_u32();
            let ports = pid_to_ports.get(&pid_u32).cloned().unwrap_or_default();

            // Filter: ONLY show if it has ports
            if !ports.is_empty() {
                Some(ProcessInfo {
                    pid: pid_u32,
                    name: process.name().to_string_lossy().to_string(),
                    cpu: process.cpu_usage(),
                    memory: process.memory(),
                    user: process.user_id().map(|u| u.to_string()).unwrap_or_default(),
                    ports,
                })
            } else {
                None
            }
        })
        .collect()
}

#[tauri::command]
fn kill_process(pid: u32) -> Result<(), String> {
    #[cfg(not(target_os = "windows"))]
    let output = Command::new("kill")
        .arg("-9")
        .arg(pid.to_string())
        .output();

    #[cfg(target_os = "windows")]
    let output = Command::new("taskkill")
        .arg("/F")
        .arg("/PID")
        .arg(pid.to_string())
        .output();

    match output {
        Ok(out) if out.status.success() => Ok(()),
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr);
            Err(format!("Failed to kill {}: {}", pid, stderr))
        }
        Err(e) => Err(format!("System error: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![fetch_processes, kill_process])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
