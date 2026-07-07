# ADR-19: Phased Development Roadmap
**Status**: APPROVED  
**Author**: Antigravity Core Architect  

---

## 🗺️ Execution Timeline

### 🚀 Phase 1: Foundation (Current Target)
* **Workspace Manager**: Central state provider for active tabs, selected files, and path scopes.
* **Event Bus**: EventEmitter-based decoupling mechanism.
* **Capability Tool Registry**: Declares schemas, permissions, and timeout profiles for filesystem operations.
* **Permission Manager**: User confirmation overlays for file modifications and terminal commands.
* **Runtime Manager**: Platform environment detectors.

### 🧠 Phase 2: Intelligence & Caching
* **Project Indexer**: AST compiler indexing functions, classes, and imports.
* **Context Compiler**: Intelligent token reduction manager. Only passes relevant local references.
* **AI Context Store**: Serializes exact editor positions, diagnostics, and recent git history.

### ⚙️ Phase 3: Agentic Execution Loop
* **Planner Agent**: Decomposes prompts into multi-task plans.
* **Execution Engine**: Handles dependency ordering, parallel tasks, cancellation, and checkpoints.
* **Task Queue**: Executes tasks with automated retry mechanisms.
* **Verification Engine**: Automates compilation, typechecking, and lint checks.

### 🔌 Phase 4: Extensibility
* **Plugin SDK**: Standard extension framework.
* **AI Model Router**: Dynamically switches between Gemini Pro/Flash, GPT, Claude, or local Ollama.