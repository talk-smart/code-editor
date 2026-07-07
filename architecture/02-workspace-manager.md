# ADR-02: Workspace Manager (Core Specification)
**Status**: APPROVED  
**Author**: Antigravity Core Architect  

---

## 🎯 Purpose
The **Workspace Manager** acts as the single source of truth for the active project folder, layout tab views, and active file selection. It decouples general UI properties from project-centric lifecycles.

## 💾 Managed State Properties
```typescript
export interface WorkspaceState {
  activeWorkspacePath: string; // Absolute path to active workspace folder on disk
  currentProject: string;       // Normalized folder name
  activeFileName: string;       // Name of currently focused file in Monaco
  openedTabs: MockFile[];       // Active file buffers loaded in workspace
  projectType: string;          // Detected language/platform (nodejs, rust, python, etc.)
  runCommand: string;           // Detected runtime execution command
  installCommand: string;       // Detected runtime install/build command
  pkgManager: string;           // Scanned package manager
  gitStatus: string;            // Branch & status details
  isReady: boolean;             // Initial load state tracker
  recentProjects: string[];     // Persisted folder history paths
}
```

---

## 🛠️ Refactoring & Interface Plan

### A. AppContext.tsx Refactoring
- **Remove**: `activeWorkspacePath`, `activeFiles`, `selectedFileName`, `projectType`, `runCommand`, `installCommand`, `pkgManager`, `gitStatus`, and the loader `loadWorkspaceData`.
- **Retain**: Generic UI GUI configurations (`apiKey`, `aiModel`, `uiMode`, `executionLogs`).

### B. New WorkspaceManager.tsx
- **Expose**: `WorkspaceProvider` and the `useWorkspace()` React Hook.
- **Implement**:
  - `loadWorkspaceData(path)`: Fetches files recursively from `1422` backend, scans compile command targets, and updates Git statuses.
  - `saveFileToDisk(filePath, content)`: Writes code updates to host disk natively.

### C. UI Component Integration
- **DeveloperWorkspace.tsx**: Swaps `activeFiles` ➔ `openedTabs`, `selectedFileName` ➔ `activeFileName`, and imports states from `useWorkspace()`.
- **XtermTerminal.tsx**: Swaps references to fetch the active working directory CWD from `useWorkspace()`.