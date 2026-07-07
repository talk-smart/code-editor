# ADR-03: Decoupled Event Bus Specification
**Status**: APPROVED  
**Author**: Antigravity Core Architect  

---

## 🎯 Purpose
Provide a lightweight, type-safe event broadcasting mechanism that removes direct dependency coupling between components in the IDE.

## 💾 Event Signature Specifications
```typescript
export type EventType = 
  | "WorkspaceLoading"
  | "WorkspaceOpened"
  | "WorkspaceChanged"
  | "WorkspaceReady"
  | "WorkspaceClosed"
  | "WorkspaceError"
  | "ActiveFileChanged"
  | "ProjectIndexed";

export interface EventPayloads {
  WorkspaceLoading: { path: string };
  WorkspaceOpened: { path: string };
  WorkspaceChanged: { path: string };
  WorkspaceReady: { path: string; filesCount: number };
  WorkspaceClosed: void;
  WorkspaceError: { path: string; error: string };
  ActiveFileChanged: { filePath: string };
  ProjectIndexed: { path: string };
}
```

---

## 🛠️ Refactoring & Integration Plan

### A. New EventBus.ts (`src/context/EventBus.ts`)
- Implement a type-safe class with methods:
  - `subscribe(event, handler)`: Registers standard listener. Returns unsubscribe handle.
  - `once(event, handler)`: One-time invocation hook.
  - `publish(event, payload)`: Asynchronously triggers all subscribers with error isolation blocks.

### B. WorkspaceManager.tsx Integration
- Publish `WorkspaceLoading` and `WorkspaceOpened` when starting loading directory.
- Publish `WorkspaceReady` once files scan and platform detection finish successfully.
- Publish `WorkspaceError` if filesystem indexing encounters directory load failures.
- Publish `WorkspaceClosed` on workspace close.
- Publish `ActiveFileChanged` when switching active focused tab buffers.

### C. UI Components Integration
- **DeveloperWorkspace.tsx**: Replace standard React dependency hooks / DOM CustomEvents with EventBus subscriptions to handle terminal session resets and AI contextual instructions compilation.