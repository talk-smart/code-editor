# ADR-01: System Overview & Event Bus
**Status**: APPROVED  
**Author**: Antigravity Core Architect  

---

## 🏗️ System Block Diagram
```
                    Antigravity IDE

                           │
                 Workspace Manager (Core)
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
  File Explorer      Monaco Editor      Terminal Manager
        │                  │                  │
        └──────────────┬───┴──────────────┬───┘
                       ▼                  ▼
                 Project Indexer     Runtime Manager
                       │                  │
                       ▼                  ▼
                 Context Store      Docker Manager
                       │                  │
                       └──────────┬───────┘
                                  ▼
                         AI Tool Dispatcher
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
            Gemini            OpenAI             Claude
```

---

## 🚥 IDE State Machine
The active workspace operates under a single global state:
```
[Loading] ──► [Indexing] ──► [Ready] ──► [Idle]
                               │
       ┌───────────┬───────────┼───────────┬───────────┐
       ▼           ▼           ▼           ▼           ▼
  [Running]   [Building]   [Testing]   [Debugging]  [Syncing]
```

---

## 📢 Event Bus System
All key modules communicate using asynchronous decoupled events to prevent circular imports:
* **WorkspaceOpened**: Fired when directory changes. Resets Monaco, disposes terminals, starts indexers.
* **FileSaved**: Triggered by Ctrl+S. Initiates incremental reindexing and notifies language server diagnostics.
* **GitChanged**: Fired upon branch switch or git edit. Telemeters branch status to the Context Store.
* **PreviewStarted**: Connects reverse-proxy routes to local container ports.