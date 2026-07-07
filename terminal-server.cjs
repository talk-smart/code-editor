const os = require('os');
const http = require('http');
const { exec } = require('child_process');
const { WebSocketServer } = require('ws');
const pty = require('node-pty');
const httpProxy = require('http-proxy');

const PORT = 1422;
const sessions = new Map(); // sessionId -> { ptyProcess, socket, buffer, lastActive }
let isDockerActive = false;

// Create HTTP Server
const proxy = httpProxy.createProxyServer({});
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 1. Dynamic Preview Reverse Proxy
  if (req.url.startsWith('/preview/')) {
    // Format: /preview/:projectId/:port/path...
    const parts = req.url.split('/');
    const projectId = parts[2];
    const portStr = parts[3];
    const port = parseInt(portStr, 10);

    if (!projectId || !port) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Invalid preview URL. Expected /preview/:projectId/:port/...');
      return;
    }

    // Rewrite path to target
    const targetPath = '/' + parts.slice(4).join('/');
    req.url = targetPath;

    getTargetHost(projectId, (targetHost) => {
      proxy.web(req, res, { target: `http://${targetHost}:${port}` }, (err) => {
        console.error(`[PROXY ERROR] Failed to forward request to ${targetHost}:${port}:`, err.message);
        res.writeHead(502, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: monospace; background: #0c0f17; color: #f87171; padding: 2rem;">
              <h2>Preview Target Unreachable</h2>
              <p>Failed to connect to service on port <strong>${port}</strong> inside container <strong>${projectId}</strong>.</p>
              <p>Error: ${err.message}</p>
              <p style="color: #64748b;">Ensure your web server has started and is listening on port ${port}.</p>
            </body>
          </html>
        `);
      });
    });
    return;
  }

  // 2. Health & Docker Status Endpoint
  if (req.url === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      docker: isDockerActive,
      activeSessions: sessions.size
    }));
    return;
  }

  // 3. Exec PTY Command Endpoint
  if (req.url === '/api/exec-pty' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { sessionId, command } = JSON.parse(body);
        const session = sessions.get(sessionId);
        if (session && session.ptyProcess) {
          session.ptyProcess.write(command + '\r');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Session ${sessionId} not found` }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 4. Secure File Write API for Sandbox Volume Sync
  if (req.url === '/api/file/write' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { path, content } = JSON.parse(body);
        const fs = require('fs');
        const pathLib = require('path');
        
        const resolvedPath = pathLib.resolve(path);
        const rootPath = pathLib.resolve('.');
        
        // Basic path traversal guard
        if (!resolvedPath.startsWith(rootPath)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Access denied: Target path lies outside workspace root' }));
          return;
        }

        fs.mkdirSync(pathLib.dirname(resolvedPath), { recursive: true });
        fs.writeFileSync(resolvedPath, content, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 5. Read project workspace files list & contents recursively
  if (req.url.startsWith('/api/project/files') && req.method === 'GET') {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let targetPath = urlObj.searchParams.get('path');
    
    if (!targetPath) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'path parameter is required' }));
      return;
    }

    const fs = require('fs');
    const pathLib = require('path');
    const resolvedPath = pathLib.resolve(targetPath);
    
    try {
      if (!fs.existsSync(resolvedPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Directory not found' }));
        return;
      }

      const files = [];
      function getFilesRecursive(dir) {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const resPath = pathLib.resolve(dir, item.name);
          
          // Exclude typical heavy build directories
          if (item.name === 'node_modules' || item.name === 'target' || item.name === '.git' || item.name === '.tauri' || item.name === 'dist' || item.name === 'build') {
            continue;
          }
          
          if (item.isDirectory()) {
            getFilesRecursive(resPath);
          } else {
            const relPath = pathLib.relative(resolvedPath, resPath).replace(/\\/g, '/');
            const ext = pathLib.extname(item.name).toLowerCase();
            
            let language = 'plaintext';
            if (ext === '.rs') language = 'rust';
            else if (ext === '.js' || ext === '.jsx') language = 'javascript';
            else if (ext === '.ts' || ext === '.tsx') language = 'typescript';
            else if (ext === '.json') language = 'json';
            else if (ext === '.html') language = 'html';
            else if (ext === '.css') language = 'css';
            else if (ext === '.py') language = 'python';
            else if (ext === '.md') language = 'markdown';
            else if (ext === '.toml') language = 'toml';
            else if (ext === '.go') language = 'go';
            
            // Read content (max size 250KB to avoid memory exhaustion)
            const stats = fs.statSync(resPath);
            let content = '';
            if (stats.size < 250000) {
              content = fs.readFileSync(resPath, 'utf8');
            } else {
              content = `// File too large to load automatically (${Math.round(stats.size/1024)} KB)`;
            }

            files.push({
              name: item.name,
              path: relPath,
              language: language,
              content: content
            });
          }
        }
      }

      getFilesRecursive(resolvedPath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ files }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 6. Detect project type and compile/run scripts configurations
  if (req.url.startsWith('/api/project/detect') && req.method === 'GET') {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let targetPath = urlObj.searchParams.get('path');
    
    if (!targetPath) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'path parameter is required' }));
      return;
    }

    const fs = require('fs');
    const pathLib = require('path');
    const resolvedPath = pathLib.resolve(targetPath);
    
    try {
      const hasFile = (f) => fs.existsSync(pathLib.join(resolvedPath, f));
      let type = 'unknown';
      let runCmd = 'echo Run command undefined';
      let installCmd = 'echo Install command undefined';
      let pkgManager = 'none';

      if (hasFile('package.json')) {
        type = 'nodejs';
        pkgManager = 'npm';
        runCmd = 'npm run dev';
        installCmd = 'npm install';
      } else if (hasFile('Cargo.toml')) {
        type = 'rust';
        pkgManager = 'cargo';
        runCmd = 'cargo run';
        installCmd = 'cargo build';
      } else if (hasFile('go.mod')) {
        type = 'go';
        pkgManager = 'go';
        runCmd = 'go run .';
        installCmd = 'go mod tidy';
      } else if (hasFile('requirements.txt') || hasFile('main.py') || hasFile('app.py')) {
        type = 'python';
        pkgManager = 'pip';
        runCmd = 'python main.py';
        installCmd = 'pip install -r requirements.txt';
      } else if (hasFile('pom.xml')) {
        type = 'java-maven';
        pkgManager = 'maven';
        runCmd = 'mvn spring-boot:run';
        installCmd = 'mvn install';
      } else if (hasFile('build.gradle')) {
        type = 'java-gradle';
        pkgManager = 'gradle';
        runCmd = 'gradle bootRun';
        installCmd = 'gradle build';
      } else if (hasFile('composer.json')) {
        type = 'php';
        pkgManager = 'composer';
        runCmd = 'php -S localhost:8000';
        installCmd = 'composer install';
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ type, runCmd, installCmd, pkgManager }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 7. Get workspace Git repository status information
  if (req.url.startsWith('/api/project/git') && req.method === 'GET') {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let targetPath = urlObj.searchParams.get('path');
    
    if (!targetPath) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'path parameter is required' }));
      return;
    }

    const { execSync } = require('child_process');
    const fs = require('fs');
    const pathLib = require('path');
    const resolvedPath = pathLib.resolve(targetPath);

    try {
      if (!fs.existsSync(pathLib.join(resolvedPath, '.git'))) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ initialized: false, branch: '', status: 'Not a git repository' }));
        return;
      }

      const cmdOpts = { cwd: resolvedPath, encoding: 'utf8', timeout: 3000 };
      const branch = execSync('git branch --show-current', cmdOpts).trim();
      const status = execSync('git status -s', cmdOpts).trim();
      const diff = execSync('git diff --stat', cmdOpts).trim();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        initialized: true,
        branch,
        status: status || 'Clean working tree',
        diff
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Default Fallback
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ noServer: true });

