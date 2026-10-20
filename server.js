const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const USED_FILE = path.join(__dirname, 'used_reviews.json');

// In-memory set of used review hashes
let usedHashes = new Set();

// Load existing used reviews from disk
try {
  if (fs.existsSync(USED_FILE)) {
    const raw = fs.readFileSync(USED_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      usedHashes = new Set(parsed);
    }
  }
} catch (e) {
  console.warn('Could not read used_reviews.json:', e.message);
}

function saveUsedHashes() {
  try {
    fs.writeFileSync(USED_FILE, JSON.stringify([...usedHashes], null, 2), 'utf8');
  } catch (e) {
    console.warn('Could not save used_reviews.json:', e.message);
  }
}

const server = http.createServer((req, res) => {
  // Enable CORS so devices on local network can communicate freely
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // API 1: Return list of already used review hashes
  if (pathname === '/api/used-reviews' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([...usedHashes]));
    return;
  }

  // API 2: Mark a review as copied/used
  if (pathname === '/api/mark-used' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        if (payload.hash) {
          usedHashes.add(payload.hash);
          saveUsedHashes();
          console.log(`[Review Used] Hash: ${payload.hash} | Total used: ${usedHashes.size}`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: usedHashes.size }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Static file serving
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(__dirname, reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath);
    const contentType = ext === '.html' ? 'text/html; charset=utf-8' :
                        ext === '.js'   ? 'text/javascript; charset=utf-8' :
                        ext === '.json' ? 'application/json; charset=utf-8' :
                        ext === '.css'  ? 'text/css; charset=utf-8' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(` Finaaz Review Machine (Millions Combinations Engine) `);
  console.log(`======================================================`);
  console.log(`- On this PC:    http://localhost:${PORT}`);
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`- On your Phone: http://${net.address}:${PORT}`);
      }
    }
  }
  console.log(`- Active Used Reviews Cached: ${usedHashes.size}`);
  console.log(`======================================================\n`);
});
