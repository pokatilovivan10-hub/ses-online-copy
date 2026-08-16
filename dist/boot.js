// Входная точка сервера СЭС Москва (требуется загрузчиком платформы: /code/bootstrap -> dist/boot.js)
const http = require('http');
const fs = require('fs');
const path = require('path');

/* Поддержка запуска с флагами: node dist/boot.js --host 0.0.0.0 --port 3000 */
function argValue(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const PORT = parseInt(argValue('--port') || process.env.PORT || '3000', 10);
const HOST = argValue('--host') || process.env.HOST || '0.0.0.0';

/* Telegram credentials must be configured only as deployment secrets. */
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const TG_API = 'https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage';

/* Статика лежит рядом с boot.js в dist/ */
const PUBLIC_DIR = __dirname;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

async function tgFetch(url, timeoutMs, options) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs || 12000);
  try {
    return await fetch(url, Object.assign({}, options || {}, { signal: ctrl.signal }));
  } finally {
    clearTimeout(t);
  }
}

async function sendTelegram(text) {
  try {
    const r = await tgFetch(TG_API, 6000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text: text, parse_mode: 'HTML' })
    });
    const d = await r.json();
    if (d.ok) return { ok: true };
    console.error('[tg] Прямой запрос отклонён:', d.description);
    return { ok: false, error: d.description };
  } catch (e) {
    console.error('[tg] Прямой запрос недоступен:', e.message);
    return { ok: false, error: e.message };
  }
}

/* Приём заявки с формы */
function handleLead(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 10 * 1024) req.destroy();
  });
  req.on('end', async () => {
    try {
      const data = JSON.parse(body || '{}');
      const name = String(data.name || '').trim().slice(0, 100);
      const phone = String(data.phone || '').trim().slice(0, 32);
      const address = String(data.address || '').trim().slice(0, 200);

      if (phone.replace(/\D/g, '').length !== 11) {
        return sendJson(res, 400, { ok: false, error: 'Укажите телефон полностью' });
      }
      if (!TG_TOKEN || !TG_CHAT_ID) {
        return sendJson(res, 500, { ok: false, error: 'Не удалось отправить заявку' });
      }

      const text =
        '🪳 <b>Новая заявка с сайта СЭС Москва</b>\n\n' +
        '<b>Имя:</b> ' + (escapeHtml(name) || '—') + '\n' +
        '<b>Телефон:</b> ' + escapeHtml(phone) + '\n' +
        '<b>Адрес:</b> ' + (escapeHtml(address) || '—') + '\n' +
        '<b>Скидка:</b> 10% (заказ с сайта)';

      const tg = await sendTelegram(text);
      if (!tg.ok) {
        console.error('[lead] Не отправлено:', tg.error);
        return sendJson(res, 502, { ok: false, error: 'Не удалось отправить заявку' });
      }
      console.log('[lead] Заявка отправлена:', phone);
      sendJson(res, 200, { ok: true });
    } catch (e) {
      console.error('[lead] Ошибка:', e);
      sendJson(res, 400, { ok: false, error: 'Некорректный запрос' });
    }
  });
}

/* Раздача статики */
function serveStatic(req, res) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0]);
  } catch (e) {
    res.writeHead(400);
    return res.end('Bad request');
  }
  if (urlPath === '/') urlPath = '/index.html';
  if (urlPath === '/thanks') urlPath = '/thanks.html';
  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Страница не найдена');
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    if (ext !== '.html') headers['Cache-Control'] = 'public, max-age=86400';
    res.writeHead(200, headers);
    res.end(content);
  });
}

/* Диагностика: GET /api/health — проверка, что сервер жив */
function handleHealth(req, res) {
  sendJson(res, 200, { ok: true, service: 'ses-moscow', time: new Date().toISOString() });
}

http.createServer((req, res) => {
  const p = req.url.split('?')[0];
  if (req.method === 'POST' && p === '/api/lead') return handleLead(req, res);
  if (req.method === 'GET' && p === '/api/health') return handleHealth(req, res);
  if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
  res.writeHead(405);
  res.end();
}).listen(PORT, HOST, () => {
  console.log('СЭС Москва запущен: http://' + HOST + ':' + PORT);
});
