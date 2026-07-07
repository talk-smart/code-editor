import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

interface XtermTerminalProps {
  sessionId: string;
  cwd: string;
  isActive: boolean;
  themeMode: "dark" | "light";
}

export const XtermTerminal: React.FC<XtermTerminalProps> = ({
  sessionId,
  cwd,
  isActive,
  themeMode
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Configure theme based on workspace mode
    const isDark = themeMode === "dark";
    const terminalTheme = {
      background: isDark ? "#0c0f17" : "#f8fafc",
      foreground: isDark ? "#cbd5e1" : "#1e293b",
      cursor: isDark ? "#6366f1" : "#4f46e5",
      cursorAccent: isDark ? "#0c0f17" : "#ffffff",
      selectionBackground: isDark ? "rgba(99, 102, 241, 0.3)" : "rgba(79, 70, 229, 0.2)",
      black: isDark ? "#000000" : "#1e293b",
      red: "#ef4444",
      green: "#22c55e",
      yellow: "#eab308",
      blue: "#3b82f6",
      magenta: "#a855f7",
      cyan: "#06b6d4",
      white: isDark ? "#cbd5e1" : "#0f172a",
      brightBlack: isDark ? "#475569" : "#64748b",
      brightRed: "#f87171",
      brightGreen: "#4ade80",
      brightYellow: "#fef08a",
      brightBlue: "#60a5fa",
      brightMagenta: "#c084fc",
      brightCyan: "#22d3ee",
      brightWhite: isDark ? "#f8fafc" : "#0f172a"
    };

    // Initialize xterm.js instance
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      theme: terminalTheme,
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 12,
      lineHeight: 1.25,
      scrollback: 5000,
      convertEol: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    
    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Connect to PTY WebSocket server
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = "localhost:1422";
    const wsUrl = `${protocol}//${host}/?sessionId=${sessionId}&cwd=${encodeURIComponent(cwd)}&cols=${term.cols}&rows=${term.rows}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`[PTY CLIENT] WebSocket connected for session: ${sessionId}`);
      // Fit container size and dispatch resize dimensions to PTY backend
      setTimeout(() => {
        try {
          fitAddon.fit();
          ws.send(JSON.stringify({
            type: "resize",
            cols: term.cols,
            rows: term.rows
          }));
        } catch (e) {
          console.warn("Resize send failed on load:", e);
        }
      }, 100);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "output") {
          term.write(msg.data);
        } else if (msg.type === "exit") {
          term.write(`\r\n\x1b[31;1m[Terminal Process Exited with code ${msg.code}]\x1b[0m\r\n`);
        }
      } catch (e) {
        term.write(event.data);
      }
    };

    ws.onclose = (event) => {
      console.log(`[PTY CLIENT] WebSocket closed for session ${sessionId}. Code: ${event.code}`);
      if (event.code !== 1000 && event.code !== 1001) {
        term.write(`\r\n\x1b[33m[Disconnected from shell host. Reconnecting when active...]\x1b[0m\r\n`);
      }
    };

    ws.onerror = (err) => {
      console.error(`[PTY CLIENT] WebSocket error for session ${sessionId}:`, err);
      term.write(`\r\n\x1b[31;1m[Connection error: Unable to reach terminal host]\x1b[0m\r\n`);
    };

    // Forward local user keystrokes / input stream to WebSocket
    const disposableData = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }));
      }
    });

    // Resize observer to auto-fit terminal on container size shifts
    const resizeObserver = new ResizeObserver(() => {
      if (!isActive) return;
      try {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "resize",
            cols: term.cols,
            rows: term.rows
          }));
        }
      } catch (e) {
        // Suppress layout recalculation exceptions during initialization
      }
    });
    
    resizeObserver.observe(containerRef.current);

    return () => {
      disposableData.dispose();
      resizeObserver.disconnect();
      try {
        term.dispose();
      } catch (e) {}
      try {
        ws.close();
      } catch (e) {}
    };
  }, [sessionId, cwd, themeMode]);

  // Handle focus and layout fitting when tab gains active visibility focus
  useEffect(() => {
    const term = termRef.current;
    const fitAddon = fitAddonRef.current;
    const ws = wsRef.current;

    if (isActive && term && fitAddon) {
      setTimeout(() => {
        try {
          fitAddon.fit();
          term.focus();
          
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "resize",
              cols: term.cols,
              rows: term.rows
            }));
          }
        } catch (e) {
          console.warn("Resize sync failed on visibility focus:", e);
        }
      }, 60);
    }
  }, [isActive]);

  return (
    <div className={`w-full h-full overflow-hidden p-2 ${isActive ? "block" : "hidden"}`}>
      <div 
        ref={containerRef} 
        className="w-full h-full min-h-0 bg-[#0c0f17] select-text rounded-lg border border-transparent focus-within:border-indigo-500/20 transition-all duration-300"
      />
    </div>
  );
};
