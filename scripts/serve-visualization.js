#!/usr/bin/env node
/**
 * Simple HTTP server to serve the visualization HTML file
 * This ensures WebSocket connections work properly (file:// protocol has restrictions)
 * 
 * Usage: node scripts/serve-visualization.js [port]
 */

import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const port = process.argv[2] ? parseInt(process.argv[2], 10) : 3000;
const htmlPath = join(projectRoot, 'public', 'index.html');

const server = createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    try {
      const html = readFileSync(htmlPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Error reading HTML file: ${error.message}`);
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(port, () => {
  console.log(`\n🌐 Visualization server running at:`);
  console.log(`   http://localhost:${port}`);
  console.log(`\n📡 Make sure the bot is running with WebSocket server on port 8080`);
  console.log(`   (default, or set WEBSOCKET_PORT env var)\n`);
});
