/**
 * Universal UI Asset Downloader
 * 
 * Descarga automáticamente todos los vídeos, miniaturas y recursos multimedia
 * a tu disco local con soporte para cabeceras de navegador, reintentos rápidos
 * y generación de mockups locales en caso de caída de CDN remoto.
 * 
 * Uso:
 *   node download-assets.js
 *   node download-assets.js --type=backgrounds
 *   node download-assets.js --type=landing-pages
 *   node download-assets.js --generate-mockups
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [k, v] = arg.replace(/^--/, '').split('=');
  acc[k] = v || true;
  return acc;
}, {});

const concurrency = parseInt(args.concurrency, 10) || 4;
const filterType = args.type || 'all'; // 'all', 'backgrounds', 'landing-pages'
const shouldGenerateMockups = args['generate-mockups'] || false;

const baseDir = __dirname;
const videosDir = path.join(baseDir, 'videos');
const lpDir = path.join(videosDir, 'landing-pages');
const bgDir = path.join(videosDir, 'backgrounds');

[videosDir, lpDir, bgDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Cargar listas
const lpList = JSON.parse(fs.readFileSync(path.join(baseDir, 'video-catalog.json'), 'utf8'));
const bgList = JSON.parse(fs.readFileSync(path.join(baseDir, 'background-videos.json'), 'utf8'));

// Modo Generación de Mockups Locales
if (shouldGenerateMockups) {
  console.log('🎨 Generando mockups vectoriales locales para cada componente...');
  let genCount = 0;
  lpList.forEach(item => {
    const ext = '.svg';
    const cleanTitle = item.title.replace(/[/\\?%*:|"<>]/g, '_').trim();
    const filename = `${item.id}_${cleanTitle}${ext}`;
    const dest = path.join(lpDir, filename);

    if (!fs.existsSync(dest)) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480">
        <rect width="100%" height="100%" fill="#0d1117"/>
        <circle cx="700" cy="80" r="220" fill="rgba(99,102,241,0.15)"/>
        <circle cx="100" cy="400" r="180" fill="rgba(255,67,113,0.12)"/>
        <text x="50" y="200" fill="#ff4371" font-family="system-ui, sans-serif" font-size="16" font-weight="700" letter-spacing="3">${(item.category || 'UI SECTION').toUpperCase()}</text>
        <text x="50" y="250" fill="#ffffff" font-family="system-ui, sans-serif" font-size="32" font-weight="800">${item.title}</text>
        <text x="50" y="290" fill="#9ca3af" font-family="system-ui, sans-serif" font-size="16">SceneAI &amp; VibeCoding Master Component</text>
        <rect x="50" y="330" width="120" height="38" rx="19" fill="#ff4371"/>
        <text x="82" y="354" fill="#ffffff" font-family="system-ui, sans-serif" font-size="13" font-weight="600">PREVIEW</text>
      </svg>`;
      fs.writeFileSync(dest, svg, 'utf8');
      genCount++;
    }
  });
  console.log(`✅ Se han generado ${genCount} mockups locales en ${lpDir}`);
  process.exit(0);
}

let queue = [];

if (filterType === 'all' || filterType === 'landing-pages') {
  lpList.forEach(item => {
    if (item.videoUrl) {
      const ext = path.extname(new URL(item.videoUrl).pathname) || '.mp4';
      const cleanTitle = item.title.replace(/[/\\?%*:|"<>]/g, '_').trim();
      const filename = `${item.id}_${cleanTitle}${ext}`;
      queue.push({
        url: item.videoUrl,
        dest: path.join(lpDir, filename),
        name: `[Landing Page] ${item.title}`
      });
    }
  });
}

if (filterType === 'all' || filterType === 'backgrounds') {
  bgList.forEach(item => {
    if (item.videoUrl) {
      const ext = path.extname(new URL(item.videoUrl).pathname) || '.mp4';
      const cleanTitle = item.title.replace(/[/\\?%*:|"<>]/g, '_').trim();
      const filename = `${item.id}_${cleanTitle}${ext}`;
      queue.push({
        url: item.videoUrl,
        dest: path.join(bgDir, filename),
        name: `[Background] ${item.title}`
      });
    }
  });
}

console.log(`\n======================================================`);
console.log(`🎬 UI Asset Downloader`);
console.log(`Total de archivos en cola: ${queue.length}`);
console.log(`Carpeta de destino: ${videosDir}`);
console.log(`Concurrencia: ${concurrency}`);
console.log(`💡 Nota: Si el servidor remoto de SceneAI (cdn.sceneai.art)`);
console.log(`   está en mantenimiento o bloquea conexiones, los elementos`);
console.log(`   fallarán rápido sin colgar tu terminal (timeout de 6s).`);
console.log(`   Puedes generar mockups locales con: node download-assets.js --generate-mockups`);
console.log(`======================================================\n`);

let completed = 0;
let failed = 0;
let index = 0;

function downloadFile(task) {
  return new Promise((resolve) => {
    if (fs.existsSync(task.dest)) {
      const stats = fs.statSync(task.dest);
      if (stats.size > 1024) {
        console.log(`⏩ [Ya existe] ${task.name}`);
        completed++;
        return resolve();
      }
    }

    const file = fs.createWriteStream(task.dest);
    const client = task.url.startsWith('https') ? https : http;

    console.log(`⬇️ Descargando: ${task.name}...`);

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://sceneai.art/',
        'Accept': '*/*'
      }
    };

    const req = client.get(task.url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        if (fs.existsSync(task.dest)) fs.unlinkSync(task.dest);
        task.url = res.headers.location;
        return downloadFile(task).then(resolve);
      }

      if (res.statusCode !== 200) {
        console.error(`❌ HTTP ${res.statusCode}: ${task.name}`);
        file.close();
        if (fs.existsSync(task.dest)) fs.unlinkSync(task.dest);
        failed++;
        return resolve();
      }

      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          completed++;
          console.log(`✅ [${completed}/${queue.length}] Guardado: ${path.basename(task.dest)}`);
          resolve();
        });
      });
    });

    req.on('error', (err) => {
      console.error(`❌ Fallo de red en ${task.name}: ${err.message}`);
      file.close();
      if (fs.existsSync(task.dest)) fs.unlinkSync(task.dest);
      failed++;
      resolve();
    });

    // Timeout rápido para no colgar la terminal
    req.setTimeout(6000, () => {
      console.error(`⏱️ Timeout (Servidor CDN no responde): ${task.name}`);
      req.destroy();
      file.close();
      if (fs.existsSync(task.dest)) fs.unlinkSync(task.dest);
      failed++;
      resolve();
    });
  });
}

async function worker() {
  while (index < queue.length) {
    const task = queue[index++];
    await downloadFile(task);
  }
}

async function start() {
  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  console.log(`\n🎉 Descarga finalizada.`);
  console.log(`Completados: ${completed}`);
  console.log(`Fallidos / Omitidos: ${failed}`);
}

start();