// Handle HTTP upgrade to WebSockets (both for PTY connection and preview websocket proxying)
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/preview/')) {
    const parts = req.url.split('/');
    const projectId = parts[2];
    const port = parseInt(parts[3], 10);

    if (projectId && port) {
      req.url = '/' + parts.slice(4).join('/');
      getTargetHost(projectId, (targetHost) => {
        proxy.ws(req, socket, head, { target: `ws://${targetHost}:${port}` });
      });
    } else {
      socket.destroy();
    }
  } else {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  }
});

// Helper: Determine target IP for container or host
function getTargetHost(projectId, callback) {
  if (!isDockerActive) {
    callback('127.0.0.1');
    return;
  }

  const containerName = `antigravity-container-${projectId}`;
  exec(`docker inspect -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" ${containerName}`, (err, stdout) => {
    const ip = stdout ? stdout.trim() : '';
    if (err || !ip) {
      callback('127.0.0.1');
    } else {
      callback(ip);
    }
  });
}

// Check Docker Daemon Status
function checkDockerStatus(callback) {
  exec('docker info', (err) => {
    isDockerActive = !err;
    console.log(`[DOCKER] Daemon is ${isDockerActive ? 'ACTIVE' : 'INACTIVE (host fallback)'}`);
    if (callback) callback(isDockerActive);
  });
}

