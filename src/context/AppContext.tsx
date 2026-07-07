import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Tauri API safe invocation helper
export const safeInvoke = async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T | null> => {
  try {
    if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<T>(cmd, args);
    }
  } catch (error) {
    console.warn(`Tauri IPC failed for command '${cmd}':`, error);
  }
  return null;
};

export interface MockFile {
  name: string;
  path: string;
  content: string;
  language: string;
}

export type UIMode = "ide" | "settings";

export interface AppContextType {
  uiMode: UIMode;
  setUiMode: (mode: UIMode) => void;
  currentPrompt: string;
  setCurrentPrompt: (prompt: string) => void;
  executionLogs: string[];
  setExecutionLogs: React.Dispatch<React.SetStateAction<string[]>>;
  clearLogs: () => void;
  addLog: (log: string) => void;
  activeFiles: MockFile[];
  setActiveFiles: (files: MockFile[]) => void;
  selectedFileName: string;
  setSelectedFileName: (name: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Terminal Command Executor
  executeTerminalCommand: (cmd: string) => Promise<void>;
  terminalCwd: string;
  setTerminalCwd: (cwd: string) => void;

  // Gemini API configuration settings
  apiKey: string;
  setApiKey: (key: string) => void;
  aiModel: string;
  setAiModel: (model: string) => void;
  saveApiConfig: (key: string, model: string) => Promise<boolean>;

  // Project Workspace & Context Synchronization States
  activeWorkspacePath: string;
  setActiveWorkspacePath: (path: string) => void;
  projectType: string;
  runCommand: string;
  installCommand: string;
  pkgManager: string;
  gitStatus: string;
  loadWorkspaceData: (path: string) => Promise<void>;
  saveFileToDisk: (filePath: string, content: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialFiles: MockFile[] = [
  {
    name: "main.rs",
    path: "src-tauri/src/main.rs",
    language: "rust",
    content: `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;

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
        Err(e) => Err(format!("Failed to execute: {}", e)),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![execute_command])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}`
  },
  {
    name: "tauri.conf.json",
    path: "src-tauri/tauri.conf.json",
    language: "json",
    content: `{
  "productName": "Antigravity Dev Environment",
  "version": "0.1.0",
  "identifier": "com.antigravity.ide",
  "bundle": {
    "active": true,
    "targets": "all"
  }
}`
  },
  {
    name: "scraper.js",
    path: "scraper.js",
    language: "javascript",
    content: `// Web scraper utility for developer workspace telemetry
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeMetadata() {
  const res = await axios.get('https://news.ycombinator.com/');
  const $ = cheerio.load(res.data);
  const titles = [];
  $('.titleline > a').each((i, el) => {
    titles.push($(el).text());
  });
  console.log("Scraped titles:", titles.slice(0, 5));
}
scrapeMetadata();`
  }
];

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [uiMode, setUiMode] = useState<UIMode>("ide");
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const [executionLogs, setExecutionLogs] = useState<string[]>([
    "Microsoft Windows [Version 10.0.22631]",
    "(c) Microsoft Corporation. All rights reserved.",
    "",
    "Antigravity Developer Shell environment loaded.",
    "Type 'help' to see list of available simulated workspace commands."
  ]);
  const [activeFiles, setActiveFiles] = useState<MockFile[]>(initialFiles);
  const [selectedFileName, setSelectedFileName] = useState<string>("main.rs");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [terminalCwd, setTerminalCwd] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("antigravity_active_workspace_path") || "C:\\Users\\heman\\OneDrive\\Desktop\\haka baka";
    }
    return "C:\\Users\\heman\\OneDrive\\Desktop\\haka baka";
  });

  // Project Workspace & Context Synchronization States
  const [activeWorkspacePath, setActiveWorkspacePath] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("antigravity_active_workspace_path") || "C:\\Users\\heman\\OneDrive\\Desktop\\haka baka";
    }
    return "C:\\Users\\heman\\OneDrive\\Desktop\\haka baka";
  });

  const [projectType, setProjectType] = useState<string>("unknown");
  const [runCommand, setRunCommand] = useState<string>("npm run dev");
  const [installCommand, setInstallCommand] = useState<string>("npm install");
  const [pkgManager, setPkgManager] = useState<string>("npm");
  const [gitStatus, setGitStatus] = useState<string>("");

  // Gemini API Configuration States
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("antigravity_gemini_api_key") || "";
    }
    return "";
  });
  
  const [aiModel, setAiModel] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("antigravity_gemini_ai_model") || "gemini-1.5-flash";
    }
    return "gemini-1.5-flash";
  });

  // Load configuration from Tauri native storage on mount
  useEffect(() => {
    const loadNativeConfig = async () => {
      const res = await safeInvoke<string[]>("load_config");
      if (res && res.length >= 2) {
        if (res[0]) setApiKey(res[0]);
        if (res[1]) setAiModel(res[1]);
        addLog(`[SYSTEM] Loaded API credentials from native config file.`);
      }
    };
    loadNativeConfig();
  }, []);

  // Sync API configurations to local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("antigravity_gemini_api_key", apiKey);
    }
  }, [apiKey]);

  const loadWorkspaceData = async (path: string) => {
    setIsLoading(true);
    try {
      addLog(`[SYSTEM] Workspace Changed event fired: ${path}`);
      setTerminalCwd(path);
      localStorage.setItem("antigravity_active_workspace_path", path);
      setActiveWorkspacePath(path);

      // 1. Fetch files recursively from backend
      const filesRes = await fetch(`http://localhost:1422/api/project/files?path=${encodeURIComponent(path)}`);
      if (filesRes.ok) {
        const data = await filesRes.json();
        if (data.files && data.files.length > 0) {
          setActiveFiles(data.files);
          // Auto-select preferred file if present, else first file
          const preferred = data.files.find((f: any) => 
            f.name === "main.rs" || 
            f.name === "package.json" || 
            f.name === "index.html" || 
            f.name === "main.py" || 
            f.name === "app.py"
          ) || data.files[0];
          setSelectedFileName(preferred.name);
        } else {
          setActiveFiles([]);
          setSelectedFileName("");
        }
      } else {
        addLog(`[WARNING] Failed to load workspace files from disk.`);
      }

      // 2. Fetch project runtime detection
      const detectRes = await fetch(`http://localhost:1422/api/project/detect?path=${encodeURIComponent(path)}`);
      if (detectRes.ok) {
        const detectData = await detectRes.json();
        setProjectType(detectData.type);
        setRunCommand(detectData.runCmd);
        setInstallCommand(detectData.installCmd);
        setPkgManager(detectData.pkgManager);
        addLog(`[SYSTEM] Project Runtime: ${detectData.type.toUpperCase()} (Commands: Run='${detectData.runCmd}', Install='${detectData.installCmd}')`);
      }

      // 3. Fetch Git status metadata
      const gitRes = await fetch(`http://localhost:1422/api/project/git?path=${encodeURIComponent(path)}`);
      if (gitRes.ok) {
        const gitData = await gitRes.json();
        if (gitData.initialized) {
          setGitStatus(`Branch: ${gitData.branch}\nStatus:\n${gitData.status}`);
          addLog(`[SYSTEM] Git Status: Active branch '${gitData.branch}'`);
        } else {
          setGitStatus("Not a Git repository");
        }
      }

      // 4. Fire WorkspaceChanged event
      if (typeof window !== "undefined") {
        const event = new CustomEvent("WorkspaceChanged", { detail: { path } });
        window.dispatchEvent(event);
      }
    } catch (e: any) {
      addLog(`[ERROR] Failed to load workspace data: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFileToDisk = async (filePath: string, content: string) => {
    try {
      const fullPath = activeWorkspacePath.includes("/") 
        ? `${activeWorkspacePath}/${filePath}`
        : `${activeWorkspacePath}\\${filePath}`;
        
      const res = await fetch("http://localhost:1422/api/file/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: fullPath, content })
      });
      if (res.ok) {
        addLog(`[FILE] Saved file to disk: ${filePath}`);
        return true;
      }
    } catch (e: any) {
      addLog(`[ERROR] Failed to save file ${filePath}: ${e.message}`);
    }
    return false;
  };

  // Load workspace data on mount
  useEffect(() => {
    loadWorkspaceData(activeWorkspacePath);
  }, []);

  const saveApiConfig = async (key: string, model: string): Promise<boolean> => {
    setApiKey(key);
    setAiModel(model);
    
    if (typeof window !== "undefined") {
      localStorage.setItem("antigravity_gemini_api_key", key);
      localStorage.setItem("antigravity_gemini_ai_model", model);
    }
    
    // Call Rust to save to disk if running inside Tauri
    if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
      const res = await safeInvoke<any>("save_config", { key, model });
      return res !== null;
    }
    
    return true;
  };

  const clearLogs = () => {
    setExecutionLogs([]);
  };

  const addLog = (log: string) => {
    setExecutionLogs(prev => [...prev, log]);
  };

  const executeTerminalCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setIsLoading(true);
    
    // Add command echo to the logs
    addLog(`PS ${terminalCwd}> ${cmd}`);

    // Parse cd commands to update terminalCwd in JS
    if (trimmed.toLowerCase().startsWith("cd ")) {
      const targetDir = trimmed.slice(3).trim();
      if (targetDir === "..") {
        const parts = terminalCwd.split(/[\\/]/);
        if (parts.length > 1) {
          parts.pop();
          const newCwd = parts.join("\\") || "C:";
          setTerminalCwd(newCwd);
        }
      } else if (targetDir) {
        const separator = terminalCwd.includes("/") ? "/" : "\\";
        const newCwd = `${terminalCwd}${separator}${targetDir}`;
        setTerminalCwd(newCwd);
      }
      setIsLoading(false);
      return;
    }

    // Prepare prepended command to run in correct native directory
    let prependedCmd = trimmed;
    if (terminalCwd) {
      const isWindows = typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("win");
      if (isWindows) {
        prependedCmd = `Set-Location -Path '${terminalCwd.replace(/'/g, "''")}'; ${trimmed}`;
      } else {
        prependedCmd = `cd '${terminalCwd.replace(/'/g, "'\\''")}' && ${trimmed}`;
      }
    }

    // Call the Tauri backend command
    const nativeResult = await safeInvoke<{ stdout?: string; stderr?: string; error?: string } | string | null>("execute_command", { cmd: prependedCmd });

    if (nativeResult !== null) {
      // Process native Rust result
      if (typeof nativeResult === "string") {
        addLog(nativeResult);
      } else {
        if (nativeResult.stdout) addLog(nativeResult.stdout);
        if (nativeResult.stderr) addLog(nativeResult.stderr);
        if (nativeResult.error) addLog(`[ERROR] ${nativeResult.error}`);
      }
    } else {
      // Browser Mock Fallback Simulation
      const lower = trimmed.toLowerCase();
      
      // Delay to simulate shell execution latency
      await new Promise(resolve => setTimeout(resolve, 200));

      if (lower === "help") {
        addLog("Available commands:");
        addLog("  ls              List files and folders in the active project directory");
        addLog("  cat [filename]  Display the contents of a file in the workspace");
        addLog("  clear           Clear the terminal logs screen");
        addLog("  sysinfo         Show simulated OS and hardware telemetry diagnostics");
        addLog("  node -v         Show Node.js version information");
        addLog("  cargo -v        Show Cargo package manager version information");
        addLog("  help            Display this command helper guide");
      } else if (lower === "ls") {
        addLog(`    Directory: ${terminalCwd}`);
        addLog("");
        addLog("Mode                 LastWriteTime         Length Name");
        addLog("----                 -------------         ------ ----");
        activeFiles.forEach(file => {
          const dateStr = new Date().toLocaleDateString();
          const sizeStr = file.content.length.toString().padStart(8);
          addLog(`-a---          ${dateStr}  10:32 AM     ${sizeStr} ${file.path}`);
        });
      } else if (lower.startsWith("cat ")) {
        const fileName = trimmed.slice(4).trim();
        const file = activeFiles.find(f => f.name.toLowerCase() === fileName.toLowerCase());
        
        if (file) {
          addLog(file.content);
        } else {
          addLog(`cat: ${fileName}: No such file in active workspace context.`);
        }
      } else if (lower === "clear") {
        clearLogs();
      } else if (lower === "sysinfo") {
        addLog("[SYSINFO] Operating System: Web Browser Sandbox Fallback");
        addLog("[SYSINFO] Architecture: WebAssembly / Virtual Core");
        addLog("[SYSINFO] CPU Cores: 8 (Virtual Threads)");
        addLog("[SYSINFO] Memory Allocated: 16.00 GB (Simulated)");
        addLog("[SYSINFO] Tauri Mode: Inactive (running inside web page)");
      } else if (lower === "node -v") {
        addLog("v21.6.1");
      } else if (lower === "cargo -v") {
        addLog("cargo 1.76.0 (c84f36e 2026-02-04)");
      } else {
        addLog(`'${trimmed}' is not recognized as an internal or external command,`);
        addLog("operable program or batch file.");
        addLog("  [SANDBOX WARNING]: Native shell execution is disabled in the web browser.");
        addLog("  Build and run the project via Tauri to execute native commands on the host.");
      }
    }
    
    setIsLoading(false);
  };

  return (
    <AppContext.Provider
      value={{
        uiMode,
        setUiMode,
        currentPrompt,
        setCurrentPrompt,
        executionLogs,
        setExecutionLogs,
        clearLogs,
        addLog,
        activeFiles,
        setActiveFiles,
        selectedFileName,
        setSelectedFileName,
        isLoading,
        setIsLoading,
        executeTerminalCommand,
        terminalCwd,
        setTerminalCwd,
        apiKey,
        setApiKey,
        aiModel,
        setAiModel,
        saveApiConfig,
        activeWorkspacePath,
        setActiveWorkspacePath,
        projectType,
        runCommand,
        installCommand,
        pkgManager,
        gitStatus,
        loadWorkspaceData,
        saveFileToDisk
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
