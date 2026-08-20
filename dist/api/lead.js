const TELEGRAM_API = 'https://api.telegram.org';
const FORM_SUBMIT_API = 'https://formsubmit.co/ajax/';
const RECIPIENT = process.env.LEAD_EMAIL || 'professional-dez@yandex.ru';

function clean(value, length) {
  return String(value || '').trim().slice(0, length);
}

function send(res, status, body) {
  res.status(status).json(body);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Метод не поддерживается' });

  const name = clean(req.body && req.body.name, 100);
  const phone = clean(req.body && req.body.phone, 32);
  const address = clean(req.body && req.body.address, 200);
  if (phone.replace(/\D/g, '').length !== 11) {
    return send(res, 400, { ok: false, error: 'Укажите телефон полностью' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('[lead] Telegram is not configured');
    return send(res, 503, { ok: false, error: 'Приём заявок временно недоступен' });
  }

  const site = clean(req.headers.origin, 120) || 'СЭС';
  const fields = [
    `Новая заявка с сайта ${site}`,
    '',
    `Имя: ${name || '—'}`,
    `Телефон: ${phone}`,
    `Адрес: ${address || '—'}`,
    'Скидка: 10% (заказ с сайта)'
  ];
  const text = fields.join('\n');

  try {
    const telegram = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    const telegramBody = await telegram.json();
    if (!telegram.ok || !telegramBody.ok) throw new Error('Telegram rejected the message');

    const email = await fetch(`${FORM_SUBMIT_API}${encodeURIComponent(RECIPIENT)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: `Новая заявка с ${site}`,
        name: name || '—',
        phone,
        address: address || '—',
        discount: '10% (заказ с сайта)'
      })
    });
    if (!email.ok) console.error('[lead] Email service rejected the message:', email.status);

    return send(res, 200, { ok: true });
  } catch (error) {
    console.error('[lead] Delivery failed:', error.message);
    return send(res, 502, { ok: false, error: 'Не удалось отправить заявку' });
  }
};
