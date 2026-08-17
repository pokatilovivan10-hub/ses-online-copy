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
  "fetch('/api/lead',",
  "window.location.href = '/thanks';",
  'mc.yandex.ru/metrika/tag.js?id=111540212',
  "ym(111540212, 'init'",
  'Уничтожение клопов и тараканов</a>',
  'Высокая температура пара уничтожает яйца и личинки клопов и тараканов',
  'Комплексная барьерная защита от проникновения насекомых',
  'Лицензия № Л064-00111-50/02006211',
  'от 1 990 ₽',
  'от 2 490 ₽',
  'от 3 190 ₽',
  '© 2011-2026 СЭС Москва. Все права защищены.',
  'ИП Репников Алексей Андреевич. ОГРН: 322508100080737',
  '.cta-form .btn{background:var(--navy);color:#fff;white-space:nowrap}'
];

for (const page of ['index.html', path.join('dist', 'index.html')]) {
  test(`${page} contains the requested contact and conversion updates`, () => {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const content of expectedContent) assert.ok(html.includes(content), `${page} is missing: ${content}`);
    assert.doesNotMatch(html, /gudok\.tel|GudokData|k9e3j6xpn5/i, `${page} must not load Gudok`);
    assert.doesNotMatch(html, /\/api\/lead\.php/, `${page} must use the canonical /api/lead endpoint`);
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

test('deployment configuration keeps the .site domain reachable before SSL is issued', () => {
  for (const cNameFile of ['CNAME', path.join('dist', 'CNAME')]) {
    const cName = fs.readFileSync(path.join(root, cNameFile), 'utf8').trim();
    assert.equal(cName, 'xn--q1aa9a.site', `${cNameFile} must point to сэс.site`);
  }

  for (const htaccessFile of ['.htaccess', path.join('dist', '.htaccess')]) {
    const htaccess = fs.readFileSync(path.join(root, htaccessFile), 'utf8');
    assert.match(htaccess, /^Options -Indexes$/m);
    assert.match(htaccess, /^RewriteRule \^thanks\/\?\$ thanks\.html \[L\]$/m);
    assert.match(htaccess, /^RewriteRule \^api\/lead\/\?\$ api\/lead\.php \[L\]$/m);
    assert.doesNotMatch(htaccess, /https:\/\/|\.online/i, `${htaccessFile} must not redirect to the old domain or force HTTPS`);
  }

  assert.equal(
    fs.readFileSync(path.join(root, 'dist', 'api', 'lead.php'), 'utf8'),
    fs.readFileSync(path.join(root, 'api', 'lead.php'), 'utf8'),
    'build output must include the Apache lead handler'
  );

  const boot = fs.readFileSync(path.join(root, 'dist', 'boot.js'), 'utf8');
  assert.match(boot, /if \(urlPath === '\/thanks'\) urlPath = '\/thanks\.html';/);
  assert.match(boot, /p === '\/api\/lead'/);

  const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
  assert.match(dockerfile, /COPY api \.\/api/, 'Docker build must include the source Apache handler');
});
