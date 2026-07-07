# ADR-00: Core Vision - Antigravity IDE
**Status**: APPROVED  
**Author**: Antigravity Core Architect  

---

## 🎯 The Core Vision
Antigravity IDE is not just a code editor with AI chat integration. It is an **AI Operating System for Software Development**.

Our target is to build a highly extensible, secure, and reactive environment that operates as a core framework. The core system handles state, terminal sessions, process execution, and permissions, while the AI models act as pluggable tools (or services) within this OS rather than running it.

---

## 🏛️ Architectural Principles

### 1. Decoupled Model Providers
No part of the core IDE is tied to a specific LLM API (Gemini, Claude, GPT, or Local Ollama). Models sit behind an **AI Model Router** and function purely by calling registered tool schemas.

### 2. State-Reactive Architecture
Every UI component (Explorer, Monaco, Terminals) reacts to events published by a central event bus, anchored by the **Workspace Manager**.

### 3. Tool-Driven Agent Execution
The AI is restricted from accessing the host filesystem, Git, Docker, or shell processes directly. It proposes actions using the **Capability Registry**, which are audited by the **Permission Manager** and executed through the **AI Tool Dispatcher**.

### 4. Continuous Verification Loops
Every AI modification loop operates on a secure sandbox and must pass automated compilation, linting, testing, and runtime checks before it is committed to the workspace.

---

## 📂 Architecture Specifications Map
* 00-vision.md: Executive Core Vision
* 01-system-overview.md: System Block Diagram, Event Bus, State Machine
* 02-workspace-manager.md: Active workspace, tabs, and session state
* 03-event-bus.md: Pub-Sub communication system
* 04-tool-registry.md: Pluggable capability registration
* 05-permission-manager.md: Security levels & user verification dialogs
* 06-runtime-manager.md: Platform run/test/build detectors
* 07-terminal-manager.md: WebSocket PTY session lifecycles
* 08-project-indexer.md: Filesystem watches and AST indexing
* 12-task-queue.md: Sequential task execution and execution engine
* 15-verification-engine.md: Sandboxed file edits and automated typechecking
* 16-plugin-sdk.md: Extension SDK specifications
* 19-roadmap.md: Phased Development Roadmap