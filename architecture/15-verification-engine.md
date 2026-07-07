# ADR-15: AI Sandbox & Verification Engine
**Status**: DRAFT  
**Author**: Antigravity Core Architect  

---

## 🎯 Purpose
Ensures generated code does not break the project build, fail tests, or introduce type compiler errors before applying updates to the user's workspace.

## 🔄 Verification Lifecycle
```
  AI Code Edit
       │
       ▼
 [AI Sandbox] (Generates temp file copy and writes code)
       │
       ▼
 [Typecheck] (Runs tsc, cargo check, pyright)
       │
       ▼
 [Lint Check] (Runs eslint, cargo clippy)
       │
       ▼
 [Unit Tests] (Runs npm test, cargo test)
       │
       ▼
 [Success] ──► Apply diff to workspace
       │
 [Failure] ──► Reflect error to agent loop for automatic retry
```