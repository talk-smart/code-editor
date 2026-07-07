# ADR-09: Project Knowledge Graph
**Status**: DRAFT  
**Author**: Antigravity Core Architect  

---

## 🎯 Purpose
Goes beyond text embeddings to map semantic dependencies, classes, methods, imports, and exports, giving the AI agent a deep, structural understanding of how components interact.

## 🕸️ Graph Structure
* **Nodes**: Source files, classes, methods, modules, types, database schemas.
* **Relationships**: `calls`, `implements`, `extends`, `imports`, `uses`.
* **Incremental Updates**: File watchers listen to save events and trigger background workers to update changed nodes and edges in the graph dynamically.