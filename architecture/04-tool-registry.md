# ADR-04: Capability Tool Registry
**Status**: DRAFT  
**Author**: Antigravity Core Architect  

---

## 🎯 Purpose
Provide a single registry listing all capabilities the IDE makes available to AI agents. Tools are declared declaratively rather than being hardcoded.

## 🛠️ Tool Definition Schema
Every capability must register:
* **Name**: Unique identifier (e.g. `readFile`).
* **Description**: Detailed semantic instruction for LLMs.
* **Parameters**: JSON Schema representing arguments.
* **Permissions**: Access tier required (Safe, Restrictive, Dangerous).
* **Timeout**: Limit in milliseconds before execution is aborted.
* **Sandbox**: Boolean enforcing run inside Docker container if active.
* **Supported Platforms**: Host compatibility checks (Windows, macOS, Linux).

---

## 📋 Available Tools
* **System Operations**: `readFile`, `writeFile`, `createFile`, `deleteFile`, `runCommand`, `stopCommand`.
* **VCS Operations**: `gitStatus`, `gitDiff`, `gitCommit`, `createBranch`.
* **Language Services**: `searchSymbol`, `findReferences`, `renameSymbol`, `formatDocument`.
* **Process Lifecycles**: `runTests`, `startDebugger`, `openBrowser`.