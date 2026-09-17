import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.geojson': 'application/geo+json', '.glb': 'model/gltf-binary', '.json': 'application/json' };
const port = Number(process.env.PORT) || 4173;
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(root) || pathname.split('/').some(part => part.startsWith('.')) || !types[path.extname(file)]) {
      res.writeHead(403).end(); return;
    }
    const body = await fs.readFile(file);
    res.setHeader('Content-Type', types[path.extname(file)]);
    res.end(body);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Play at http://127.0.0.1:${port}/`));
