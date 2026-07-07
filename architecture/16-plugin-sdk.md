# ADR-16: Plugin SDK & Extensibility
**Status**: APPROVED  
**Author**: Antigravity Core Architect  

---

## 🎯 Purpose
Enables extending IDE panels, themes, languages, and custom AI prompt rules.

## 🔌 Extension APIs
* **registerCommand**: Binds functions to keyboard shortcuts.
* **registerTool**: Inserts new tools to the Capability Registry.
* **registerUIPanel**: Appends custom panels into the sidebars.