// Build custom developer workspace runner image in background
function checkAndBuildImage() {
  if (!isDockerActive) return;

  exec('docker images -q antigravity-workspace-runner', (err, stdout) => {
    if (err) return;
    if (!stdout.trim()) {
      console.log('[DOCKER] Custom image "antigravity-workspace-runner" not found. Starting build in background...');
      const buildProcess = exec('docker build -f Dockerfile.workspace -t antigravity-workspace-runner .');
      buildProcess.on('close', (code) => {
        console.log(`[DOCKER BUILD] Finished. Exit code: ${code}`);
      });
    } else {
      console.log('[DOCKER] Custom developer workspace image is cached and ready.');
    }
  });
}

// Ensure Docker Container is Active and Mounted
function ensureContainerRunning(projectId, cwd, callback) {
  if (!isDockerActive) {
    callback(null);
    return;
  }

  const containerName = `antigravity-container-${projectId}`;
  exec(`docker ps -a --filter name=${containerName} --format "{{.Status}}"`, (err, stdout) => {
    if (err) {
      callback(err);
      return;
    }

    const status = stdout ? stdout.trim() : '';

    if (status.startsWith('Up')) {
      callback(null);
    } else if (status) {
      // Restart stopped container
      exec(`docker start ${containerName}`, (startErr) => {
        callback(startErr);
      });
    } else {
      // Create and mount a new container
      exec('docker images -q antigravity-workspace-runner', (imgErr, imgStdout) => {
        const image = (imgStdout && imgStdout.trim()) ? 'antigravity-workspace-runner' : 'ubuntu:22.04';
        
        let volumePath = cwd;
        if (os.platform() === 'win32') {
          volumePath = cwd.replace(/\\/g, '/');
        }

        const runCmd = `docker run -d --name ${containerName} -v "${volumePath}":/workspace -w /workspace -m 1500m --cpus="1.0" ${image} tail -f /dev/null`;
        console.log(`[DOCKER] Creating container: ${containerName}`);
        
        exec(runCmd, (runErr) => {
          if (runErr && image === 'antigravity-workspace-runner') {
            // Fallback to plain ubuntu if custom build hasn't completed yet
            const fallbackCmd = `docker run -d --name ${containerName} -v "${volumePath}":/workspace -w /workspace -m 1500m --cpus="1.0" ubuntu:22.04 tail -f /dev/null`;
            exec(fallbackCmd, (fbErr) => callback(fbErr));
          } else {
            callback(runErr);
          }
        });
      });
    }
  });
}

