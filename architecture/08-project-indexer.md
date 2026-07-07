# ADR-08: Project Indexer
**Status**: APPROVED  
**Author**: Antigravity Core Architect  

---

## 🎯 Purpose
Builds structural code indexes and exports symbol telemetry to context compile layers.

## 📂 Features
* **File Watcher**: Observes workspace additions, saves, and deletions.
* **AST Indexing**: Generates indices of imports, classes, functions, and definitions.
* **Context Compiler**: Aggregates only relevant codebase slices, reducing token payloads to AI models.