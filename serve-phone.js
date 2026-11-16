const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8080;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';

  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  });
});

function getLocalIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log('\n========================================================');
  console.log('   🎵 SYNAPSE MUSIC - PHONE WI-FI SERVER ACTIVE');
  console.log('========================================================\n');
  console.log('1. Connect your Phone to the SAME Wi-Fi as this laptop.');
  console.log('2. Open Chrome on your Phone and go to:\n');
  if (ips.length > 0) {
    ips.forEach((ip) => console.log(`   👉  http://${ip}:${PORT}`));
  } else {
    console.log(`   👉  http://localhost:${PORT}`);
  }
  console.log('\n3. Tap the Chrome menu (⋮) -> "Add to Home screen" / "Install app"!');
  console.log('\n(Keep this window open while using the local server)');
  console.log('========================================================\n');
});
