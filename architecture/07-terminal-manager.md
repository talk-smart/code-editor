# ADR-07: PTY Terminal Manager
**Status**: APPROVED  
**Author**: Antigravity Core Architect  

---

## 🎯 Purpose
Manages real shell sessions natively.

## 🔌 Capabilities
* **Session Lifecycle**: Spawns, attaches, and disposes of PTY tabs dynamically.
* **CWD Tracking**: Enforces matching workspace directory locations across tabs.
* **Reconnection**: Remembers session IDs to reconnect shells on refresh.
* **ANSI escape codes**: Bridges raw terminal escape color streaming over WebSockets.