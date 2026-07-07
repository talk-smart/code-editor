import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { MockFile } from "./AppContext";
import { EventBus } from "./EventBus";

export interface WorkspaceState {
  activeWorkspacePath: string;
  currentProject: string;
  activeFileName: string;
  openedTabs: MockFile[];
  projectType: string;
  runCommand: string;
  installCommand: string;
  pkgManager: string;
  gitStatus: string;
  isReady: boolean;
  recentProjects: string[];
}

export interface WorkspaceContextType extends WorkspaceState {
  setActiveFileName: (name: string) => void;
  setOpenedTabs: (files: MockFile[]) => void;
  loadWorkspaceData: (path: string) => Promise<void>;
  saveFileToDisk: (filePath: string, content: string) => Promise<boolean>;
  closeWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const [activeWorkspacePath, setActiveWorkspacePath] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("antigravity_active_workspace_path") || "C:\\Users\\heman\\OneDrive\\Desktop\\haka baka";
    }
    return "C:\\Users\\heman\\OneDrive\\Desktop\\haka baka";
  });

  const [currentProject, setCurrentProject] = useState<string>("default");
  const [activeFileName, setActiveFileName] = useState<string>("main.rs");
  const [openedTabs, setOpenedTabs] = useState<MockFile[]>([]);
  const [projectType, setProjectType] = useState<string>("unknown");
  const [runCommand, setRunCommand] = useState<string>("npm run dev");
  const [installCommand, setInstallCommand] = useState<string>("npm install");
  const [pkgManager, setPkgManager] = useState<string>("npm");
  const [gitStatus, setGitStatus] = useState<string>("");
  const [isReady, setIsReady] = useState<boolean>(false);
  const [recentProjects, setRecentProjects] = useState<string[]>([]);

  // Update current project name whenever workspace path changes
  useEffect(() => {
    if (activeWorkspacePath) {
      const folder = activeWorkspacePath.split(/[\\/]/).pop() || "default";
      setCurrentProject(folder);
    }
  }, [activeWorkspacePath]);

  // Load recent projects list
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("antigravity_recent_projects");
      if (saved) {
        try {
          setRecentProjects(JSON.parse(saved));
        } catch (e) {}
      }
    }
  }, []);

  const loadWorkspaceData = async (path: string) => {
    setIsReady(false);
    await EventBus.publish("WorkspaceLoading", { path });
    try {
      console.log(`[WORKSPACE] Loading directory: ${path}`);
      localStorage.setItem("antigravity_active_workspace_path", path);
      setActiveWorkspacePath(path);

      // Add to recent projects
      setRecentProjects(prev => {
        const filtered = prev.filter(p => p !== path);
        const updated = [path, ...filtered].slice(0, 10);
        localStorage.setItem("antigravity_recent_projects", JSON.stringify(updated));
        return updated;
      });

      await EventBus.publish("WorkspaceOpened", { path });
      await EventBus.publish("WorkspaceChanged", { path });

      let filesCount = 0;

      // 1. Fetch files recursively from backend
      const filesRes = await fetch(`http://localhost:1422/api/project/files?path=${encodeURIComponent(path)}`);
      if (filesRes.ok) {
        const data = await filesRes.json();
        if (data.files && data.files.length > 0) {
          setOpenedTabs(data.files);
          filesCount = data.files.length;
          // Auto-select preferred file if present, else first file
          const preferred = data.files.find((f: any) => 
            f.name === "main.rs" || 
            f.name === "package.json" || 
            f.name === "index.html" || 
            f.name === "main.py" || 
            f.name === "app.py"
          ) || data.files[0];
          setActiveFileName(preferred.name);
        } else {
          setOpenedTabs([]);
          setActiveFileName("");
        }
      }

      // 2. Fetch project runtime detection
      const detectRes = await fetch(`http://localhost:1422/api/project/detect?path=${encodeURIComponent(path)}`);
      if (detectRes.ok) {
        const detectData = await detectRes.json();
        setProjectType(detectData.type);
        setRunCommand(detectData.runCmd);
        setInstallCommand(detectData.installCmd);
        setPkgManager(detectData.pkgManager);
      }

      // 3. Fetch Git status metadata
      const gitRes = await fetch(`http://localhost:1422/api/project/git?path=${encodeURIComponent(path)}`);
      if (gitRes.ok) {
        const gitData = await gitRes.json();
        if (gitData.initialized) {
          setGitStatus(`Branch: ${gitData.branch}\nStatus:\n${gitData.status}`);
        } else {
          setGitStatus("Not a Git repository");
        }
      }

      await EventBus.publish("WorkspaceReady", { path, filesCount });

      // 4. Dispatch a WorkspaceChanged event (legacy custom event for safety)
      if (typeof window !== "undefined") {
        const event = new CustomEvent("WorkspaceChanged", { detail: { path } });
        window.dispatchEvent(event);
      }
    } catch (e: any) {
      console.error("[WORKSPACE] Failed to load workspace data:", e);
      await EventBus.publish("WorkspaceError", { path, error: e.message || String(e) });
    } finally {
      setIsReady(true);
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
        return true;
      }
    } catch (e) {
      console.error(`[WORKSPACE] Failed to save file ${filePath}:`, e);
    }
    return false;
  };

  const closeWorkspace = () => {
    setActiveWorkspacePath("");
    setOpenedTabs([]);
    setActiveFileName("");
    setProjectType("unknown");
    setGitStatus("");
    EventBus.publish("WorkspaceClosed", undefined);
  };

  // Publish ActiveFileChanged event whenever activeFileName updates
  useEffect(() => {
    if (activeFileName) {
      EventBus.publish("ActiveFileChanged", { filePath: activeFileName });
    }
  }, [activeFileName]);

  // Load active workspace on mount
  useEffect(() => {
    if (activeWorkspacePath) {
      loadWorkspaceData(activeWorkspacePath);
    }
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspacePath,
        currentProject,
        activeFileName,
        openedTabs,
        projectType,
        runCommand,
        installCommand,
        pkgManager,
        gitStatus,
        isReady,
        recentProjects,
        setActiveFileName,
        setOpenedTabs,
        loadWorkspaceData,
        saveFileToDisk,
        closeWorkspace
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};
