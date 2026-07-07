import React, { useState, useRef, useEffect } from "react";
import { 
  Folder, FileCode, Terminal as TerminalIcon, 
  ChevronRight, ChevronDown, 
  Sparkles, Send, X, Minimize2, Square, RefreshCw,
  Plus, Info, FilePlus, Save, RotateCcw, 
  Edit3, Trash2, FileText, Play, Cpu, Settings, Check, Key,
  FolderOpen, Share2, ExternalLink, LogOut, Copy
} from "lucide-react";
import { useApp, safeInvoke } from "../../context/AppContext";
import { useWorkspace } from "../../context/WorkspaceManager";
import { XtermTerminal } from "./XtermTerminal";
import Editor from "@monaco-editor/react";

// Type definition extension to allow directory selection properties in JSX inputs
declare module "react" {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

import { MockFile } from "../../context/AppContext";

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: { [key: string]: TreeNode };
  file?: MockFile;
}

interface MessageSegment {
  type: "text" | "code";
  content: string;
  language?: string;
}

export const DeveloperWorkspace: React.FC = () => {
  const {
    executionLogs,
    clearLogs,
    executeTerminalCommand,
    terminalCwd,
    setTerminalCwd,
    isLoading,
    apiKey,
    aiModel,
    saveApiConfig
  } = useApp();

  const {
    activeWorkspacePath,
    currentProject: workspaceName,
    activeFileName: selectedFileName,
    openedTabs: activeFiles,
    projectType,
    runCommand,
    installCommand,
    pkgManager,
    gitStatus,
    loadWorkspaceData,
    saveFileToDisk,
    setActiveFileName: setSelectedFileName,
    setOpenedTabs: setActiveFiles,
  } = useWorkspace();

  // Local settings buffers
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [tempAiModel, setTempAiModel] = useState(aiModel);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  // Keep local buffers synced with state when natively loaded
  useEffect(() => {
    setTempApiKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    setTempAiModel(aiModel);
  }, [aiModel]);

  const handleSaveApiSettings = async () => {
    setSaveStatus("saving");
    const success = await saveApiConfig(tempApiKey, tempAiModel);
    if (success) {
      setSaveStatus("success");
      executeTerminalCommand(`echo [SYSTEM] Gemini API configurations saved to native file.`);
      setTimeout(() => setSaveStatus("idle"), 2500);
    } else {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2500);
    }
  };

  // Native PTY Terminal tabs state with automatic localstorage persistence
  const [terminalTabs, setTerminalTabs] = useState<Array<{
    id: string;
    name: string;
    cwd: string;
    sessionId: string;
  }>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("antigravity_terminal_tabs");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [
      {
        id: "term-1",
        name: "terminal 1",
        cwd: "C:\\Users\\heman\\OneDrive\\Desktop\\haka baka",
        sessionId: `session-term-1`
      }
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("antigravity_active_terminal_tab") || "term-1";
    }
    return "term-1";
  });

  // Sync tabs and active tab to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("antigravity_terminal_tabs", JSON.stringify(terminalTabs));
    }
  }, [terminalTabs]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("antigravity_active_terminal_tab", activeTabId);
    }
  }, [activeTabId]);

  // Sync terminal sessions and reset on workspace changes
  useEffect(() => {
    if (!activeWorkspacePath) return;

    // Check if the tabs are already set to this path to avoid infinite loops
    if (terminalTabs.length === 1 && terminalTabs[0].cwd === activeWorkspacePath) {
      return;
    }

    const newId = `term-${Date.now()}`;
    const newTab = {
      id: newId,
      name: `terminal 1`,
      cwd: activeWorkspacePath,
      sessionId: `session-${newId}`
    };

    setTerminalTabs([newTab]);
    setActiveTabId(newId);
    executeTerminalCommand(`echo [SYSTEM] Connected new integrated terminal inside: ${activeWorkspacePath}`);
  }, [activeWorkspacePath]);

  // Spawn a new native PTY terminal tab in the active project path
  const addTerminalTab = () => {
    const nextNum = terminalTabs.length > 0 
      ? Math.max(...terminalTabs.map(t => parseInt(t.name.split(" ")[1] || "0", 10))) + 1 
      : 1;
    const newId = `term-${Date.now()}`;
    const newTab = {
      id: newId,
      name: `terminal ${nextNum}`,
      cwd: terminalCwd || "C:\\Users\\heman\\OneDrive\\Desktop\\haka baka",
      sessionId: `session-${newId}`
    };
    setTerminalTabs([...terminalTabs, newTab]);
    setActiveTabId(newId);
  };

  // Close a terminal tab and re-route active tab selection
  const closeTerminalTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (terminalTabs.length <= 1) return;

    const filtered = terminalTabs.filter(t => t.id !== tabId);
    setTerminalTabs(filtered);

    if (activeTabId === tabId) {
      setActiveTabId(filtered[filtered.length - 1].id);
    }
  };

  // Layout Resizing Widths & Heights
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [aiWidth, setAiWidth] = useState(320);
  const [terminalHeight, setTerminalHeight] = useState(220);

  const startResizeSidebar = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const doDrag = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(160, Math.min(480, startWidth + (moveEvent.clientX - startX)));
      setSidebarWidth(newWidth);
    };

    const stopDrag = () => {
      document.removeEventListener("mousemove", doDrag);
      document.removeEventListener("mouseup", stopDrag);
    };

    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);
  };

  const startResizeAi = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = aiWidth;

    const doDrag = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(200, Math.min(600, startWidth - (moveEvent.clientX - startX)));
      setAiWidth(newWidth);
    };

    const stopDrag = () => {
      document.removeEventListener("mousemove", doDrag);
      document.removeEventListener("mouseup", stopDrag);
    };

    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);
  };

  const startResizeTerminal = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = terminalHeight;

    const doDrag = (moveEvent: MouseEvent) => {
      const newHeight = Math.max(100, Math.min(450, startHeight - (moveEvent.clientY - startY)));
      setTerminalHeight(newHeight);
    };

    const stopDrag = () => {
      document.removeEventListener("mousemove", doDrag);
      document.removeEventListener("mouseup", stopDrag);
    };

    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);
  };

  // Run / Preview project execution states
  const [isRunning, setIsRunning] = useState(false);
  const [previewPort, setPreviewPort] = useState(1420);
  const [previewUrlVersion, setPreviewUrlVersion] = useState(0);

  const projectFolder = terminalCwd.split(/[\\/]/).pop() || "default";
  const projectId = projectFolder.toLowerCase().replace(/[^a-z0-9_-]/g, "");

  const handleRunProject = async () => {
    const command = runCommand || "echo [RUN] Project loaded successfully.";
    
    if (projectType === "nodejs") {
      setPreviewPort(1420);
    } else if (projectType === "python") {
      setPreviewPort(5000);
    } else if (projectType === "php") {
      setPreviewPort(8000);
    }

    const activeTab = terminalTabs.find(t => t.id === activeTabId) || terminalTabs[0];
    if (!activeTab) return;

    setIsRunning(true);
    executeTerminalCommand(`echo [SYSTEM] Spawning runner task: '${command}'`);

    // Write command to PTY
    await fetch("http://localhost:1422/api/exec-pty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: activeTab.sessionId,
        command: command
      })
    });
  };

  const handleStopProject = async () => {
    const activeTab = terminalTabs.find(t => t.id === activeTabId) || terminalTabs[0];
    if (!activeTab) return;

    setIsRunning(false);
    executeTerminalCommand("echo [SYSTEM] Stopping active runner (sending SIGINT).");

    // Write Ctrl+C (\x03) to PTY
    await fetch("http://localhost:1422/api/exec-pty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: activeTab.sessionId,
        command: "\x03"
      })
    });
  };

  // Sidebar navigation tree state
  const [explorerOpen, setExplorerOpen] = useState(true);

  // Layout View States
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [terminalVisible, setTerminalVisible] = useState(true);
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");

  // Dropdown States
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Modal overlays
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileLang, setNewFileLang] = useState("typescript");
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showOpenWorkspaceModal, setShowOpenWorkspaceModal] = useState(false);
  const [enteredWorkspacePath, setEnteredWorkspacePath] = useState("");

  // AI Assistant panel settings toggler
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  // Selected file reference
  const currentFile = activeFiles.find(f => f.name === selectedFileName) || activeFiles[0];

  // Terminal input & command history states
  const [terminalInput, setTerminalInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Expanded file management states
  const [autoSave, setAutoSave] = useState(false);
  const [recentFiles, setRecentFiles] = useState<string[]>(["main.rs", "tauri.conf.json", "scraper.js"]);
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // AI chat messaging simulation/state
  const [chatMessages, setChatMessages] = useState<Array<{
    sender: "agent" | "user";
    text: string;
    timestamp: string;
  }>>([
    {
      sender: "agent",
      text: "Hello! I am your Antigravity AI coding assistant. You can configure your Google Gemini API Key in the settings (click the ⚙️ icon above) to get live AI answers. Otherwise, I will run in simulation mode.\n\nTry asking me to write some code, and you can inject it directly into the editor!",
      timestamp: "11:05:00"
    }
  ]);
  
  const [chatInput, setChatInput] = useState("");

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (activeDropdown && !(e.target as HTMLElement).closest(".nav-menu-container")) {
        setActiveDropdown(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [activeDropdown]);

  // Auto-scroll terminal logs to bottom on new outputs
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [executionLogs, isLoading]);

  // Save file content natively using Tauri command fallback
  const saveFileContentNatively = async (filePath: string, content: string, silent: boolean = false) => {
    try {
      const base64Content = btoa(unescape(encodeURIComponent(content)));
      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        const isWindows = navigator.userAgent.toLowerCase().includes("win");
        let cmd = "";
        if (isWindows) {
          cmd = `[System.IO.File]::WriteAllBytes('${filePath.replace(/\\/g, '\\\\')}', [System.Convert]::FromBase64String('${base64Content}'))`;
        } else {
          cmd = `echo '${base64Content}' | base64 --decode > '${filePath}'`;
        }
        await executeTerminalCommand(cmd);
        if (!silent) {
          executeTerminalCommand(`echo [FILE] SUCCESS: Saved ${filePath} natively to host filesystem.`);
        }
      } else {
        if (!silent) {
          executeTerminalCommand(`echo [SAVE] (Sandbox Mode) Saved ${filePath} to virtual workspace.`);
        }
      }
    } catch (err: any) {
      console.error("Native save failed:", err);
      if (!silent) {
        executeTerminalCommand(`echo [SAVE] ERROR: Failed to save file natively: ${err.message}`);
      }
    }
  };

  // Local File Input Loader Change Handler
  const handleFileOpenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const fileLang = 
        file.name.endsWith(".rs") ? "rust" :
        file.name.endsWith(".js") || file.name.endsWith(".jsx") ? "javascript" :
        file.name.endsWith(".json") ? "json" :
        file.name.endsWith(".ts") || file.name.endsWith(".tsx") ? "typescript" :
        file.name.endsWith(".css") ? "css" :
        file.name.endsWith(".html") ? "html" :
        "plaintext";

      const existingIdx = activeFiles.findIndex(f => f.name.toLowerCase() === file.name.toLowerCase());
      if (existingIdx !== -1) {
        const updated = activeFiles.map((f, i) => i === existingIdx ? { ...f, content } : f);
        setActiveFiles(updated);
      } else {
        const newFileObj = {
          name: file.name,
          path: file.name,
          language: fileLang,
          content: content
        };
        setActiveFiles([...activeFiles, newFileObj]);
      }
      setSelectedFileName(file.name);
      
      if (!recentFiles.includes(file.name)) {
        setRecentFiles(prev => [file.name, ...prev.slice(0, 5)]);
      }

      executeTerminalCommand(`echo [FILE] Opened and loaded local file: ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Local Directory/Folder Open Input Loader Change Handler
  const handleFolderOpenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    
    // Filter out binary or unreadable files (keep standard web/code assets)
    const textFiles = fileList.filter(file => 
      /\.(rs|js|jsx|ts|tsx|json|css|html|txt|md|toml)$/i.test(file.name)
    );

    if (textFiles.length === 0) {
      executeTerminalCommand(`echo [WORKSPACE] Opened folder contains no readable code/text files.`);
      alert("No readable text files found in the chosen folder.");
      return;
    }

    const rootName = fileList[0].webkitRelativePath.split("/")[0] || "Workspace Project";
    const newPath = rootName.toLowerCase() === "haka baka" 
      ? "C:\\Users\\heman\\OneDrive\\Desktop\\haka baka" 
      : `C:\\Users\\heman\\OneDrive\\Desktop\\haka baka\\${rootName}`;
    
    loadWorkspaceData(newPath);
    setTerminalCwd(newPath);

    const filesToRead = textFiles.slice(0, 25);
    const filesWithContent: any[] = [];
    let readCount = 0;

    executeTerminalCommand(`echo [WORKSPACE] Reading ${filesToRead.length} files from folder: '${rootName}'`);

    filesToRead.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const relativePath = file.webkitRelativePath || file.name;
        const fileLang = 
          file.name.endsWith(".rs") ? "rust" :
          file.name.endsWith(".js") || file.name.endsWith(".jsx") ? "javascript" :
          file.name.endsWith(".json") ? "json" :
          file.name.endsWith(".ts") || file.name.endsWith(".tsx") ? "typescript" :
          file.name.endsWith(".css") ? "css" :
          file.name.endsWith(".html") ? "html" :
          "plaintext";

        filesWithContent.push({
          name: file.name,
          path: relativePath,
          language: fileLang,
          content: content
        });

        readCount++;
        if (readCount === filesToRead.length) {
          filesWithContent.sort((a, b) => a.path.localeCompare(b.path));
          setActiveFiles(filesWithContent);
          const mainFile = filesWithContent.find(f => 
            f.name.toLowerCase() === "main.rs" || 
            f.name.toLowerCase() === "package.json" ||
            f.name.toLowerCase() === "index.html" ||
            f.name.toLowerCase() === "app.tsx"
          ) || filesWithContent[0];
          
          setSelectedFileName(mainFile.name);
          executeTerminalCommand(`echo [WORKSPACE] SUCCESS: Loaded folder '${rootName}' with ${filesWithContent.length} active files.`);
        }
      };
      reader.onerror = () => {
        readCount++;
        if (readCount === filesToRead.length && filesWithContent.length > 0) {
          setActiveFiles(filesWithContent);
          setSelectedFileName(filesWithContent[0].name);
        }
      };
      reader.readAsText(file);
    });

    e.target.value = "";
  };

  // Toggle folder expansion
  const togglePath = (path: string) => {
    setExpandedPaths(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Parse activeFiles list into a hierarchical tree
  const buildFileTree = (files: MockFile[]): TreeNode => {
    const root: TreeNode = {
      name: "root",
      path: "",
      isFolder: true,
      children: {}
    };

    files.forEach(file => {
      const segments = file.path.replace(/\\/g, '/').split('/');
      let current = root;

      segments.forEach((segment, idx) => {
        const isLast = idx === segments.length - 1;
        const pathSoFar = segments.slice(0, idx + 1).join('/');

        if (!current.children[segment]) {
          current.children[segment] = {
            name: segment,
            path: pathSoFar,
            isFolder: !isLast,
            children: {}
          };
        }

        if (isLast) {
          current.children[segment].file = file;
        }

        current = current.children[segment];
      });
    });

    return root;
  };

  // Recursive JSX tree renderer
  const renderTreeNodes = (node: TreeNode, depth: number = 0) => {
    const sortedKeys = Object.keys(node.children).sort((a, b) => {
      const nodeA = node.children[a];
      const nodeB = node.children[b];
      if (nodeA.isFolder && !nodeB.isFolder) return -1;
      if (!nodeA.isFolder && nodeB.isFolder) return 1;
      return a.localeCompare(b);
    });

    return sortedKeys.map(key => {
      const child = node.children[key];
      const indent = depth * 12;
      const isExpanded = expandedPaths[child.path] !== false;

      if (child.isFolder) {
        return (
          <div key={child.path} className="select-none">
            <div
              className={`flex items-center py-1 px-1 rounded cursor-pointer transition-colors ${
                themeMode === "dark" ? "hover:bg-cyber-border/40 text-gray-300" : "hover:bg-gray-150 text-gray-700"
              }`}
              style={{ paddingLeft: `${indent + 4}px` }}
              onClick={() => togglePath(child.path)}
            >
              <span className="text-gray-500 mr-1">
                {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </span>
              <Folder size={11} className="text-indigo-400 mr-1.5 shrink-0" />
              <span className="font-semibold truncate">{child.name}</span>
            </div>
            {isExpanded && (
              <div className="space-y-0.5">
                {renderTreeNodes(child, depth + 1)}
              </div>
            )}
          </div>
        );
      } else {
        const isSelected = selectedFileName === child.name;
        const isRust = child.name.endsWith(".rs");
        const isJson = child.name.endsWith(".json");
        const isJs = child.name.endsWith(".js") || child.name.endsWith(".jsx");
        const isCss = child.name.endsWith(".css");
        const isHtml = child.name.endsWith(".html");
        
        let iconColor = "text-indigo-400";
        if (isRust) iconColor = "text-orange-400";
        else if (isJson) iconColor = "text-yellow-500";
        else if (isJs) iconColor = "text-yellow-400";
        else if (isCss) iconColor = "text-blue-400";
        else if (isHtml) iconColor = "text-red-400";

        return (
          <div
            key={child.path}
            className={`flex items-center py-1 px-2 rounded cursor-pointer transition-all ${
              isSelected 
                ? (themeMode === "dark" ? "bg-indigo-600/30 text-indigo-300 font-bold border-l-2 border-indigo-500" : "bg-indigo-50 text-indigo-600 font-bold border-l-2 border-indigo-500") 
                : (themeMode === "dark" ? "text-gray-400 hover:bg-cyber-border/20 hover:text-gray-200" : "text-gray-600 hover:bg-gray-150 hover:text-black")
            }`}
            style={{ paddingLeft: `${indent + 16}px` }}
            onClick={() => {
              if (child.file) {
                setSelectedFileName(child.file.name);
              }
            }}
          >
            <FileCode size={11} className={`mr-2 shrink-0 ${iconColor}`} />
            <span className="truncate">{child.name}</span>
          </div>
        );
      }
    });
  };

  // Auto-Save Mechanism
  useEffect(() => {
    if (!autoSave || !currentFile) return;

    const timer = setTimeout(async () => {
      executeTerminalCommand(`echo [AUTO-SAVE] Automatically saved change state for: ${currentFile.name}`);
      await saveFileContentNatively(currentFile.path || currentFile.name, currentFile.content, true);
      await saveFileToDisk(currentFile.path || currentFile.name, currentFile.content);
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentFile?.content, autoSave]);

  // Global Ctrl+S Keyboard Shortcut for Instant Disk Save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveFile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentFile]);

  // Helper parser: Splits raw AI markdown into code chunks and plain text chunks
  const parseMessageSegments = (text: string): MessageSegment[] => {
    const parts = text.split("```");
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // Code Block
        const lines = part.split("\n");
        const language = lines[0].trim().toLowerCase() || "code";
        const content = lines.slice(1).join("\n").trimEnd();
        return { type: "code", content, language };
      } else {
        // Plain Text
        return { type: "text", content: part };
      }
    });
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userPrompt = chatInput.trim();
    const timestampStr = new Date().toTimeString().split(' ')[0].slice(0, 5);

    const userMsg = {
      sender: "user" as const,
      text: userPrompt,
      timestamp: timestampStr
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    if (apiKey.trim()) {
      // LIVE GOOGLE GEMINI CALL
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: userPrompt }]
              }
            ],
            systemInstruction: {
              parts: [{ 
                text: `You are Antigravity, a professional AI coding assistant embedded directly inside a developer IDE workspace. 
The active workspace path is '${activeWorkspacePath}'.
Scanned project type: ${projectType.toUpperCase()} (Package manager: ${pkgManager}).
Git Repository Status: ${gitStatus || "Not initialized"}.
Project runtime scripts: Run='${runCommand}', Install='${installCommand}'.

Here is the structure/list of files in this project workspace:
${activeFiles.map(f => `- ${f.path} (language: ${f.language})`).join('\n')}

The user is currently editing the file named '${selectedFileName}' (language: ${currentFile?.language || "plaintext"}). 
You must answer queries using ONLY files and configurations present in the currently opened project.
Help the user code, debug, or refactor. Keep explanations concise. 
If you output code, you MUST enclose the full correct file code block within standard triple-backtick markdown blocks so the user can apply it directly to the editor (e.g. \`\`\`rust\n// code here\n\`\`\`).` 
              }]
            }
          })
        });

        const data = await response.json();
        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const aiReply = data.candidates[0].content.parts[0].text;
          setChatMessages(prev => [...prev, {
            sender: "agent",
            text: aiReply,
            timestamp: new Date().toTimeString().split(' ')[0].slice(0, 5)
          }]);
        } else {
          const errMsg = data.error?.message || "Invalid response format from Gemini API.";
          setChatMessages(prev => [...prev, {
            sender: "agent",
            text: `[GEMINI ERROR] Failed to fetch reply: ${errMsg}\n\nPlease verify your API key and network connection.`,
            timestamp: new Date().toTimeString().split(' ')[0].slice(0, 5)
          }]);
        }
      } catch (err: any) {
        setChatMessages(prev => [...prev, {
          sender: "agent",
          text: `[NETWORK ERROR] Could not connect to Gemini endpoint: ${err.message}`,
          timestamp: new Date().toTimeString().split(' ')[0].slice(0, 5)
        }]);
      }
    } else {
      // MOCK FALLBACK MODE
      setTimeout(() => {
        let mockReply = "";
        if (userPrompt.toLowerCase().includes("code") || userPrompt.toLowerCase().includes("function") || userPrompt.toLowerCase().includes("write")) {
          mockReply = `Here is a simulated code snippet. Paste your Gemini API Key in the settings panel above to receive real AI generations.

\`\`\`${currentFile.language}
// Automated helper function to diagnostic host
function checkWorkspaceStatus() {
  const fileCount = ${activeFiles.length};
  console.log("Analyzing workspace files...", fileCount);
  return {
    status: "operational",
    editorFile: "${selectedFileName}",
    timestamp: new Date().toISOString()
  };
}
\`\`\``;
        } else {
          mockReply = `I am running in simulation mode because your Gemini API Key is missing. 

To run live AI requests:
1. Click the gear icon (⚙️) in the header of this panel.
2. Paste your Gemini API Key (get one free from Google AI Studio).
3. Choose your model, and resubmit your prompt!

Current file open: **${selectedFileName}**`;
        }

        setChatMessages(prev => [...prev, {
          sender: "agent",
          text: mockReply,
          timestamp: new Date().toTimeString().split(' ')[0].slice(0, 5)
        }]);
      }, 700);
    }

    setChatLoading(false);
  };

  const handleApplyCode = (code: string) => {
    const updated = activeFiles.map(f => f.name === selectedFileName ? { ...f, content: code } : f);
    setActiveFiles(updated);
    executeTerminalCommand(`echo [AI] Injected code segment replacement into editor file: ${selectedFileName}`);
  };

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const command = terminalInput.trim();
    if (!command) return;

    // Execute command
    await executeTerminalCommand(command);

    // Save history
    const updatedHistory = [...commandHistory, command];
    setCommandHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length);
    setTerminalInput("");
  };

  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      
      const newIdx = historyIndex <= 0 ? 0 : historyIndex - 1;
      setHistoryIndex(newIdx);
      setTerminalInput(commandHistory[newIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      
      const newIdx = historyIndex >= commandHistory.length - 1 ? commandHistory.length : historyIndex + 1;
      setHistoryIndex(newIdx);
      if (newIdx === commandHistory.length) {
        setTerminalInput("");
      } else {
        setTerminalInput(commandHistory[newIdx]);
      }
    }
  };

  const handleTerminalClick = () => {
    if (terminalInputRef.current) {
      terminalInputRef.current.focus();
    }
  };

  const handlePresetCommand = (cmd: string) => {
    setTerminalInput(cmd);
    if (terminalInputRef.current) {
      terminalInputRef.current.focus();
    }
  };

  // --- MENU ACTIONS ---

  // File menu
  const handleSaveFile = async () => {
    if (currentFile) {
      await saveFileContentNatively(currentFile.path || currentFile.name, currentFile.content);
      await saveFileToDisk(currentFile.path || currentFile.name, currentFile.content);
    }
    setActiveDropdown(null);
  };

  const handleNewTextFile = () => {
    let num = 1;
    let name = "untitled.txt";
    while (activeFiles.some(f => f.name.toLowerCase() === name.toLowerCase())) {
      name = `untitled-${num}.txt`;
      num++;
    }
    const newFileObj = {
      name,
      path: name,
      language: "plaintext",
      content: ""
    };
    setActiveFiles([...activeFiles, newFileObj]);
    setSelectedFileName(name);
    executeTerminalCommand(`echo [FILE] Created new text file: ${name}`);
    setActiveDropdown(null);
  };

  const handleNewWindow = () => {
    window.open(window.location.origin, "_blank");
    executeTerminalCommand(`echo [WINDOW] Spawned new workspace window.`);
    setActiveDropdown(null);
  };

  const handleNewWindowWithProfile = () => {
    window.open(`${window.location.origin}?profile=default`, "_blank");
    executeTerminalCommand(`echo [WINDOW] Spawned new workspace window with default profile.`);
    setActiveDropdown(null);
  };

  const handleOpenFileTrigger = async () => {
    // 1. Attempt native open file dialog if running inside Tauri
    const selectedPaths = await safeInvoke<string[]>("select_file_open");
    if (selectedPaths && selectedPaths.length > 0) {
      for (const filePath of selectedPaths) {
        const content = await safeInvoke<string>("read_file_native", { path: filePath });
        const fileName = filePath.split(/[\\/]/).pop() || "untitled.txt";
        const fileLang = 
          fileName.endsWith(".rs") ? "rust" :
          fileName.endsWith(".js") || fileName.endsWith(".jsx") ? "javascript" :
          fileName.endsWith(".json") ? "json" :
          fileName.endsWith(".ts") || fileName.endsWith(".tsx") ? "typescript" :
          fileName.endsWith(".css") ? "css" :
          fileName.endsWith(".html") ? "html" :
          fileName.endsWith(".py") ? "python" :
          "plaintext";

        const existingIdx = activeFiles.findIndex(f => f.name.toLowerCase() === fileName.toLowerCase());
        const fileObj = {
          name: fileName,
          path: filePath,
          language: fileLang,
          content: content || ""
        };

        if (existingIdx !== -1) {
          const updated = activeFiles.map((f, i) => i === existingIdx ? fileObj : f);
          setActiveFiles(updated);
        } else {
          setActiveFiles([...activeFiles, fileObj]);
        }
        setSelectedFileName(fileName);
        executeTerminalCommand(`echo [FILE] Opened native file: ${fileName}`);
      }
    } else {
      // 2. Browser fallback click
      fileInputRef.current?.click();
    }
    setActiveDropdown(null);
  };

  const handleNewFileNative = async () => {
    // 1. Open system save file dialog first to create the physical file natively
    const selectedPath = await safeInvoke<string>("select_file_save", { defaultName: "untitled.txt" });
    if (selectedPath) {
      await safeInvoke("write_file_native", { path: selectedPath, content: "" });
      const fileName = selectedPath.split(/[\\/]/).pop() || "untitled.txt";
      
      // Reload workspace files list so it shows up in explorer tree
      await loadWorkspaceData(activeWorkspacePath);
      setSelectedFileName(fileName);
      executeTerminalCommand(`echo [FILE] Created native file: ${fileName}`);
    } else {
      // 2. Browser fallback modal
      setShowNewFileModal(true);
    }
    setActiveDropdown(null);
  };

  const handleNewProjectNative = async () => {
    // 1. Open native folder select dialog
    executeTerminalCommand("echo [SYSTEM] Opening native folder dialog for new project path.");
    const targetPath = await safeInvoke<string>("select_folder");
    
    if (targetPath) {
      const projectName = targetPath.split(/[\\/]/).pop() || "my-new-project";
      const projectTypeChoice = prompt("Select project type (rust / nodejs / generic):", "rust") || "rust";
      
      await safeInvoke("create_project_native", {
        path: targetPath,
        projectName: projectName,
        projectType: projectTypeChoice.toLowerCase().trim()
      });
      
      executeTerminalCommand(`echo [SYSTEM] Created new project '${projectName}' inside '${targetPath}'`);
      loadWorkspaceData(targetPath);
    }
    setActiveDropdown(null);
  };

  const handleOpenFolder = async () => {
    // 1. Attempt native folder selection dialog first if running inside Tauri
    const selectedPath = await safeInvoke<string>("select_folder");
    if (selectedPath) {
      loadWorkspaceData(selectedPath);
    } else {
      // 2. Fall back to manual input modal for browser test fallback
      setEnteredWorkspacePath(activeWorkspacePath);
      setShowOpenWorkspaceModal(true);
    }
    setActiveDropdown(null);
  };



  const handleOpenRecent = () => {
    if (recentFiles.length === 0) {
      alert("No recently opened files.");
      return;
    }
    const filesStr = recentFiles.map((f, i) => `${i + 1}. ${f}`).join("\n");
    const choice = prompt(`Select a file to open:\n${filesStr}`);
    if (choice) {
      const idx = parseInt(choice) - 1;
      if (idx >= 0 && idx < recentFiles.length) {
        const name = recentFiles[idx];
        if (activeFiles.some(f => f.name === name)) {
          setSelectedFileName(name);
        } else {
          const ext = name.split('.').pop() || 'txt';
          const lang = ext === 'rs' ? 'rust' : ext === 'js' ? 'javascript' : ext === 'json' ? 'json' : 'plaintext';
          const newF = { name, path: name, content: `// Loaded from history: ${name}`, language: lang };
          setActiveFiles([...activeFiles, newF]);
          setSelectedFileName(name);
        }
        executeTerminalCommand(`echo [FILE] Reopened recent file: ${name}`);
      }
    }
    setActiveDropdown(null);
  };

  const handleAddFolderToWorkspace = () => {
    executeTerminalCommand(`echo [WORKSPACE] Adding folder to active workspace.`);
    alert("Add Folder to Workspace (Simulated)");
    setActiveDropdown(null);
  };

  const handleSaveWorkspaceAs = () => {
    executeTerminalCommand(`echo [WORKSPACE] Saving workspace configuration.`);
    alert("Save Workspace As (Simulated)");
    setActiveDropdown(null);
  };

  const handleDuplicateWorkspace = () => {
    window.open(window.location.href, "_blank");
    executeTerminalCommand(`echo [WORKSPACE] Duplicated workspace in new window.`);
    setActiveDropdown(null);
  };

  const handleSaveAs = async () => {
    if (!currentFile) return;
    // 1. Attempt native save-as file dialog picker
    const selectedPath = await safeInvoke<string>("select_file_save", { defaultName: currentFile.name });
    if (selectedPath) {
      await safeInvoke("write_file_native", { path: selectedPath, content: currentFile.content });
      const fileName = selectedPath.split(/[\\/]/).pop() || currentFile.name;
      executeTerminalCommand(`echo [FILE] Saved as native file: ${fileName}`);
      
      // Reload workspace path files list so it updates explorer tree
      await loadWorkspaceData(activeWorkspacePath);
      setSelectedFileName(fileName);
    } else {
      // 2. Browser fallback dialog
      const name = prompt("Enter new filename:", selectedFileName);
      if (!name) return;
      const fileLang = 
        name.endsWith(".rs") ? "rust" :
        name.endsWith(".js") ? "javascript" :
        name.endsWith(".json") ? "json" :
        "typescript";
      const newFileObj = {
        name,
        path: name,
        language: fileLang,
        content: currentFile.content
      };
      setActiveFiles([...activeFiles, newFileObj]);
      setSelectedFileName(name);
      executeTerminalCommand(`echo [FILE] Saved as new file: ${name}`);
    }
    setActiveDropdown(null);
  };

  const handleSaveAll = async () => {
    executeTerminalCommand(`echo [FILE] Saving all ${activeFiles.length} active files...`);
    for (const file of activeFiles) {
      await saveFileContentNatively(file.path || file.name, file.content, true);
    }
    executeTerminalCommand(`echo [FILE] SUCCESS: All files saved successfully.`);
    setActiveDropdown(null);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(currentFile.content)
      .then(() => {
        executeTerminalCommand(`echo [SHARE] SUCCESS: Copied file content of ${selectedFileName} to clipboard!`);
        alert(`Copied file content of ${selectedFileName} to clipboard!`);
      })
      .catch(err => {
        executeTerminalCommand(`echo [SHARE] ERROR: Clipboard write failed: ${err.message || err}`);
      });
    setActiveDropdown(null);
  };

  const handlePreferences = () => {
    setShowAiSettings(true);
    executeTerminalCommand(`echo [SETTINGS] Opened settings configuration panel.`);
    setActiveDropdown(null);
  };

  const handleRevertFile = () => {
    const originalContent = 
      selectedFileName === "main.rs" ? `// Restored main file\nfn main() {\n    println!("Antigravity IDE loaded successfully!");\n}` :
      selectedFileName === "tauri.conf.json" ? `{\n  "productName": "Antigravity Dev Environment",\n  "version": "0.1.0"\n}` :
      selectedFileName === "scraper.js" ? `console.log("Telemetry scraper running...");` :
      "";
    
    if (originalContent) {
      const updated = activeFiles.map(f => f.name === selectedFileName ? { ...f, content: originalContent } : f);
      setActiveFiles(updated);
      executeTerminalCommand(`echo [FILE] Reverted ${selectedFileName} to initial version.`);
    } else {
      const updated = activeFiles.map(f => f.name === selectedFileName ? { ...f, content: "" } : f);
      setActiveFiles(updated);
      executeTerminalCommand(`echo [FILE] Cleared newly created file ${selectedFileName}.`);
    }
    setActiveDropdown(null);
  };

  const handleCloseEditor = () => {
    if (activeFiles.length <= 1) {
      alert("Cannot close the last editor tab. Maintain at least one active file.");
      return;
    }
    const closingName = selectedFileName;
    const updated = activeFiles.filter(f => f.name !== closingName);
    setActiveFiles(updated);
    setSelectedFileName(updated[0].name);
    executeTerminalCommand(`echo [FILE] Closed editor tab: ${closingName}`);
    setActiveDropdown(null);
  };

  const handleCloseFolder = () => {
    setActiveFiles([
      {
        name: "untitled.txt",
        path: "untitled.txt",
        language: "plaintext",
        content: "// Folder closed. Working in scratchpad."
      }
    ]);
    setSelectedFileName("untitled.txt");
    executeTerminalCommand(`echo [WORKSPACE] Active folder workspace closed.`);
    setActiveDropdown(null);
  };

  const handleCloseWindow = () => {
    executeTerminalCommand(`echo [WINDOW] Closing window...`);
    window.close();
    setActiveDropdown(null);
  };

  const handleExit = () => {
    executeTerminalCommand(`echo [EXIT] Exiting application.`);
    window.close();
    setActiveDropdown(null);
  };


  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    // Check uniqueness
    if (activeFiles.some(f => f.name.toLowerCase() === newFileName.toLowerCase())) {
      alert("A file with this name already exists in the workspace.");
      return;
    }

    const defaultContent = 
      newFileLang === "rust" ? "fn main() {\n    // Write Rust code here\n}" :
      newFileLang === "javascript" ? "function run() {\n  // Write JS here\n}" :
      newFileLang === "json" ? "{\n  \"status\": \"active\"\n}" :
      "export {}; // Write TS here";

    const newFileObj = {
      name: newFileName,
      path: newFileName,
      language: newFileLang,
      content: defaultContent
    };

    setActiveFiles([...activeFiles, newFileObj]);
    setSelectedFileName(newFileName);
    executeTerminalCommand(`echo [FILE] Created and opened new file: ${newFileName}`);
    
    // Close modal & reset input
    setShowNewFileModal(false);
    setNewFileName("");
    setActiveDropdown(null);
  };

  // Edit menu
  const handleClearDocument = () => {
    const updated = activeFiles.map(f => f.name === selectedFileName ? { ...f, content: "" } : f);
    setActiveFiles(updated);
    executeTerminalCommand(`echo [EDIT] Cleared workspace code inside: ${selectedFileName}`);
    setActiveDropdown(null);
  };

  const handleInjectCode = () => {
    let codeSnippet = "";
    if (currentFile.language === "rust") {
      codeSnippet = "\n// Boilerplate function\nfn calculate_diagnostics() -> Result<(), String> {\n    println!(\"Rust backend running ok\");\n    Ok(())\n}\n";
    } else if (currentFile.language === "javascript") {
      codeSnippet = "\n// Boilerplate function\nfunction executeTask(taskName) {\n  console.log(\"Running node task:\", taskName);\n}\n";
    } else if (currentFile.language === "json") {
      codeSnippet = ",\n  \"telemetry\": {\n    \"enabled\": true,\n    \"logLevel\": \"debug\"\n  }";
    } else {
      codeSnippet = "\n// Boilerplate function\nexport const fetchMetrics = async (): Promise<number> => {\n  return Math.random() * 105;\n};\n";
    }

    const updated = activeFiles.map(f => f.name === selectedFileName ? { ...f, content: f.content + codeSnippet } : f);
    setActiveFiles(updated);
    executeTerminalCommand(`echo [EDIT] Injected snippet template into: ${selectedFileName}`);
    setActiveDropdown(null);
  };

  // Selection menu
  const handleSelectAll = () => {
    executeTerminalCommand(`echo [SELECTION] All text highlighted in ${selectedFileName}`);
    setActiveDropdown(null);
  };

  const handleFormatCode = () => {
    const formatted = currentFile.content.split("\n").map(line => line.trimEnd()).join("\n");
    const updated = activeFiles.map(f => f.name === selectedFileName ? { ...f, content: formatted } : f);
    setActiveFiles(updated);
    executeTerminalCommand(`echo [FORMAT] Indentations formatted inside: ${selectedFileName}`);
    setActiveDropdown(null);
  };

  // View menu
  const handleToggleTheme = () => {
    const nextTheme = themeMode === "dark" ? "light" : "dark";
    setThemeMode(nextTheme);
    executeTerminalCommand(`echo [THEME] Toggle: Loaded theme scheme [${nextTheme.toUpperCase()}]`);
    setActiveDropdown(null);
  };

  // Go menu
  const handleFocusElement = (target: "editor" | "terminal") => {
    if (target === "terminal") {
      handleTerminalClick();
      executeTerminalCommand("echo [GO] Shifted focus to bottom Terminal shell input.");
    } else {
      executeTerminalCommand("echo [GO] Shifted focus to center Code Editor.");
    }
    setActiveDropdown(null);
  };

  // Run menu
  const handleRunFile = () => {
    if (currentFile.name === "main.rs") {
      executeTerminalCommand("cargo run");
    } else if (currentFile.name === "scraper.js") {
      executeTerminalCommand("node scraper.js");
    } else {
      executeTerminalCommand(`echo [RUN] Load config: ${selectedFileName}`);
    }
    setActiveDropdown(null);
  };

  const toggleDropdown = (menuId: string) => {
    setActiveDropdown(activeDropdown === menuId ? null : menuId);
  };

  // Menu items list mapping
  const menuConfig = [
    {
      id: "file",
      label: "File",
      items: [
        { label: "New Text File", icon: <FileText size={12} />, action: handleNewTextFile },
        { label: "New File...", icon: <FilePlus size={12} />, action: handleNewFileNative },
        { label: "New Project...", icon: <Plus size={12} className="text-emerald-400" />, action: handleNewProjectNative },
        { label: "New Window", icon: <ExternalLink size={12} />, action: handleNewWindow },
        { label: "New Window with Profile", icon: <ExternalLink size={12} className="text-indigo-400" />, action: handleNewWindowWithProfile },
        { label: "Open File...", icon: <FolderOpen size={12} />, action: handleOpenFileTrigger },
        { label: "Open Folder...", icon: <Folder size={12} className="text-yellow-500" />, action: handleOpenFolder },
        { label: "Open Project / Workspace...", icon: <Sparkles size={12} className="text-indigo-400" />, action: handleOpenFolder },
        { label: "Switch Workspace...", icon: <RotateCcw size={12} />, action: handleOpenFolder },
        { label: "Open Recent", icon: <RotateCcw size={12} />, action: handleOpenRecent },
        { label: "Add Folder to Workspace...", icon: <Folder size={12} className="text-indigo-400" />, action: handleAddFolderToWorkspace },
        { label: "Save Workspace As...", icon: <Save size={12} className="text-indigo-400" />, action: handleSaveWorkspaceAs },
        { label: "Duplicate Workspace", icon: <Copy size={12} />, action: handleDuplicateWorkspace },
        { label: "Save", icon: <Save size={12} className="text-emerald-400" />, action: handleSaveFile },
        { label: "Save As...", icon: <Save size={12} />, action: handleSaveAs },
        { label: "Save All", icon: <Save size={12} className="text-indigo-500 font-bold" />, action: handleSaveAll },
        { label: "Share", icon: <Share2 size={12} className="text-sky-400" />, action: handleShare },
        { 
          label: `Auto Save: ${autoSave ? "ON" : "OFF"}`, 
          icon: <Check size={12} className={autoSave ? "text-emerald-400" : "text-gray-500"} />, 
          action: () => { setAutoSave(!autoSave); executeTerminalCommand(`echo [SETTINGS] Auto-save toggled ${!autoSave ? "ON" : "OFF"}`); setActiveDropdown(null); } 
        },
        { label: "Preferences", icon: <Settings size={12} />, action: handlePreferences },
        { label: "Revert File", icon: <RotateCcw size={12} className="text-amber-500" />, action: handleRevertFile },
        { label: "Close Editor", icon: <X size={12} className="text-red-400" />, action: handleCloseEditor },
        { label: "Close Folder", icon: <Folder size={12} className="text-red-500" />, action: handleCloseFolder },
        { label: "Close Window", icon: <LogOut size={12} className="text-red-400" />, action: handleCloseWindow },
        { label: "Exit", icon: <LogOut size={12} className="text-red-600 font-bold" />, action: handleExit }
      ]
    },
    {
      id: "edit",
      label: "Edit",
      items: [
        { label: "Clear File Code", icon: <Trash2 size={12} />, action: handleClearDocument },
        { label: "Inject Template Code", icon: <Plus size={12} />, action: handleInjectCode }
      ]
    },
    {
      id: "selection",
      label: "Selection",
      items: [
        { label: "Select All Lines", icon: <FileText size={12} />, action: handleSelectAll },
        { label: "Format File Spacing", icon: <Edit3 size={12} />, action: handleFormatCode }
      ]
    },
    {
      id: "view",
      label: "View",
      items: [
        { label: `${sidebarVisible ? "Hide" : "Show"} Sidebar Explorer`, icon: <ChevronRight size={12} />, action: () => { setSidebarVisible(!sidebarVisible); setActiveDropdown(null); } },
        { label: `${terminalVisible ? "Hide" : "Show"} Terminal Panel`, icon: <TerminalIcon size={12} />, action: () => { setTerminalVisible(!terminalVisible); setActiveDropdown(null); } },
        { label: `Toggle Theme [${themeMode === "dark" ? "Light" : "Dark"}]`, icon: <RotateCcw size={12} />, action: handleToggleTheme }
      ]
    },
    {
      id: "go",
      label: "Go",
      items: [
        { label: "Go to Editor", icon: <FileCode size={12} />, action: () => handleFocusElement("editor") },
        { label: "Go to Terminal", icon: <TerminalIcon size={12} />, action: () => handleFocusElement("terminal") }
      ]
    },
    {
      id: "run",
      label: "Run",
      items: [
        { label: "Run Selected File", icon: <Play size={12} className="text-emerald-400" />, action: handleRunFile }
      ]
    },
    {
      id: "terminal",
      label: "Terminal",
      items: [
        { label: "New Terminal Session", icon: <TerminalIcon size={12} />, action: () => { executeTerminalCommand("clear"); setActiveDropdown(null); } },
        { label: "Run Telemetry Diagnostics", icon: <Cpu size={12} />, action: () => { executeTerminalCommand("sysinfo"); setActiveDropdown(null); } }
      ]
    },
    {
      id: "help",
      label: "Help",
      items: [
        { label: "Welcome Help Guide", icon: <Info size={12} />, action: () => { executeTerminalCommand("help"); setActiveDropdown(null); } },
        { label: "About Antigravity IDE", icon: <Sparkles size={12} />, action: () => setShowAboutModal(true) }
      ]
    }
  ];

  return (
    <div className={`h-full w-full flex flex-col overflow-hidden text-sm transition-colors duration-300 ${
      themeMode === "dark" ? "bg-cyber-bg text-gray-200" : "bg-gray-100 text-gray-800"
    }`}>
      
      {/* Top Application Header Bar */}
      <header 
        className={`h-11 w-full border-b flex items-center justify-between px-4 z-30 select-none ${
          themeMode === "dark" ? "glass-panel border-cyber-border" : "bg-white border-gray-300 shadow-sm"
        }`}
      >
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-indigo-500 font-bold">
            <span className="text-base">🌌</span>
            <span className={`tracking-wide font-extrabold text-xs ${themeMode === "dark" ? "bg-gradient-to-r from-indigo-400 to-indigo-200 bg-clip-text text-transparent" : "text-indigo-600"}`}>
              ANTIGRAVITY IDE
            </span>
          </div>

          {/* Interactive Navbar buttons */}
          <nav className="flex items-center space-x-1.5 text-xs font-semibold relative">
            {menuConfig.map((menu) => (
              <div key={menu.id} className="relative nav-menu-container">
                <button 
                  onClick={() => toggleDropdown(menu.id)}
                  className={`px-3 py-1.5 rounded transition-all flex items-center space-x-1 ${
                    activeDropdown === menu.id 
                      ? (themeMode === "dark" ? "bg-indigo-600/20 text-indigo-300" : "bg-indigo-50 text-indigo-600")
                      : (themeMode === "dark" ? "text-gray-400 hover:text-indigo-300 hover:bg-cyber-border/40" : "text-gray-600 hover:text-indigo-600 hover:bg-gray-150")
                  }`}
                >
                  <span>{menu.label}</span>
                </button>

                {/* Dropdown Card */}
                {activeDropdown === menu.id && (
                  <div 
                    className={`absolute left-0 mt-1.5 w-56 rounded-lg border shadow-lg flex flex-col p-1 z-50 ${
                      themeMode === "dark" 
                        ? "bg-cyber-panel border-cyber-border text-gray-300" 
                        : "bg-white border-gray-300 text-gray-700"
                    }`}
                  >
                    {menu.items.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={item.action}
                        className={`flex items-center space-x-2 px-3 py-2 rounded text-left text-xs transition-colors ${
                          themeMode === "dark" 
                            ? "hover:bg-indigo-600/35 hover:text-white" 
                            : "hover:bg-indigo-50 hover:text-indigo-600"
                        }`}
                      >
                        <span className={themeMode === "dark" ? "text-indigo-400" : "text-indigo-500"}>
                          {item.icon}
                        </span>
                        <span className="flex-1">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="flex items-center space-x-3 text-xs text-gray-500 font-mono">
          {/* Run and Stop project execution buttons */}
          <div className="flex items-center space-x-1.5 pr-2 mr-2 border-r border-gray-700/20">
            <button
              onClick={handleRunProject}
              disabled={isRunning}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded font-bold uppercase tracking-wider text-[10px] transition-all ${
                isRunning 
                  ? "bg-emerald-600/25 text-emerald-500 cursor-default" 
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow"
              }`}
              title="Launch running service"
            >
              <Play size={10} fill="currentColor" />
              <span>Run</span>
            </button>
            <button
              onClick={handleStopProject}
              disabled={!isRunning}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded font-bold uppercase tracking-wider text-[10px] transition-all ${
                !isRunning
                  ? "bg-red-950/20 text-red-700 cursor-default"
                  : "bg-red-600 hover:bg-red-500 text-white shadow-glow"
              }`}
              title="Stop running service (SIGINT)"
            >
              <Minimize2 size={10} className="rotate-45" /> {/* Stop icon */}
              <span>Stop</span>
            </button>
          </div>

          <span className={`hidden sm:inline border px-2 py-0.5 rounded text-[10px] ${
            themeMode === "dark" ? "bg-cyber-panel border-cyber-border text-gray-400" : "bg-gray-200 border-gray-300 text-gray-600"
          }`}>
            {selectedFileName}
          </span>
          <div className="flex items-center space-x-1.5">
            <button className={`p-1 rounded ${themeMode === "dark" ? "hover:bg-cyber-border text-gray-400" : "hover:bg-gray-200 text-gray-600"}`} onClick={() => alert("Minimize")}>
              <Minimize2 size={12} />
            </button>
            <button className={`p-1 rounded ${themeMode === "dark" ? "hover:bg-cyber-border text-gray-400" : "hover:bg-gray-200 text-gray-600"}`} onClick={() => alert("Maximize")}>
              <Square size={10} />
            </button>
            <button className="p-1 text-gray-400 hover:bg-red-500 hover:text-white rounded" onClick={() => alert("Close")}>
              <X size={12} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 w-full flex overflow-hidden p-2 gap-2 relative">
        
        {/* Left Side: File Explorer */}
        {sidebarVisible && (
          <aside
            style={{ width: sidebarWidth }}
            className={`rounded-xl border flex flex-col overflow-hidden z-20 transition-all ${
              themeMode === "dark" ? "glass-panel border-cyber-border" : "bg-white border-gray-300 shadow-sm"
            }`}
          >
            <div className={`p-3 border-b flex items-center justify-between text-xs font-bold tracking-wider uppercase select-none ${
              themeMode === "dark" ? "border-cyber-border text-gray-400" : "border-gray-200 text-gray-500 bg-gray-50"
            }`}>
              <span className="flex items-center space-x-1.5">
                <Folder size={12} className="text-indigo-500" />
                <span>Workspace Explorer</span>
              </span>
              <button 
                onClick={() => setShowNewFileModal(true)}
                className={`p-1 rounded transition-colors ${themeMode === "dark" ? "hover:bg-cyber-border text-gray-400" : "hover:bg-gray-200 text-gray-600"}`}
                title="Create New File"
              >
                <Plus size={12} />
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto p-2 text-xs font-mono select-none ${
              themeMode === "dark" ? "text-gray-300" : "text-gray-700"
            }`}>
              {/* Haka Baka root folder */}
              <div>
                <div 
                  className="flex items-center py-1 hover:bg-cyber-border/40 rounded cursor-pointer pl-1"
                  onClick={() => setExplorerOpen(!explorerOpen)}
                >
                  {explorerOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className="font-bold text-indigo-500 ml-1">{workspaceName}</span>
                </div>

                {explorerOpen && (
                  <div className="mt-1.5 space-y-1 pl-1">
                    {renderTreeNodes(buildFileTree(activeFiles))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* Left Resizer Splitter */}
        {sidebarVisible && (
          <div
            onMouseDown={startResizeSidebar}
            className="w-1 h-full cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-600 transition-colors flex-shrink-0 z-30"
          />
        )}

        {/* Center: Code Editor Pane */}
        <main
          className={`flex-1 rounded-xl border flex flex-col overflow-hidden z-20 ${
            themeMode === "dark" ? "glass-panel border-cyber-border" : "bg-white border-gray-300 shadow-sm"
          }`}
        >
          {/* Editor Header / Tab bar */}
          <div className={`h-10 border-b flex items-center justify-between px-4 select-none ${
            themeMode === "dark" ? "border-cyber-border bg-cyber-panel/40" : "border-gray-200 bg-gray-50"
          }`}>
            <div className="flex items-center space-x-1 text-xs">
              <div className={`flex items-center space-x-1.5 border px-3 py-1.5 rounded-t-lg font-bold ${
                themeMode === "dark" ? "bg-cyber-bg/60 border-cyber-border text-indigo-300" : "bg-white border-gray-300 text-indigo-600"
              }`}>
                <FileCode size={12} />
                <span>{selectedFileName}</span>
              </div>
              
              {activeFiles.filter(f => f.name !== selectedFileName).slice(0, 3).map(f => (
                <button
                  key={f.name}
                  onClick={() => setSelectedFileName(f.name)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-t-lg text-xs transition-colors ${
                    themeMode === "dark" ? "text-gray-500 hover:text-gray-300 hover:bg-cyber-border/20" : "text-gray-500 hover:text-gray-700 hover:bg-gray-150"
                  }`}
                >
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
            <div className="text-[10px] text-gray-500 font-mono hidden md:block">
              UTF-8 | Editor Active
            </div>
          </div>

          {/* Code Monaco Editor Container */}
          <div className="flex-1 w-full h-full min-h-0 relative">
            <Editor
              height="100%"
              language={
                currentFile.language === "typescript" ? "typescript" :
                currentFile.language === "javascript" ? "javascript" :
                currentFile.language === "rust" ? "rust" :
                currentFile.language === "json" ? "json" :
                currentFile.language === "python" ? "python" :
                currentFile.language === "html" ? "html" :
                currentFile.language === "css" ? "css" :
                "plaintext"
              }
              value={currentFile.content}
              theme={themeMode === "dark" ? "vs-dark" : "light"}
              onChange={(val) => {
                const updated = activeFiles.map(f => f.name === selectedFileName ? { ...f, content: val || "" } : f);
                setActiveFiles(updated);
              }}
              options={{
                fontSize: 12,
                fontFamily: 'Consolas, "Courier New", monospace',
                minimap: { enabled: false },
                automaticLayout: true,
                padding: { top: 8 }
              }}
            />
          </div>
        </main>

        {/* Right Resizer Splitter */}
        <div
          onMouseDown={startResizeAi}
          className="w-1 h-full cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-600 transition-colors flex-shrink-0 z-30"
        />

        {/* Right Side: AI Assistant Panel */}
        <aside
          style={{ width: aiWidth }}
          className={`rounded-xl border flex flex-col overflow-hidden z-20 transition-all ${
            themeMode === "dark" ? "glass-panel border-cyber-border" : "bg-white border-gray-300 shadow-sm"
          }`}
        >
          <div className={`p-3 border-b flex items-center justify-between text-xs font-bold tracking-wider uppercase select-none ${
            themeMode === "dark" ? "border-cyber-border text-gray-400" : "border-gray-200 text-gray-500 bg-gray-50"
          }`}>
            <span className="flex items-center space-x-1.5">
              <Sparkles size={12} className="text-indigo-500" />
              <span>Antigravity Assistant</span>
            </span>
            
            {/* Settings toggler (Gear icon) */}
            <button
              onClick={() => setShowAiSettings(!showAiSettings)}
              className={`p-1.5 rounded transition-all ${
                showAiSettings 
                  ? "bg-indigo-600/20 text-indigo-400" 
                  : (themeMode === "dark" ? "hover:bg-cyber-border text-gray-400 hover:text-white" : "hover:bg-gray-200 text-gray-600 hover:text-black")
              }`}
              title="Assistant API Configuration Settings"
            >
              <Settings size={14} />
            </button>
          </div>

          {/* AI Settings Form */}
          {showAiSettings && (
            <div className={`p-3 border-b text-xs space-y-3 font-sans ${
              themeMode === "dark" ? "bg-cyber-panel/60 border-cyber-border text-gray-300" : "bg-gray-50 border-gray-200 text-gray-700"
            }`}>
              <div className="flex items-center space-x-1.5 font-bold text-[10px] uppercase text-indigo-500 tracking-wider">
                <Key size={12} />
                <span>Gemini API Integration</span>
              </div>
              
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-mono">Gemini API Key:</label>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Paste your AI Studio Key..."
                  className={`border rounded px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 ${
                    themeMode === "dark" ? "bg-cyber-bg border-cyber-border text-gray-200" : "bg-white border-gray-300 text-gray-800"
                  }`}
                />
                <a 
                  href="https://aistudio.google.com/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[9px] text-indigo-400 hover:underline pt-0.5 block"
                >
                  Get a free key from Google AI Studio &gt;
                </a>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-mono">Select AI Model:</label>
                <select
                  value={tempAiModel}
                  onChange={(e) => setTempAiModel(e.target.value)}
                  className={`border rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 ${
                    themeMode === "dark" ? "bg-cyber-bg border-cyber-border text-gray-200" : "bg-white border-gray-300 text-gray-800"
                  }`}
                >
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (default)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (fast)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (advanced)</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleSaveApiSettings}
                  disabled={saveStatus === "saving"}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded font-bold text-[10px] uppercase tracking-wider transition-all duration-300 shadow-glow"
                >
                  {saveStatus === "saving" ? (
                    <RefreshCw size={10} className="animate-spin" />
                  ) : (
                    <Save size={10} />
                  )}
                  <span>{saveStatus === "saving" ? "Saving..." : "Save Settings"}</span>
                </button>

                {saveStatus === "success" && (
                  <span className="text-emerald-500 flex items-center space-x-1 font-bold text-[10px] uppercase">
                    <Check size={10} />
                    <span>Saved!</span>
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="text-red-500 flex items-center space-x-1 font-bold text-[10px] uppercase">
                    <X size={10} />
                    <span>Failed</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Chat message flow */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {chatMessages.map((msg, idx) => {
              const segments = parseMessageSegments(msg.text);
              const isAgent = msg.sender === "agent";

              return (
                <div
                  key={idx}
                  className={`flex flex-col space-y-2 max-w-[90%] ${isAgent ? "self-start" : "ml-auto"}`}
                >
                  <div className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                    isAgent
                      ? (themeMode === "dark" ? "bg-indigo-950/40 border border-indigo-900/30 text-indigo-200" : "bg-indigo-50 border border-indigo-100 text-indigo-850")
                      : (themeMode === "dark" ? "bg-cyber-bg border border-cyber-border text-gray-300" : "bg-gray-150 border border-gray-200 text-gray-800")
                  }`}>
                    <div className="flex items-center justify-between mb-1 opacity-60 text-[9px] font-mono select-none">
                      <span>{isAgent ? "ANTIGRAVITY" : "YOU"}</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div className="space-y-3 whitespace-pre-wrap break-words">
                      {segments.map((seg, sIdx) => {
                        if (seg.type === "text") {
                          return <span key={sIdx}>{seg.content}</span>;
                        } else {
                          // Render a beautiful code block container with the "Apply" option
                          return (
                            <div 
                              key={sIdx}
                              className={`my-2 rounded-lg border overflow-hidden flex flex-col font-mono text-[11px] ${
                                themeMode === "dark" ? "bg-cyber-terminal border-cyber-border" : "bg-gray-900 border-gray-950 text-gray-200"
                              }`}
                            >
                              {/* Code block Header */}
                              <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 text-[9px] font-bold tracking-widest text-indigo-400 select-none uppercase">
                                <span>{seg.language}</span>
                                <span>snippet</span>
                              </div>

                              {/* Code Content */}
                              <pre className="p-3 overflow-x-auto whitespace-pre selection:bg-indigo-500/30 text-gray-300">
                                {seg.content}
                              </pre>

                              {/* Apply Button */}
                              <div className="p-1.5 border-t border-black/20 bg-black/20 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleApplyCode(seg.content)}
                                  className="flex items-center space-x-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-[9px] uppercase tracking-wider transition-colors duration-300 shadow-glow"
                                >
                                  <Check size={10} />
                                  <span>Apply to Editor</span>
                                </button>
                              </div>
                            </div>
                          );
                        }
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {chatLoading && (
              <div className="flex items-center space-x-2 text-indigo-500 py-1 font-mono text-xs">
                <RefreshCw size={12} className="animate-spin" />
                <span className="animate-pulse">Gemini thinking...</span>
              </div>
            )}
          </div>

          {/* Chat form */}
          <form onSubmit={handleSendChat} className={`p-2 border-t flex gap-1.5 ${
            themeMode === "dark" ? "border-cyber-border bg-cyber-bg/20" : "border-gray-200 bg-gray-50"
          }`}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={chatLoading ? "Waiting for AI..." : "Ask assistant to code..."}
              disabled={chatLoading}
              className={`flex-1 border rounded px-2.5 py-1.5 text-xs focus:outline-none ${
                themeMode === "dark" ? "bg-cyber-bg border-cyber-border text-gray-200 focus:border-indigo-500" : "bg-white border-gray-300 text-gray-800 focus:border-indigo-500"
              }`}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded p-1.5 px-2.5 flex items-center justify-center transition-all duration-300"
            >
              <Send size={11} />
            </button>
          </form>
        </aside>
      </div>

      {/* Terminal Height Resizer */}
      {terminalVisible && (
        <div
          onMouseDown={startResizeTerminal}
          className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 active:bg-indigo-600 transition-colors z-30 flex-shrink-0"
        />
      )}

      {/* Bottom Pane: Terminal / Execution logs */}
      {terminalVisible && (
        <footer
          style={{ height: terminalHeight }}
          className={`mx-2 mb-2 rounded-xl border flex flex-col overflow-hidden z-20 ${
            themeMode === "dark" ? "glass-panel border-cyber-border" : "bg-white border-gray-300 shadow-sm"
          }`}
        >
          {/* Panel Tab Header Bar */}
          <div className={`h-9 border-b flex items-center justify-between px-3 select-none ${
            themeMode === "dark" ? "border-cyber-border bg-cyber-panel/30" : "border-gray-200 bg-gray-50"
          }`}>
            <div className="flex items-center space-x-1.5 overflow-x-auto max-w-[80%] scrollbar-none">
              <span className="text-indigo-500 font-bold flex items-center space-x-1 pr-2 text-xs border-r border-gray-700/30">
                <TerminalIcon size={12} />
                <span className="hidden sm:inline font-mono tracking-wider text-[10px]">INTEGRATED PANEL</span>
              </span>
              
              {/* Render each interactive shell terminal tab */}
              {terminalTabs.map((tab) => {
                const isActive = activeTabId === tab.id;
                return (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`flex items-center space-x-1.5 px-3 h-7 rounded-t-md text-xs font-mono border-t-2 transition-all cursor-pointer select-none ${
                      isActive
                        ? "bg-black/25 text-indigo-400 border-indigo-500 font-bold"
                        : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-black/10"
                    }`}
                  >
                    <span>{tab.name}</span>
                    <button
                      type="button"
                      onClick={(e) => closeTerminalTab(tab.id, e)}
                      disabled={terminalTabs.length <= 1}
                      className="p-0.5 rounded-full hover:bg-red-500/20 hover:text-red-400 disabled:opacity-30 transition-all"
                    >
                      <X size={8} />
                    </button>
                  </div>
                );
              })}

              {/* Spawn terminal button */}
              <button
                type="button"
                onClick={addTerminalTab}
                title="Open New Terminal Shell"
                className={`p-1 rounded hover:bg-black/20 text-gray-400 hover:text-white transition-all`}
              >
                <Plus size={12} />
              </button>

              <span className="text-gray-600 font-mono text-xs">|</span>

              {/* Output log tab */}
              <button
                type="button"
                onClick={() => setActiveTabId("output")}
                className={`px-3 h-7 rounded-t-md text-xs font-mono border-t-2 transition-all ${
                  activeTabId === "output"
                    ? "bg-black/25 text-indigo-400 border-indigo-500 font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-black/10"
                }`}
              >
                output logs
              </button>

              <span className="text-gray-600 font-mono text-xs">|</span>

              {/* Live Preview tab */}
              <button
                type="button"
                onClick={() => setActiveTabId("preview")}
                className={`px-3 h-7 rounded-t-md text-xs font-mono border-t-2 transition-all ${
                  activeTabId === "preview"
                    ? "bg-black/25 text-indigo-400 border-indigo-500 font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-black/10"
                }`}
              >
                live preview
              </button>
            </div>
            
            <div className="flex items-center space-x-2 text-xs">
              {activeTabId === "output" ? (
                <>
                  <button
                    onClick={() => handlePresetCommand("sysinfo")}
                    disabled={isLoading}
                    className="flex items-center space-x-1.5 text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-indigo-600/20 border border-indigo-500/30 text-indigo-500 rounded hover:bg-indigo-600/30 transition-all disabled:opacity-45"
                  >
                    <RefreshCw size={10} className={isLoading ? "animate-spin" : ""} />
                    <span>System Info</span>
                  </button>
                  <button
                    onClick={clearLogs}
                    className="text-[10px] text-gray-500 hover:text-gray-700 underline font-mono cursor-pointer"
                  >
                    Clear Output
                  </button>
                </>
              ) : activeTabId === "preview" ? (
                <span className="text-[10px] uppercase font-mono tracking-wider text-sky-400 font-bold">
                  ● Proxy Ports Active
                </span>
              ) : (
                <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-bold">
                  ● PTY Active
                </span>
              )}
            </div>
          </div>

          {/* Panel Content Area */}
          <div className="flex-1 min-h-0 relative bg-[#0c0f17]">
            {/* 1. Render all active Xterm Terminal instances (hiding inactive ones via display:none) */}
            {terminalTabs.map((tab) => (
              <XtermTerminal
                key={tab.id}
                sessionId={tab.sessionId}
                cwd={tab.cwd}
                isActive={activeTabId === tab.id}
                themeMode={themeMode}
              />
            ))}

            {/* 2. Render the old compilation output panel logs if "output" tab is selected */}
            {activeTabId === "output" && (
              <div 
                ref={logsContainerRef}
                className={`w-full h-full p-3 overflow-y-auto font-mono text-[11px] leading-relaxed text-gray-200 ${
                  themeMode === "dark" ? "bg-cyber-terminal/85" : "bg-gray-900"
                }`}
              >
                {executionLogs.map((log, index) => {
                  let textColor = "text-gray-300";
                  if (log.includes("SUCCESS")) textColor = "text-emerald-400 font-bold";
                  else if (log.includes("PASSED")) textColor = "text-emerald-400";
                  else if (log.includes("SYSINFO")) textColor = "text-indigo-300 font-semibold";
                  else if (log.includes("RUST")) textColor = "text-orange-400";
                  else if (log.startsWith("PS ")) textColor = "text-indigo-200 font-semibold";
                  else if (log.includes("[ERROR]")) textColor = "text-red-400 font-bold";
                  else if (log.includes("SANDBOX WARNING")) textColor = "text-yellow-400";
                  else if (log.includes("[FILE]") || log.includes("[EDIT]") || log.includes("[FORMAT]") || log.includes("[AI]")) textColor = "text-sky-300 font-bold";

                  return (
                    <div key={index} className={`py-0.5 whitespace-pre-wrap ${textColor}`}>
                      {log}
                    </div>
                  );
                })}

                {/* Interactive Shell Prompt Line fallback */}
                <form onSubmit={handleTerminalSubmit} className="flex items-center py-0.5 text-indigo-200 mt-1">
                  <span className="text-indigo-400 select-none mr-2 font-semibold">
                    PS {terminalCwd}&gt;
                  </span>
                  <input
                    ref={terminalInputRef}
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyDown={handleTerminalKeyDown}
                    disabled={isLoading}
                    className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 m-0 border-0 text-gray-100 font-mono text-[11px] caret-indigo-400 select-text"
                  />
                </form>

                {isLoading && (
                  <div className="flex items-center space-x-2 text-indigo-400 py-0.5">
                    <span className="w-1.5 h-3 bg-indigo-400 animate-pulse" />
                    <span className="animate-pulse">Awaiting subprocess...</span>
                  </div>
                )}
              </div>
            )}

            {/* 3. Render the Live Preview browser frame */}
            {activeTabId === "preview" && (
              <div className="w-full h-full flex flex-col bg-[#0c0f17] font-sans">
                {/* Address bar */}
                <div className={`h-8 border-b flex items-center px-3 gap-2 text-xs ${
                  themeMode === "dark" ? "border-cyber-border bg-black/20" : "border-gray-250 bg-gray-100"
                }`}>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-red-500/80" />
                    <span className="w-2 h-2 rounded-full bg-yellow-500/80" />
                    <span className="w-2 h-2 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-gray-500 font-mono flex-shrink-0">|</span>
                  <div className={`flex-1 rounded px-2 py-0.5 border flex items-center gap-1.5 font-mono text-[9px] truncate ${
                    themeMode === "dark" ? "bg-cyber-panel/40 border-cyber-border/40 text-gray-300" : "bg-white border-gray-300 text-gray-700"
                  }`}>
                    <span className="text-indigo-400 flex-shrink-0">PROXY URL:</span>
                    <span className="select-all truncate">http://localhost:1422/preview/${projectId}/${previewPort}/</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[9px] flex-shrink-0">
                    <span className="text-gray-500">PORT:</span>
                    <input
                      type="number"
                      value={previewPort}
                      onChange={(e) => setPreviewPort(parseInt(e.target.value, 10) || 0)}
                      className={`w-12 rounded border px-1 py-0.5 text-center focus:outline-none focus:border-indigo-500 ${
                        themeMode === "dark" ? "bg-cyber-panel border-cyber-border text-gray-200" : "bg-white border-gray-300 text-gray-800"
                      }`}
                    />
                    <button
                      onClick={() => setPreviewUrlVersion(v => v + 1)}
                      className="p-1 rounded hover:bg-black/20 text-indigo-400 transition-colors"
                      title="Reload Preview Frame"
                    >
                      <RefreshCw size={10} />
                    </button>
                  </div>
                </div>

                {/* Embedded Frame */}
                <div className="flex-1 min-h-0 bg-white">
                  {previewPort > 0 ? (
                    <iframe
                      key={`${previewPort}-${previewUrlVersion}`}
                      src={`http://localhost:1422/preview/${projectId}/${previewPort}/`}
                      className="w-full h-full border-none bg-white"
                      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-mono text-xs bg-[#0c0f17]">
                      Specify a port number in the address bar to open service preview.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </footer>
      )}

      {/* --- MODAL OVERLAYS --- */}

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleCreateFileSubmit}
            className={`w-full max-w-sm rounded-xl p-5 border flex flex-col space-y-4 ${
              themeMode === "dark" ? "bg-cyber-panel border-cyber-border text-gray-200" : "bg-white border-gray-300 text-gray-800"
            }`}
          >
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <span className="font-bold flex items-center space-x-1.5">
                <Plus size={16} className="text-indigo-500" />
                <span>Create New File</span>
              </span>
              <button 
                type="button" 
                onClick={() => setShowNewFileModal(false)}
                className={`p-1 rounded ${themeMode === "dark" ? "hover:bg-cyber-border text-gray-400" : "hover:bg-gray-200 text-gray-600"}`}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs text-gray-500 font-mono">Filename:</label>
              <input
                type="text"
                required
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="e.g. index.tsx, lib.rs"
                className={`border rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 ${
                  themeMode === "dark" ? "bg-cyber-bg border-cyber-border text-gray-200" : "bg-white border-gray-300 text-gray-800"
                }`}
              />
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs text-gray-500 font-mono">File Language:</label>
              <select
                value={newFileLang}
                onChange={(e) => setNewFileLang(e.target.value)}
                className={`border rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 ${
                  themeMode === "dark" ? "bg-cyber-bg border-cyber-border text-gray-200" : "bg-white border-gray-300 text-gray-800"
                }`}
              >
                <option value="typescript">TypeScript</option>
                <option value="rust">Rust</option>
                <option value="javascript">JavaScript</option>
                <option value="json">JSON</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewFileModal(false)}
                className={`px-3 py-1.5 rounded text-xs transition-colors ${
                  themeMode === "dark" ? "bg-cyber-bg hover:bg-cyber-border text-gray-400" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition-colors"
              >
                Create File
              </button>
            </div>
          </form>
        </div>
      )}

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div 
            className={`w-full max-w-sm rounded-xl p-5 border flex flex-col space-y-4 shadow-2xl ${
              themeMode === "dark" ? "bg-cyber-panel border-cyber-border text-gray-200" : "bg-white border-gray-300 text-gray-800"
            }`}
          >
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <span className="font-bold flex items-center space-x-1.5 text-indigo-500">
                <Info size={16} />
                <span>About Antigravity IDE</span>
              </span>
              <button 
                onClick={() => setShowAboutModal(false)}
                className={`p-1 rounded ${themeMode === "dark" ? "hover:bg-cyber-border text-gray-400" : "hover:bg-gray-200 text-gray-600"}`}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-gray-400 leading-relaxed font-mono">
              <div className="text-gray-200 font-bold text-sm tracking-wide">Antigravity IDE v0.2.0</div>
              <div>Platform runtime: Tauri v2 / Rust Desktop Core</div>
              <div>Web interface: React 19 / Vite / Tailwind CSS</div>
              <div>Host architecture: windows-x86_64 target</div>
              <div className="pt-2 text-[10px] text-gray-500">
                Developed by the Antigravity Team. Licensed for local and cloud workspace compilation diagnostics.
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setShowAboutModal(false)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Workspace Modal */}
      {showOpenWorkspaceModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (enteredWorkspacePath.trim()) {
                loadWorkspaceData(enteredWorkspacePath.trim());
                setShowOpenWorkspaceModal(false);
              }
            }}
            className={`w-full max-w-md rounded-xl p-5 border flex flex-col space-y-4 shadow-2xl ${
              themeMode === "dark" ? "bg-cyber-panel border-cyber-border text-gray-200" : "bg-white border-gray-300 text-gray-800"
            }`}
          >
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <span className="font-bold flex items-center space-x-1.5 text-indigo-500">
                <Folder size={16} />
                <span>Open Project / Workspace Folder</span>
              </span>
              <button 
                type="button"
                onClick={() => setShowOpenWorkspaceModal(false)}
                className={`p-1 rounded ${themeMode === "dark" ? "hover:bg-cyber-border text-gray-400" : "hover:bg-gray-200 text-gray-600"}`}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col space-y-1.5 font-mono text-xs">
              <label className="text-gray-500 uppercase tracking-wider text-[10px]">Absolute Local Path:</label>
              <input
                type="text"
                required
                value={enteredWorkspacePath}
                onChange={(e) => setEnteredWorkspacePath(e.target.value)}
                placeholder="e.g. C:\Users\heman\Projects\MyNodeApp"
                className={`border rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 ${
                  themeMode === "dark" ? "bg-cyber-bg border-cyber-border text-gray-200" : "bg-white border-gray-300 text-gray-800"
                }`}
              />
              <p className="text-[10px] text-gray-500 leading-normal pt-1 select-none">
                Provide the full absolute directory path on your host file system. The IDE will boot the isolated terminal shells and scan files in this location.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOpenWorkspaceModal(false)}
                className={`px-3 py-1.5 rounded text-xs transition-colors ${
                  themeMode === "dark" ? "bg-cyber-bg hover:bg-cyber-border text-gray-400" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition-colors"
              >
                Open Workspace
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Hidden File Input for Open File operation */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileOpenChange}
        style={{ display: "none" }}
        accept=".txt,.js,.jsx,.ts,.tsx,.json,.rs,.css,.html,.md"
      />

      {/* Hidden Folder Input for Open Folder operation */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderOpenChange}
        style={{ display: "none" }}
        webkitdirectory=""
        directory=""
      />

    </div>
  );
};
