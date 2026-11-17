/**
 * Servidor HTTP simple para probar la PWA Memorama
 * Ejecutar: node server.js
 * Luego abrir http://localhost:3000/memorama/
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BASE_DIR = path.resolve(__dirname);

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Normalizar URL
    let urlPath = req.url.split('?')[0];

    // Si estamos sirviendo desde la carpeta memorama, quitar el prefijo /memorama
    if (urlPath.startsWith('/memorama/')) {
        urlPath = urlPath.substring('/memorama'.length);
    }
    if (urlPath === '/' || urlPath === '') {
        urlPath = '/index.html';
    }

    // Prevenir directory traversal
    const requestedPath = path.normalize(path.join(BASE_DIR, urlPath));
    if (!requestedPath.startsWith(BASE_DIR)) {
        res.writeHead(403);
        res.end('Acceso denegado');
        return;
    }

    // Leer archivo
    fs.readFile(requestedPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Intentar index.html para SPA
                if (urlPath.endsWith('/') || !path.extname(urlPath)) {
                    fs.readFile(path.join(BASE_DIR, 'index.html'), (err2, content2) => {
                        if (err2) {
                            res.writeHead(404);
                            res.end('No encontrado');
                        } else {
                            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                            res.end(content2);
                        }
                    });
                } else {
                    res.writeHead(404);
                    res.end('No encontrado');
                }
            } else {
                res.writeHead(500);
                res.end('Error del servidor');
            }
            return;
        }

        const ext = path.extname(requestedPath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        // Headers para PWA
        const headers = {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*'
        };

        // Headers adicionales para Service Worker
        if (urlPath.endsWith('service-worker.js')) {
            headers['Service-Worker-Allowed'] = '/';
        }

        res.writeHead(200, headers);
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 Servidor Memorama PWA iniciado`);
    console.log(`📍 Abre: http://localhost:${PORT}/memorama/`);
    console.log(`🛑 Presiona Ctrl+C para detener\n`);
});

process.on('SIGINT', () => {
    console.log('\n👋 Servidor detenido');
    process.exit(0);
});