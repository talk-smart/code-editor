# ADR-17: Sandbox Security Model
**Status**: APPROVED  
**Author**: Antigravity Core Architect  

---

## 🎯 Purpose
Enforces isolated runtime boundaries.

## 🔒 Boundaries
* **Docker Sandboxing**: Spawns PTY terminals inside a restricted CPU/RAM container.
* **Permission Interceptors**: Requires user confirmation before launching system scripts.