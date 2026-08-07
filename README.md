# Muhammad Zohaib Sarwar Portfolio

Static GitHub Pages portfolio for Muhammad Zohaib Sarwar, PhD — Senior AI/ML
Scientist focused on signal processing, acoustic analytics, predictive
maintenance, and uncertainty-aware industrial AI.

Hand-coded HTML/CSS/vanilla JS — no framework, no build step. Design inspired
by [rakehsaleem.github.io](https://rakehsaleem.github.io/) (in turn credited to
[aashnadoshi.com](https://www.aashnadoshi.com/)), reworked with a teal palette.

## Structure

- `index.html` — home: hero, intro, affiliations marquee, live stats, selected work, recent publications
- `experience.html` — experience timeline, expertise, education, languages
- `projects.html` — all projects
- `publications.html` — publications with live Scholar stats
- `contact.html` — open-to roles, consulting, contact details, mail form
- `assets/style.css` — design system (light/dark themes)
- `assets/main.js` — theme toggle, dot-grid canvas, typed line, counters, marquee, scroll reveal
- `assets/scholar.json` — citation stats, refreshed daily by `.github/workflows/scholar.yml` via `scripts/scholar_stats.py`

## Local Preview

Serve the folder (e.g. `python3 -m http.server`) and open `index.html`.
Everything works from `file://` too except the `scholar.json` fetch, which
falls back to hardcoded stats.

## Deployment

Pushed to `main` → deployed verbatim by `.github/workflows/static.yml`.
The Scholar workflow commits updated stats daily and re-triggers the deploy.
