const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const expectedContent = [
  'href="tel:+79167566424">8(916) 756 64-24</a>',
  'Цены на уничтожение клопов и тараканов в квартире и частных домах',
  'Квартира до 60 м²',
  'Квартира до 100 м²',
  'Дом 100–200 м²',
  'professional-dez@yandex.ru',
  'Уничтожение клопов и тараканов в квартире и доме',
  'Вызвать дезинфектора со скидкой',
  "window.location.href = '/thanks.html';"
];

for (const page of ['index.html', path.join('dist', 'index.html')]) {
  test(`${page} contains the requested contact and conversion updates`, () => {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const content of expectedContent) assert.ok(html.includes(content), `${page} is missing: ${content}`);
  });
}

for (const page of ['thanks.html', path.join('dist', 'thanks.html')]) {
  test(`${page} is a centered thank-you page`, () => {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.match(html, /Спасибо за заявку, наш менеджер свяжется с вами в течении 5 минут/);
    assert.match(html, /background:\s*#fff/);
    assert.match(html, /display:\s*grid/);
  });
}
