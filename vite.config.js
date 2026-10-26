import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

// Build-time HTML injection: GitHub repos, skills, certifications, education and
// the security-research card are rendered from src/data/*.json straight into
// index.html, so the content is in the HTML (SEO, no-JS) and nothing is fetched
// at runtime.
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = (s = '') => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const BANNED = String.fromCharCode(107, 111, 110, 97, 114, 107);
const LANG_COLORS = { JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26', CSS: '#563d7c', Python: '#3572A5', PHP: '#4F5D95' };
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');

function blocks() {
  const gh = JSON.parse(readFileSync(new URL('./src/data/github.json', import.meta.url), 'utf8'));
  const cv = JSON.parse(readFileSync(new URL('./src/data/resume.json', import.meta.url), 'utf8'));
  const notes = JSON.parse(readFileSync(new URL('./src/data/repo-notes.json', import.meta.url), 'utf8'));
  // emoji in GitHub descriptions don't exist in the self-hosted fonts, so drop them
  const clean = (s) => String(s || '').replace(/[\p{Extended_Pictographic}\p{Co}\u{FE0F}\u{200D}]/gu, '').replace(/\s{2,}/g, ' ').trim();
  // empty repos (nothing pushed yet) are left off the page
  const shown = gh.repos.filter((r) => r.size !== 0);

  const repoCard = (r) => `
          <a class="repo glass reveal" href="${esc(r.url)}" target="_blank" rel="noopener" data-tilt data-tilt-max="8" data-cursor="Open">
            <div class="card__shine"></div>
            <div class="repo__top">
              <svg class="repo__ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.71 1.71.75.75 0 0 1-1.06 1.06A2.5 2.5 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.71A2.5 2.5 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.09a.25.25 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/></svg>
              <span class="repo__name">${esc(r.name)}</span>
              ${r.fork ? '<span class="pill">Fork</span>' : '<span class="pill pill--own">Own</span>'}
            </div>
            <p class="repo__desc">${esc(clean(r.description) || notes[r.name] || (r.fork ? 'Forked to study and learn from.' : 'Public repo on GitHub.'))}</p>
            <div class="repo__meta">
              ${r.language ? `<span><i class="dot" style="background:${LANG_COLORS[r.language] || '#EA580C'}"></i>${esc(r.language)}</span>` : ''}
              <span title="Stars">★ ${r.stars}</span>
              <span>Updated ${fmtDate(r.pushed_at)}</span>
            </div>
          </a>`;
  const repos = `
        <div class="repos">${shown.map(repoCard).join('')}
        </div>
        <p class="note reveal">Live from the GitHub API at build time (${fmtDate(gh.fetched_at)}). Forks are marked. Most of my work, Rether included, lives in private repos.</p>`;

  const skills = `
        <div class="skills__grid">${(cv.skills || []).map((s) => `
          <div class="skill glass reveal" data-tilt data-tilt-max="6">
            <h3 class="h3">${esc(s.label)}</h3>
            <ul class="chips">${s.items.split(/,\s*/).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
          </div>`).join('')}
        </div>`;

  const certs = `
            <ul class="list">${(cv.certifications || []).map((c) => `
              <li><span class="list__ico" aria-hidden="true">✦</span><div><b>${esc(c.title)}</b><span>${esc([c.issuer, c.date].filter(Boolean).join(' · '))}</span></div></li>`).join('')}
            </ul>`;

  const edu = `
            <ul class="list">${(cv.education || []).map((e) => `
              <li><span class="list__ico" aria-hidden="true">◆</span><div><b>${esc(e.school)}</b><span>${esc([e.title, e.detail, e.date].filter(Boolean).join(' · '))}</span></div></li>`).join('')}
              <li><span class="list__ico" aria-hidden="true">◆</span><div><b>Self-taught since 2024</b><span>Bots → automation → serverless → AI, learned by building</span></div></li>
            </ul>`;

  const ach = (cv.achievements || [])[0];
  const security = ach ? `
          <article class="card glass reveal" data-tilt data-cursor="Security">
            <div class="card__shine"></div>
            <span class="card__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2.5 4 5.5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10v-6z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m8.5 12 2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></span>
            <span class="badge">${esc(cv.achievements_heading || 'Security research')}</span>
            <h3 class="card__title">Responsible disclosure</h3>
            <p>${md(ach)}</p>
          </article>` : '';

  const out = { REPOS: repos, SKILLS: skills, CERTS: certs, EDU: edu, SECURITY: security };
  for (const [k, v] of Object.entries(out)) if (v.toLowerCase().includes(BANNED)) throw new Error(`banned word in ${k}`);
  return out;
}

export default defineConfig({
  base: './',
  build: { target: 'es2019', assetsInlineLimit: 0, chunkSizeWarningLimit: 800 },
  plugins: [{
    name: 'portfolio-data',
    transformIndexHtml(html) {
      const b = blocks();
      // social cards need absolute image URLs: set SITE_URL=https://your-domain when you build
      const site = (process.env.SITE_URL || '').replace(/\/$/, '');
      if (site) html = html.replace(/content="\/og\.jpg"/g, `content="${site}/og.jpg"`).replace('<meta property="og:type"', `<meta property="og:url" content="${site}/" />\n  <link rel="canonical" href="${site}/" />\n  <meta property="og:type"`);
      return html.replace(/<!--(REPOS|SKILLS|CERTS|EDU|SECURITY)-->/g, (_, k) => b[k]);
    },
  }],
});
