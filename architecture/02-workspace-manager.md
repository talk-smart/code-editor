# ADR-02: Workspace Manager (Core)
**Status**: APPROVED  
**Author**: Antigravity Core Architect  

---

## 🎯 Purpose
Serves as the single source of truth for the active project folder, layout tab views, and file selection.

## 💾 Managed State Properties
* **currentWorkspace**: Absolute path to the loaded directory.
* **currentProject**: Normalized project metadata name.
* **openedTabs**: Array of open Monaco Editor file buffers.
* **activeFile**: Path to the file currently focused in Monaco.
* **recentProjects**: Array of previously loaded workspace paths.

## 🔄 Lifecycle Hooks
* **onLoad**: Initializes paths, reads local settings, and restores tabs.
* **onWorkspaceChanged**: Fires a global system event notifying terminals, search indexes, and models.