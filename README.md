# Jagdish Panigrahi · 3D portfolio

A one-page 3D portfolio built with Vite + Three.js. Everything is static. The output goes in `dist/`.

## Run it

```bash
npm install
npm run dev        # local dev server
npm run build      # pulls fresh GitHub data + resume snapshot, then builds dist/
npm run build:offline   # builds from the JSON already in src/data (no network)
npm test           # checks the built dist/ (run a build first)
```

Social cards need an absolute image URL. When you know your domain, build with it:

```bash
SITE_URL=https://your-domain.com npm run build
```

## Deploy (pick one)

- **Vercel:** import the repo, framework "Vite", build `npm run build`, output `dist`. Or drag the `dist` folder into the dashboard.
- **Netlify:** drag-and-drop the `dist` folder at app.netlify.com/drop, or build `npm run build`, publish `dist`.
- **GitHub Pages:** push the *contents* of `dist/` to a `gh-pages` branch (all paths are relative, so it also works under `/repo-name/`).

## Where things live

- `index.html`: all the text (hero, about, projects, contact).
- `src/scene.js`: the 3D scene (orb, orbiting tiles, particles, laptop, shards, camera path per section).
- `src/main.js`: loader, smooth scroll, custom cursor, tilt cards, reveals, fallbacks.
- `src/style.css`: the look (dark theme, orange→red accent, glass panels).
- `src/data/github.json`: the GitHub API snapshot, written by `scripts/fetch-data.mjs` at build time.
- `src/data/resume.json`: the skills / certifications / education snapshot (the phone number is removed on purpose).
- `src/data/repo-notes.json`: one-liners for repos that have no description on GitHub.
- `public/`: favicon, icons, og.jpg, the static hero images for reduced-motion / no-WebGL.

Repos with nothing pushed yet (size 0) are hidden automatically. Forks are labelled "Fork".

## Fallbacks

- `prefers-reduced-motion` (or `?static` in the URL): no WebGL and no smooth scroll; a still image of the scene is shown instead.
- No WebGL, or the scene fails: the same still image.
- Phones: fewer particles and shards, lower orb detail, pixel ratio capped at 1.5, no custom cursor or tilt (touch).
- Any device that runs under ~40 fps in the first 2 s drops to pixel ratio 1.

## Licences

See `LICENSES.md`.
