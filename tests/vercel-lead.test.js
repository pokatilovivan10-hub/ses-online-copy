const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('lead form posts directly to the selected email delivery service', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /fetch\('https:\/\/formsubmit\.co\/ajax\/professional-dez@yandex\.ru',/);
  assert.match(html, /_subject: 'Новая заявка с сэс\.site'/);
});

test('tracked source does not contain a Telegram bot token literal', () => {
  const trackedFiles = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  const botToken = /\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/;

  for (const file of trackedFiles) {
    assert.doesNotMatch(
      fs.readFileSync(path.join(root, file), 'utf8'),
      botToken,
      `${file} must not contain a Telegram bot token literal`
    );
  }
});
