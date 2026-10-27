// CERMAT Silent Service Runner
// Runs Next.js production server on port 3000 in background

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const projectDir = path.resolve(__dirname, '..');
const logDir = path.join(projectDir, 'data');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, 'service.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(logFile, line);
  } catch {
    // ignore
  }
}

// Check if already responding
const req = http.get('http://127.0.0.1:3000/api/health', (res) => {
  if (res.statusCode === 200) {
    log('Health check OK: CERMAT is already active on port 3000.');
    process.exit(0);
  } else {
    startNext();
  }
});

req.on('error', () => {
  startNext();
});

req.setTimeout(2000, () => {
  req.destroy();
  startNext();
});

function startNext() {
  log('Starting Next.js production server on port 3000...');
  const nextBin = path.join(projectDir, 'node_modules', 'next', 'dist', 'bin', 'next');
  const out = fs.openSync(logFile, 'a');
  const err = fs.openSync(logFile, 'a');

  const child = spawn(process.execPath, [nextBin, 'start', '-p', '3000'], {
    cwd: projectDir,
    detached: true,
    stdio: ['ignore', out, err],
    windowsHide: true,
    env: {
      ...process.env,
      PORT: '3000',
      NODE_ENV: 'production',
    },
  });

  child.unref();
  log(`CERMAT service launched in background with PID ${child.pid}`);
  process.exit(0);
}
