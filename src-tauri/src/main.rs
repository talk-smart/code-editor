#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::fs::File;
use std::io::{Read, Write};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct Config {
    api_key: String,
    ai_model: String,
}

fn get_config_path() -> std::path::PathBuf {
    let mut path = if cfg!(target_os = "windows") {
        std::path::PathBuf::from(std::env::var("USERPROFILE").unwrap_or_else(|_| ".".to_string()))
    } else {
        std::path::PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| ".".to_string()))
    };
    path.push(".antigravity_config.json");
    path
}

// Tauri v2 command to execute shell commands natively on the host OS
#[tauri::command]
fn execute_command(cmd: String) -> Result<String, String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("powershell")
            .args(&["-Command", &cmd])
            .output()
    } else {
        Command::new("sh")
            .args(&["-c", &cmd])
            .output()
    };

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            
            if out.status.success() {
                Ok(stdout)
            } else {
                Err(if stderr.is_empty() { stdout } else { stderr })
            }
        }
        Err(e) => Err(format!("Failed to execute process: {}", e)),
    }
}

#[tauri::command]
fn save_config(key: String, model: String) -> Result<(), String> {
    let config = Config {
        api_key: key,
        ai_model: model,
    };
    let path = get_config_path();
    let json = serde_json::to_string(&config).map_err(|e| e.to_string())?;
    let mut file = File::create(path).map_err(|e| e.to_string())?;
    file.write_all(json.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_config() -> Result<Vec<String>, String> {
    let path = get_config_path();
    if !path.exists() {
        return Ok(vec!["".to_string(), "gemini-1.5-flash".to_string()]);
    }
    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let mut contents = String::new();
    file.read_to_string(&mut contents).map_err(|e| e.to_string())?;
    let config: Config = serde_json::from_str(&contents).map_err(|e| e.to_string())?;
    Ok(vec![config.api_key, config.ai_model])
}

#[tauri::command]
fn select_folder() -> Option<String> {
    if let Some(path) = rfd::FileDialog::new().pick_folder() {
        Some(path.to_string_lossy().into_owned())
    } else {
        None
    }
}

#[tauri::command]
fn select_file_open() -> Option<Vec<String>> {
    if let Some(paths) = rfd::FileDialog::new().pick_files() {
        Some(paths.into_iter().map(|p| p.to_string_lossy().into_owned()).collect())
    } else {
        None
    }
}

#[tauri::command]
fn select_file_save(default_name: Option<String>) -> Option<String> {
    let mut dialog = rfd::FileDialog::new();
    if let Some(ref name) = default_name {
        dialog = dialog.set_file_name(name);
    }
    if let Some(path) = dialog.save_file() {
        Some(path.to_string_lossy().into_owned())
    } else {
        None
    }
}

#[tauri::command]
fn read_file_native(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file_native(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_project_native(path: String, project_name: String, project_type: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    
    if project_type == "rust" {
        let cargo_toml = format!(
            "[package]\nname = \"{}\"\nversion = \"0.1.0\"\nedition = \"2021\"\n\n[dependencies]\n",
            project_name
        );
        std::fs::write(std::path::Path::new(&path).join("Cargo.toml"), cargo_toml).map_err(|e| e.to_string())?;
        
        let src_dir = std::path::Path::new(&path).join("src");
        std::fs::create_dir_all(&src_dir).map_err(|e| e.to_string())?;
        std::fs::write(src_dir.join("main.rs"), "fn main() {\n    println!(\"Hello, World!\");\n}").map_err(|e| e.to_string())?;
    } else if project_type == "nodejs" {
        let package_json = format!(
            "{{\n  \"name\": \"{}\",\n  \"version\": \"1.0.0\",\n  \"main\": \"index.js\",\n  \"scripts\": {{\n    \"dev\": \"node index.js\"\n  }}\n}}",
            project_name
        );
        std::fs::write(std::path::Path::new(&path).join("package.json"), package_json).map_err(|e| e.to_string())?;
        std::fs::write(std::path::Path::new(&path).join("index.js"), "console.log(\"Hello from Node.js!\");").map_err(|e| e.to_string())?;
    } else {
        std::fs::write(std::path::Path::new(&path).join("README.md"), format!("# {}\n\nCreated with Antigravity IDE.", project_name)).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            execute_command,
            save_config,
            load_config,
            select_folder,
            select_file_open,
            select_file_save,
            read_file_native,
            write_file_native,
            create_project_native
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri v2 application");
}
