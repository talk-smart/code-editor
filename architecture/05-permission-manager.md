# ADR-05: Permission Manager & Security Model
**Status**: DRAFT  
**Author**: Antigravity Core Architect  

---

## 🎯 Purpose
Prevent malicious or destructive commands from running automatically. Enforces user safety and strict boundaries.

## 🔐 Security Tiers

### 1. Safe Actions (Read-Only)
* **Actions**: Reading file contents, checking git status, running searches, listing directory entries.
* **Policy**: Executed automatically without user prompting.

### 2. Restrictive Actions (Local Writes)
* **Actions**: Creating files, editing existing code buffers, installing packages via package managers.
* **Policy**: Logged in the output panel. Modifying buffers are saved in a temporary AI sandbox first.

### 3. Dangerous Actions (Executions & System Changes)
* **Actions**: Spawning terminals, running custom shell commands, deleting directories (`rm -rf`), altering system environments.
* **Policy**: Blocks execution and prompts the user with an interactive modal dialog explaining the tool, arguments, and command lines. Requires explicit click approval.