// Handle client connection requests to terminal WS
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const sessionId = url.searchParams.get('sessionId');
  const cwd = url.searchParams.get('cwd') || os.homedir();
  const cols = parseInt(url.searchParams.get('cols') || '80', 10);
  const rows = parseInt(url.searchParams.get('rows') || '24', 10);

  if (!sessionId) {
    ws.close(1008, 'sessionId is required');
    return;
  }

  // Normalize project ID from cwd path folder name
  const projectFolder = cwd.split(/[\\/]/).pop() || 'default';
  const projectId = projectFolder.toLowerCase().replace(/[^a-z0-9_-]/g, '');

  console.log(`[PTY SERVER] Connect request. Session: ${sessionId}, Project: ${projectId}`);

  let session = sessions.get(sessionId);

  if (session) {
    console.log(`[PTY SERVER] Reconnecting session: ${sessionId}`);
    if (session.socket && session.socket !== ws) {
      try { session.socket.close(); } catch (e) {}
    }
    session.socket = ws;
    session.lastActive = Date.now();

    // Replay history
    if (session.buffer) {
      ws.send(JSON.stringify({ type: 'output', data: session.buffer }));
    }
  } else {
    // Ensure container exists and starts before launching PTY
    ensureContainerRunning(projectId, cwd, (err) => {
      let shellCmd = '';
      let shellArgs = [];

      if (isDockerActive && !err) {
        shellCmd = 'docker';
        shellArgs = ['exec', '-it', `antigravity-container-${projectId}`, 'bash'];
        console.log(`[PTY SERVER] Spawning container shell inside container: ${projectId}`);
      } else {
        shellCmd = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
        shellArgs = [];
        console.log(`[PTY SERVER] Spawning host shell fallback. Reason: ${err ? err.message : 'Docker inactive'}`);
      }

      try {
        const ptyProcess = pty.spawn(shellCmd, shellArgs, {
          name: 'xterm-color',
          cols: cols,
          rows: rows,
          cwd: isDockerActive && !err ? '/workspace' : cwd,
          env: process.env
        });

        session = {
          ptyProcess,
          socket: ws,
          buffer: '',
          lastActive: Date.now()
        };

        sessions.set(sessionId, session);

        ptyProcess.onData((data) => {
          session.buffer += data;
          if (session.buffer.length > 100000) {
            session.buffer = session.buffer.slice(-100000);
          }
          if (session.socket && session.socket.readyState === ws.OPEN) {
            session.socket.send(JSON.stringify({ type: 'output', data }));
          }
        });

        ptyProcess.onExit(({ exitCode }) => {
          console.log(`[PTY SERVER] Session ${sessionId} shell exited: ${exitCode}`);
          if (session.socket && session.socket.readyState === ws.OPEN) {
            session.socket.send(JSON.stringify({ type: 'exit', code: exitCode }));
            session.socket.close();
          }
          sessions.delete(sessionId);
        });

        // If Docker spawned, output status message
        if (isDockerActive && !err) {
          termWelcome(termData => {
            session.buffer += termData;
            if (session.socket && session.socket.readyState === ws.OPEN) {
              session.socket.send(JSON.stringify({ type: 'output', data: termData }));
            }
          });
        }

      } catch (spawnErr) {
        console.error(`[PTY SERVER] Failed to spawn shell:`, spawnErr);
        ws.close(1011, `Failed to spawn shell: ${spawnErr.message}`);
      }
    });
  }

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      if (session) {
        session.lastActive = Date.now();
        if (msg.type === 'input' && session.ptyProcess) {
          session.ptyProcess.write(msg.data);
        } else if (msg.type === 'resize' && session.ptyProcess) {
          session.ptyProcess.resize(msg.cols, msg.rows);
        }
      }
    } catch (err) {
      console.error(`[PTY SERVER] Message process error:`, err);
    }
  });

  ws.on('close', () => {
    console.log(`[PTY SERVER] Client socket closed: ${sessionId}`);
    if (session) {
      session.socket = null;
      session.lastActive = Date.now();
    }
  });
});

function termWelcome(writeCallback) {
  writeCallback(`\r\n\x1b[32;1m┌────────────────────────────────────────────────────────┐\x1b[0m`);
  writeCallback(`\r\n\x1b[32;1m│  🌌 ANTIGRAVITY CONTAINER SHELL INITIALIZED            │\x1b[0m`);
  writeCallback(`\r\n\x1b[32;1m│  ● Isolated Sandbox Active                             │\x1b[0m`);
  writeCallback(`\r\n\x1b[32;1m│  ● Workspace folder mounted: /workspace                │\x1b[0m`);
  writeCallback(`\r\n\x1b[32;1m└────────────────────────────────────────────────────────┘\x1b[0m\r\n\r\n`);
}

// Session Cleaner
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (!session.socket && (now - session.lastActive > 45000)) {
      console.log(`[PTY SERVER] Pruning stale session: ${sessionId}`);
      try { session.ptyProcess.kill(); } catch (e) {}
      sessions.delete(sessionId);
    }
  }
}, 10000);

// Initialize Status & Server
checkDockerStatus(() => {
  checkAndBuildImage();
  server.listen(PORT, () => {
    console.log(`[PTY SERVER] Listening on http://localhost:${PORT}`);
  });
});
