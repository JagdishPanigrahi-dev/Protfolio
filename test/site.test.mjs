// Checks the BUILT site in dist/ (run `npm run build` first).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(dist);
const text = files.filter((f) => /\.(html|js|css|json|webmanifest|txt|svg)$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n');

test('title, viewport and SEO meta', () => {
  assert.match(html, /<title>Jagdish Panigrahi[^<]*<\/title>/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1/);
  assert.match(html, /<meta name="description" content="[^"]{60,}"/);
  assert.match(html, /property="og:image" content="(https:\/\/[^"]+)?\.?\/og\.jpg"/);
  assert.match(html, /rel="icon" href="\.?\/favicon\.svg"/);
  assert.match(html, /rel="apple-touch-icon"/);
});

test('core content is in the HTML', () => {
  for (const s of ['Full-Stack &amp; Cloud Developer', 'AI Builder', 'Automation', 'Rether', '300+ API routes', 'Telegram bots', 'techyGuy', '@techyGuy.Official',
    'custom programming language', 'Gemini Certified Student', 'Google AI Educator Series', 'DR Nayapalli College', 'PCM + IT',
    'jagdishpanigrahi01@gmail.com', 'github.com/jagdishpanigrahi-dev', 'linkedin.com/in/jagdish-panigrahi-299b95413', '80k+']) {
    assert.ok(html.includes(s), `missing: ${s}`);
  }
  // Rether comes before the other projects
  const at = (s) => html.indexOf(`card__title">${s}<`);
  assert.ok(at('Rether') > 0 && at('Rether') < at('Telegram bots &amp; automation'));
  assert.ok(at('Telegram bots &amp; automation') < at('techyGuy'));
  assert.ok(at('techyGuy') < at('A custom programming language'));
});

test('GitHub repos come from the API snapshot', () => {
  const gh = JSON.parse(readFileSync(new URL('../src/data/github.json', import.meta.url), 'utf8'));
  assert.ok(gh.repos.length > 0);
  for (const r of gh.repos.filter((r) => r.size !== 0)) assert.ok(html.includes(`>${r.name}<`), `repo ${r.name} not shown`);
  for (const r of gh.repos.filter((r) => r.fork)) assert.ok(html.includes(r.url));
});

test('owner corrections: Aidora is 2026, no dated timeline section', () => {
  const i = html.indexOf('Aidora');
  assert.ok(i > 0);
  assert.doesNotMatch(html.slice(i, i + 200), /2024/);
  assert.match(html.slice(i, i + 200), /2026/);
  assert.doesNotMatch(html, /class="timeline/);
});

test('no phone number, no private names, no placeholders', () => {
  // his number, stored reversed so it never appears in the source as written
  const phone = '3826087548'.split('').reverse().join('');
  const digitsOnly = text.replace(/[\s-]/g, '');
  assert.ok(!digitsOnly.includes(phone), 'phone number found');
  assert.doesNotMatch(text, /\+91[\s-]?\d{5}/);
  assert.ok(!text.toLowerCase().includes(String.fromCharCode(107, 111, 110, 97, 114, 107)));
  assert.doesNotMatch(html, /\[(FULL NAME|Email|Phone|GitHub URL|LinkedIn|TODO)[^\]]*\]|lorem ipsum|TODO/i);
});

test('all local asset references exist; nothing loads from a CDN', () => {
  const refs = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map((m) => m[1]).filter((u) => !/^(https?:|mailto:)/.test(u));
  assert.ok(refs.length > 5);
  for (const u of refs) assert.ok(existsSync(join(dist, u.replace(/^\.?\//, ''))), `missing asset ${u}`);
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  for (const s of scripts) assert.doesNotMatch(s, /^https?:/);
  assert.doesNotMatch(text, /fonts\.googleapis|cdn\.jsdelivr|unpkg\.com|cdnjs/);
});

test('mobile, reduced-motion and no-WebGL fallbacks are wired', () => {
  const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(f, 'utf8')).join('');
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /\.no-webgl/);
  assert.match(css, /max-width:760px/);
  assert.ok(existsSync(join(dist, 'hero-static.webp')));
  const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(f, 'utf8')).join('');
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /no-webgl/);
});

test('total size stays under 3 MB', () => {
  const total = files.reduce((n, f) => n + statSync(f).size, 0);
  assert.ok(total < 3 * 1024 * 1024, `dist is ${total} bytes`);
});
