// Build-time data step. Pulls Jagdish's public GitHub profile + repos from the
// GitHub REST API and a sanitized snapshot of his resume, and writes them as
// static JSON into src/data/. Nothing is fetched at runtime by the site.
// If the network is down, the committed JSON files are kept as they are.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const USER = 'jagdishpanigrahi-dev';
const API = 'https://api.github.com';
const RESUME = process.env.RESUME_JSON || '/home/user/tab/files/resume/resume.json';
const OUT = new URL('../src/data/', import.meta.url);

async function gh(path) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(API + path, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'jagdish-portfolio-build', Accept: 'application/vnd.github+json' },
    });
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

async function github() {
  try {
    const user = await gh(`/users/${USER}`);
    const repos = await gh(`/users/${USER}/repos?per_page=100&sort=updated`);
    const pick = repos.map((r) => ({
      name: r.name,
      url: r.html_url,
      description: r.description || '',
      language: r.language || null,
      stars: r.stargazers_count,
      forks: r.forks_count,
      fork: r.fork,
      homepage: r.homepage || '',
      size: r.size,
      topics: r.topics || [],
      pushed_at: r.pushed_at,
      created_at: r.created_at,
    }));
    // his own repos first, then forks; newest push first inside each group
    pick.sort((a, b) => (a.fork - b.fork) || (b.pushed_at || '').localeCompare(a.pushed_at || ''));
    const data = {
      fetched_at: new Date().toISOString(),
      source: `${API}/users/${USER}/repos`,
      user: {
        login: user.login,
        url: user.html_url,
        public_repos: user.public_repos,
        followers: user.followers,
        created_at: user.created_at,
      },
      repos: pick,
    };
    await writeFile(new URL('github.json', OUT), JSON.stringify(data, null, 2) + '\n');
    console.log(`github: ${pick.length} repos written`);
  } catch (e) {
    console.warn(`github: fetch failed (${e.message}); keeping src/data/github.json`);
  }
}

const strip = (s) => (typeof s === 'string' ? s : s);
async function resume() {
  if (!existsSync(RESUME)) {
    console.warn(`resume: ${RESUME} not found; keeping src/data/resume.json`);
    return;
  }
  const r = JSON.parse(await readFile(RESUME, 'utf8'));
  // never ship the phone number on the public site
  delete r.phone;
  delete r._how_to;
  delete r.contact_layout;
  delete r.settings;
  const text = JSON.stringify(r, null, 2);
  const banned = String.fromCharCode(107, 111, 110, 97, 114, 107); // private language name
  if (text.toLowerCase().includes(banned)) throw new Error('resume snapshot contains a private name');
  await writeFile(new URL('resume.json', OUT), text + '\n');
  console.log('resume: snapshot written (phone removed)');
}

await github();
await resume();
