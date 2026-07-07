# ADR-11: Session Memory & Timeline
**Status**: DRAFT  
**Author**: Antigravity Core Architect  

---

## 🎯 Purpose
Allows long-running development agent tasks to maintain structural context, design guidelines, coding styles, and historical decisions even if the raw chat context fills up.

## 💾 Core Components
* **Memory Store**: Persists architectural invariants (e.g. "We use absolute imports", "The backend is in Go").
* **Workspace Timeline**: Linear log of events (e.g. "11:42 Installed React", "11:45 Fixed build failures"). Enables restoring files to any historical checkpoint.
* **Undo Engine**: Keeps pre-edit snapshots of file changes. If an AI edit fails typechecking, it rolls back changes immediately.