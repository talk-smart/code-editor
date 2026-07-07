# ADR-06: Platform Runtime Manager
**Status**: APPROVED  
**Author**: Antigravity Core Architect  

---

## 🎯 Purpose
Detects development environments and maps core commands dynamically.

## 📋 Environment Detection Targets
* **NodeJS**: Looks for `package.json` ➔ maps `npm run dev`, `npm install`, `npm run build`.
* **Rust**: Looks for `Cargo.toml` ➔ maps `cargo run`, `cargo build`, `cargo check`.
* **Python**: Looks for `requirements.txt` / `main.py` ➔ maps `python main.py`.
* **Go**: Looks for `go.mod` ➔ maps `go run .`.
* **PHP**: Looks for `composer.json` ➔ maps `composer install`, `php -S localhost:8000`.