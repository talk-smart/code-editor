# ADR-03: Decoupled Event Bus Specification
**Status**: APPROVED  
**Author**: Antigravity Core Architect  

---

## 🎯 Purpose
Enables clean, modular components that communicate via asynchronous system events rather than direct coupling.

## 📢 Core Events List
* **WorkspaceOpened**: Triggered when a new active folder path is loaded.
* **FileSaved**: Triggered when code modifications write to disk.
* **TerminalStarted / TerminalExited**: Tracks terminal PTY lifetimes.
* **GitChanged**: Signals branch updates, repository commits, and staging changes.
* **TestsFinished**: Reports typecheck, linting, and unit testing results.
* **AICompleted**: Fired when code generation tasks are fully applied.