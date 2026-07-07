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

type Handler<T> = (payload: T) => void | Promise<void>;

class EventBusClass {
  private listeners: { [K in EventType]?: Array<{ handler: Handler<any>; once: boolean }> } = {};

  subscribe<K extends EventType>(event: K, handler: Handler<EventPayloads[K]>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push({ handler, once: false });
    
    const isDev = typeof process !== "undefined" && process.env?.NODE_ENV === "development";
    if (isDev) {
      console.log(`[EVENT BUS] Subscribed to: ${event}. Total listeners: ${this.listeners[event]!.length}`);
    }

    return () => this.unsubscribe(event, handler);
  }

  once<K extends EventType>(event: K, handler: Handler<EventPayloads[K]>): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push({ handler, once: true });
  }

  unsubscribe<K extends EventType>(event: K, handler: Handler<EventPayloads[K]>): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event]!.filter(l => l.handler !== handler);
  }

  async publish<K extends EventType>(event: K, payload: EventPayloads[K]): Promise<void> {
    const isDev = typeof process !== "undefined" && process.env?.NODE_ENV === "development";
    if (isDev) {
      console.log(`[EVENT BUS] Publish event: ${event}`, payload);
    }

    const list = this.listeners[event];
    if (!list || list.length === 0) return;

    const targets = [...list];

    for (const item of targets) {
      try {
        await item.handler(payload);
      } catch (err) {
        console.error(`[EVENT BUS] Error in listener for event '${event}':`, err);
      }
      if (item.once) {
        this.unsubscribe(event, item.handler);
      }
    }
  }

  clear(): void {
    this.listeners = {};
  }
}

export const EventBus = new EventBusClass();
