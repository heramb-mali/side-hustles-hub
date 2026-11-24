# 💡 SideHustle Hub

> **The ultimate student income resource** — a curated, categorised, auto-updating database of proven side hustles with full roadmaps, revenue models, difficulty ratings, and time commitments.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Static Site](https://img.shields.io/badge/Type-Static%20Site-green.svg)](#)
[![No Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen.svg)](#)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Auto-Update System](#auto-update-system)
- [Revenue Models Covered](#revenue-models-covered)
- [Side Hustles Included](#side-hustles-included)
- [Categorisation System](#categorisation-system)
- [Getting Started](#getting-started)
- [Adding a New Side Hustle](#adding-a-new-side-hustle)
- [Deployment](#deployment)
- [Roadmap](#roadmap)

---

## Overview

SideHustle Hub is a **100% static, zero-dependency** web application that provides students with a searchable, filterable personal database of income opportunities. Each entry includes a full step-by-step guide, revenue model analysis, skill requirements, tools, platforms, and curated external resources.

---

## Features

| Feature | Description |
|---|---|
| 🗃 **Personal Database** | JSON-driven data store (`data/hustles.json`) — single source of truth |
| 🔍 **Search & Filter** | Real-time search + filter by category, difficulty, sort by revenue/time/ease |
| 📊 **Categorisation** | Each hustle rated on Difficulty (Easy/Medium/Hard), Time (hrs/wk), and Scope |
| 📄 **Individual Pages** | Dedicated HTML page per hustle with full roadmap, revenue model, pros/cons |
| 🔄 **Auto-Update** | Polling mechanism checks for database version changes every 30 seconds |
| 📱 **Responsive** | Mobile-first CSS, works on all screen sizes |
| ⚡ **Zero Dependencies** | No npm, no bundler, no framework — vanilla HTML/CSS/JS only |
| 🌙 **Dark Theme** | GitHub-inspired dark colour palette |

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **HTML5** | Semantic | Page structure, accessibility |
| **CSS3** | Custom Properties | Styling, animations, responsive layout |
| **Vanilla JavaScript** | ES2020+ | DOM manipulation, fetch API, state management |

### Data Layer

| Technology | Purpose |
|---|---|
| **JSON** | Flat-file database (`data/hustles.json`) |
| **Fetch API** | Async data loading and polling for auto-updates |
| **localStorage** *(planned)* | User preferences, bookmarks |

### Tooling (Dev)

| Tool | Purpose |
|---|---|
| **VS Code** | Recommended editor |
| **Live Server** | Local development server (VS Code extension) |
| **Git** | Version control |

### Deployment Options

| Platform | Cost | Notes |
|---|---|---|
| **GitHub Pages** | Free | Ideal for static sites; push to `gh-pages` branch |
| **Netlify** | Free tier | Drag-and-drop deploy; auto-deploy from GitHub |
| **Vercel** | Free tier | Zero-config static deploy |
| **Cloudflare Pages** | Free | Fastest CDN, unlimited bandwidth |

---

## Project Structure

```
sidehustle-hub/
│
├── index.html                  # Main homepage (grid + filters)
│
├── pages/                      # One HTML file per side hustle
│   ├── freelance-web-dev.html
│   ├── content-creation.html
│   ├── tutoring.html
│   ├── dropshipping.html
│   ├── social-media-management.html
│   ├── affiliate-marketing.html
│   ├── graphic-design.html
│   ├── app-development.html
│   ├── resume-writing.html
│   └── stock-photography.html
│
├── data/
│   └── hustles.json            # 🗃 Central database — all hustle data
│
├── assets/
│   ├── css/
│   │   └── style.css           # All styles (custom properties, responsive)
│   └── js/
│       └── app.js              # Core logic: DB load, render, filter, auto-update
│
└── README.md                   # This file
```

---

## Database Schema

Each hustle entry in `data/hustles.json` follows this schema:

```json
{
  "id": "string",                  // URL-safe slug, matches pages/<id>.html
  "title": "string",
  "category": "Tech|Creative|Education|Service|Content|Finance",
  "difficulty": "Easy|Medium|Hard",
  "difficultyScore": 1 | 2 | 3,   // For sorting
  "timePerWeek": "5–10 hrs",
  "timeScore": 1 | 2 | 3,         // For sorting (1=least time)
  "startupCost": "$0–$50",
  "avgMonthlyRevenue": "$800–$3,000",
  "scope": "Medium|High|Very High",
  "scopeScore": 1–5,              // For sorting and scope bar
  "skills": ["string"],
  "tools": ["string"],
  "platforms": ["string"],
  "revenueModel": {
    "primary": "string",
    "secondary": "string",
    "upsells": ["string"]
  },
  "roadmap": ["string"],           // Ordered step-by-step guide
  "pros": ["string"],
  "cons": ["string"],
  "resources": [
    { "name": "string", "url": "https://..." }
  ],
  "badge": "emoji",
  "featured": true | false
}
```

### Top-level meta object

```json
{
  "meta": {
    "version": "1.0.0",           // Auto-update uses this for change detection
    "lastUpdated": "YYYY-MM-DD",
    "totalHustles": 10,
    "updateFrequency": "weekly"
  }
}
```

---

## Auto-Update System

The auto-update mechanism works as follows:

```
App Load
  │
  ▼
Fetch data/hustles.json  ──► Render grid + detail pages
  │
  ▼
setInterval (30 seconds)
  │
  ▼
Fetch data/hustles.json?v=<timestamp>  (cache-busted)
  │
  ├── version unchanged → do nothing
  │
  └── version changed → re-render grid, update ticker with changelog msg
```

**To trigger an update:**
1. Edit `data/hustles.json`
2. Bump `meta.version` (e.g. `"1.0.0"` → `"1.1.0"`)
3. Update `meta.lastUpdated` to today's date
4. The browser will detect the version change within 30 seconds and re-render automatically

**For production auto-updates** (fetching from a live API):
- Replace the fetch URL in `app.js → startAutoUpdate()` with your API endpoint
- The schema contract remains identical
- Optionally use a WebSocket for instant push updates

---

## Revenue Models Covered

| Hustle | Primary Model | Secondary | Passive? |
|---|---|---|---|
| Freelance Web Dev | Per-project billing | Monthly retainer | ❌ |
| Content Creation | AdSense + Sponsorships | Affiliate links | ✅ (long-term) |
| Online Tutoring | Hourly sessions | Group packages | ❌ |
| Dropshipping / POD | Product margin | Bundles | ✅ (once automated) |
| Social Media Management | Monthly retainer | Audits | ❌ |
| Affiliate Marketing | % commission per sale | Email list | ✅ |
| Freelance Graphic Design | Per-project | Retainer + Etsy templates | ✅ (templates) |
| App / SaaS Dev | Subscription (MRR) | One-time purchase | ✅ |
| Resume Writing | Per-service | Bundle packages | ❌ |
| Stock Photography | Royalties per download | Lightroom presets | ✅ |

---

## Side Hustles Included

| # | Hustle | Category | Difficulty | Scope |
|---|---|---|---|---|
| 1 | Freelance Web Development | Tech | Medium | High |
| 2 | Content Creation & YouTube | Content | Easy | Very High |
| 3 | Online Tutoring | Education | Easy | High |
| 4 | Dropshipping / Print-on-Demand | Service | Medium | Very High |
| 5 | Social Media Management | Creative | Easy | High |
| 6 | Affiliate Marketing | Finance | Medium | Very High |
| 7 | Freelance Graphic Design | Creative | Medium | High |
| 8 | App / SaaS Development | Tech | Hard | Very High |
| 9 | Resume & LinkedIn Optimization | Service | Easy | Medium |
| 10 | Stock Photography & Digital Assets | Creative | Easy | Medium |

---

## Categorisation System

### Difficulty

| Level | Score | Meaning |
|---|---|---|
| 🟢 Easy | 1 | Minimal prior skill; can start in a day |
| 🟡 Medium | 2 | Needs 1–4 weeks of prep / basic skill base |
| 🔴 Hard | 3 | Requires months of learning or prior experience |

### Time Commitment

| Level | Score | Meaning |
|---|---|---|
| Low | 1 | 3–10 hrs/week (compatible with full course load) |
| Medium | 2 | 10–20 hrs/week (manageable with planning) |
| High | 3 | 20–30 hrs/week (may affect studies) |

### Scope (Revenue Ceiling)

| Level | Score | Meaning |
|---|---|---|
| Low | 1–2 | < $500/mo ceiling |
| Medium | 3 | $500–$2,000/mo ceiling |
| High | 4 | $2,000–$10,000/mo ceiling |
| Very High | 5 | $10,000+/mo possible |

---

## Getting Started

### Option 1: Open Directly (No Server)
```
Double-click index.html
```
> ⚠ Fetch API may be blocked on `file://` protocol in some browsers. Use Option 2 for full functionality.

### Option 2: VS Code Live Server (Recommended)
```bash
1. Install "Live Server" extension in VS Code
2. Open the project folder in VS Code
3. Right-click index.html → "Open with Live Server"
4. Navigate to http://127.0.0.1:5500
```

### Option 3: Python Local Server
```bash
cd sidehustle-hub
python -m http.server 8080
# Navigate to http://localhost:8080
```

### Option 4: Node.js (npx serve)
```bash
cd sidehustle-hub
npx serve .
# Navigate to http://localhost:3000
```

---

## Adding a New Side Hustle

1. **Add an entry** to `data/hustles.json` following the schema above
2. **Create a page** at `pages/<your-id>.html` — copy any existing page and change `data-hustle="your-id"`
3. **Bump the version** in `meta.version` and update `meta.lastUpdated`
4. Done — the homepage will pick it up automatically

---

## Deployment

### GitHub Pages (Free)

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/sidehustle-hub.git
git push -u origin main
# In repo Settings → Pages → Source: main branch / root
```

### Netlify (Drag & Drop)

1. Go to [netlify.com/drop](https://app.netlify.com/drop)
2. Drag the `sidehustle-hub/` folder onto the page
3. Done — instant public URL

### Vercel

```bash
npx vercel --prod
```

---

## Roadmap

- [x] JSON database with 10 side hustles
- [x] Homepage with filter, search, sort
- [x] Individual detail pages (10 × hustle)
- [x] Revenue model breakdown per hustle
- [x] Auto-update polling mechanism
- [x] Responsive dark-theme UI
- [ ] User bookmarks (localStorage)
- [ ] "My Progress" tracker per hustle
- [ ] Comparison view (side-by-side 2 hustles)
- [ ] Submit a Hustle form (community contributions)
- [ ] Backend API (Node.js + PostgreSQL) for live CMS
- [ ] Email digest subscription (new hustles weekly)
- [ ] Earnings calculator widget per hustle

---

## License

MIT © 2026 SideHustle Hub

> Built for students who want to build financial independence alongside their studies.
