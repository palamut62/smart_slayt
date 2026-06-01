<h1 align="center">smart_slayt</h1>

<p align="center">
  AI-powered generator for crisp, on-brand <b>carousel info-cards</b> for Instagram & X (Twitter).
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%E2%89%A518-339933?style=flat&logo=node.js&logoColor=white" alt="Node >= 18" />
  <img src="https://img.shields.io/badge/Express-5-000000?style=flat&logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/Playwright-1.60-2EAD33?style=flat&logo=playwright&logoColor=white" alt="Playwright" />
  <img src="https://img.shields.io/badge/SQLite-better--sqlite3-003B57?style=flat&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/license-ISC-blue?style=flat" alt="License ISC" />
</p>

<p align="center">
  <a href="#getting-started">Getting Started</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#configuration">Configuration</a> ·
  <a href="#architecture">Architecture</a>
</p>

---

> **Why?** AI *image* generators produce blurry, misspelled text. `smart_slayt` flips the
> approach: an LLM writes only the **content (text)**, which is poured into a fixed HTML/CSS
> template and rendered to pixel-perfect **PNG cards** with Playwright. The typography is
> always sharp and readable.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Usage](#usage)
- [Design & Templates](#design--templates)
- [Testing](#testing)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Security](#security)
- [FAQ](#faq)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Features

- 🧠 **LLM content generation** — describe a topic, get a structured multi-slide deck (cover, steps, callouts) via **OpenRouter** or the **Codex CLI** provider, with automatic fallback between them.
- 📋 **Cheatsheet generator** — switch the **content type** from *Carousel* to *Cheatsheet* for dense, reference-style decks across 10 categories (usage guide, comparison, install guide, 101, commands, common mistakes, best practices, quick reference, tool summary, roadmap). Adds a dedicated `cheatsheet` template plus two dense block types: `comptable` (comparison table) and `qref` (quick-reference boxes).
- 🔎 **Multi-angle research** — before writing, the topic is researched in parallel across five intents — **YENI** (newest/changelog), **POPULER** (most-used), **IPUCU** (pro tips), **HATA** (common mistakes), **ILGINC** (surprising facts) — so cards stay concrete and well-rounded.
- 🗓️ **Recency-aware** — today's date is injected into every prompt so the model prioritizes the *last 6–12 months* (latest version, release notes, new features) instead of stale training data.
- ✅ **Fact-check pass** — a verification step cross-checks factual claims (versions, prices, commands, dates) against the research brief and corrects or softens unsupported ones, while preserving the JSON schema and copy.
- 🖼️ **Pixel-perfect rendering** — fixed HTML/CSS template rendered to **1080×1350 PNG** at 2× device scale via Playwright/Chromium. Text never blurs or misspells.
- 🎨 **7 templates × 7 palettes** — `editorial · bold · minimal · scrapbook · terminal · infocard · cheatsheet` themes; `kraft · forest · midnight · blush · ocean · sunset · noir` color palettes.
- 🌍 **Multi-language** — `tr · en · de · fr · es · it · ru · ar`, with locale-aware uppercase handling.
- 🪄 **Auto-fit layout** — content that would overflow a card is measured (after web fonts load) and scaled to fit, preventing text overlap.
- 🔖 **Logo enrichment** — relevant brand logos are fetched from the web and attached to cards automatically.
- 🗂️ **Library** — every generated set is stored in a local SQLite database; browse, re-open, delete, or download all cards as a **ZIP**.
- 🐦 **Share to X** — post a generated set directly to X/Twitter with media upload.
- 🌐 **Web UI + CLI** — a local web interface (`localhost:5179`) and a scriptable command-line workflow.

## Tech Stack

| Layer        | Technology                                             |
| ------------ | ------------------------------------------------------ |
| Runtime      | Node.js (ES Modules)                                    |
| Web server   | Express 5                                              |
| Rendering    | Playwright (Chromium), HTML/CSS template               |
| Storage      | better-sqlite3 (`smart_slayt.db`)                      |
| Packaging    | archiver (ZIP downloads)                                |
| Social       | twitter-api-v2                                          |
| AI providers | OpenRouter HTTP API · Codex CLI                         |

## Architecture

```
            topic + options
                  │
                  ▼
   ┌──────────────────────────────┐
   │  content.js / codex.js       │  ① multi-angle web research
   │  (OpenRouter  ⇄  Codex CLI)  │  ② LLM writes slide JSON
   │  recency-aware prompts       │  ③ validate + fact-check pass
   └──────────────┬───────────────┘
                  │ slides[]
                  ▼
        ┌────────────────────┐
        │  logos.js          │  fetch & attach brand logos
        └─────────┬──────────┘
                  ▼
   ┌──────────────────────────────┐
   │  render.js  +  template.html │  Playwright → PNG (1080×1350)
   │  __fit() scales to avoid     │  waits for document.fonts.ready
   │  overflow / overlap          │
   └──────────────┬───────────────┘
                  │ out/<timestamp>/slide_*.png
                  ▼
        ┌────────────────────┐
        │  db.js (SQLite)    │  persist set + cards
        └─────────┬──────────┘
                  ▼
     server.js  →  Web UI  ·  ZIP export  ·  share to X
```

## Project Structure

```
smart_slayt/
├── server.js        # Express app: settings, generate, library, ZIP, X share APIs
├── generate.js      # CLI: generate content → render PNGs
├── content.js       # OpenRouter content generation (system prompt + schema)
├── codex.js         # Codex CLI provider (alternative generator)
├── render.js        # Playwright render loop → PNG
├── template.html    # Card design (CSS), render(), palettes, templates, __fit()
├── logos.js         # Download & attach topic-related logos
├── db.js            # better-sqlite3 set/card persistence
├── config.js        # Local config load/save + key masking
├── x.js             # X/Twitter test & share (twitter-api-v2)
├── public/          # Web UI (index.html) + favicons
├── icons/           # App icons
├── out/             # Generated PNG output (gitignored)
└── config.json      # API keys & defaults (gitignored — never commit)
```

## Getting Started

### Prerequisites

- **Node.js ≥ 18**
- An **OpenRouter API key** (and/or the Codex CLI) for content generation
- *(optional)* X/Twitter API credentials for sharing

### Installation

```bash
git clone https://github.com/<your-username>/smart_slayt.git
cd smart_slayt
npm install
npx playwright install chromium
```

### Run the web UI (recommended)

```bash
node server.js
```

Open **http://localhost:5179**:

1. **⚙ Settings** — enter your OpenRouter API key (saved locally to `config.json`), pick a provider, defaults, and optionally X credentials. Use **Test Key** to verify validity and remaining credit.
2. **Generate** — enter a topic + number of steps → cards are generated, previewed, and downloadable as PNG or ZIP.

## Configuration

Settings are stored locally in `config.json` (this file is **gitignored**). Manage it via the
Settings UI rather than by hand.

| Key                 | Description                                          | Default                      |
| ------------------- | ---------------------------------------------------- | ---------------------------- |
| `apiKey`            | OpenRouter API key                                   | —                            |
| `provider`          | `openrouter` or `codex`                              | `openrouter`                 |
| `model`             | Content model (OpenRouter)                           | `deepseek/deepseek-v4-pro`   |
| `researchModel`     | Optional research/deep model (multi-angle + brief)   | `perplexity/sonar-pro`       |
| `codexModel`        | Model used by the Codex CLI provider                 | —                            |
| `x.appKey` …        | X/Twitter API credentials (4 fields)                 | —                            |
| `defaults.lang`     | `tr · en · de · fr · es · it · ru · ar`              | `tr`                         |
| `defaults.steps`    | Slides per deck (1–15)                               | `8`                          |
| `defaults.template` | `editorial · bold · minimal · scrapbook · terminal · infocard · cheatsheet` | `editorial`     |
| `defaults.palette`  | `kraft · forest · midnight · blush · ocean · sunset · noir` | `kraft`                |

### CLI environment variables

```bash
export OPENROUTER_API_KEY="sk-or-..."
export OR_MODEL="anthropic/claude-sonnet-4.5"   # optional model override
```

### Server port

```bash
PORT=8080 node server.js   # defaults to 5179
```

## Usage

### Web UI

`node server.js` → http://localhost:5179 → **Generate** tab.

### CLI

```bash
# 1) Generate a draft from a topic (arg1: topic, arg2: step count, default 8)
node generate.js "Investing 101 for beginners" 8
#    → ./out/slide_01.png …      texts → last-content.json

# 2) Render from hand-edited / sample JSON without spending API credits
node generate.js --json sample.json
node generate.js --json last-content.json
```

#### Cheatsheet mode (CLI)

Add `--mode cheatsheet` and pick a category with `--cheatsheet-type`:

```bash
node generate.js "React Hooks" 8 --mode cheatsheet --cheatsheet-type 101
node generate.js "Docker" 8 --mode cheatsheet --cheatsheet-type install-guide
```

Valid `--cheatsheet-type` values: `usage-guide · comparison · install-guide · 101 ·
commands · mistakes · best-practices · quick-reference · tool-summary · roadmap`
(default `101`). In the **web UI**, choose **Content type → Cheatsheet**, then pick a
**Cheatsheet type**; the `cheatsheet` template is auto-selected. Generated cheatsheet sets are
stored like any other set (with `type = 'cheatsheet'`) and flagged with a 📋 badge in the Library.

Render a ready-made cheatsheet sample (no API credits):

```bash
node generate.js --json sample-cheatsheet.json
```

**Recommended workflow**

1. `node generate.js "topic" 8` to draft.
2. Open `last-content.json`, hand-polish the copy (LLMs occasionally overstate).
3. `node generate.js --json last-content.json` to render the final version.
4. Upload `out/` PNGs to Instagram carousel / X.

## Design & Templates

- Colors, fonts, and layout live in `template.html` (`:root` variables + CSS).
- Inline typography markers inside copy:
  - `*word*` → **bold**
  - `_word_` → rust italic emphasis
  - `` `code` `` → code/link badge
- The slide schema is described in the system prompt inside `content.js`.
- `__fit()` waits for `document.fonts.ready` before measuring, then scales any overflowing
  card body so text never collides with the callout.

## Testing

> `TODO:` No automated test suite yet. Manual verification:

```bash
node generate.js --json sample.json             # render a known carousel deck
node generate.js --json sample-cheatsheet.json  # render a cheatsheet deck (comptable + qref)
```

## Deployment

Designed to run **locally** (Playwright needs a Chromium browser and writes PNGs to disk).
For a server deployment, ensure the host has the Playwright Chromium dependencies installed
(`npx playwright install --with-deps chromium`) and persist the `out/` directory and
`smart_slayt.db`.

## Roadmap

- [ ] Automated render snapshot tests
- [ ] Instagram direct publishing
- [ ] In-browser copy editing before render
- [ ] Additional templates & palettes

## Contributing

1. Fork and create a feature branch.
2. Keep the existing code style (ES Modules, Turkish inline comments are fine).
3. Verify renders with `node generate.js --json sample.json`.
4. Open a PR describing the change and attach before/after card screenshots for UI tweaks.

## Security

- **Never commit `config.json`** — it holds live API keys. It is gitignored by default.
- If a key is ever exposed, **rotate it immediately** (OpenRouter dashboard / X developer portal).
- API keys are masked in the UI and in API responses (`maskKey`).

## FAQ

**Why not generate the whole image with AI?**
AI image models render blurry, misspelled text. Here the AI only writes copy; rendering is
deterministic HTML/CSS → crisp typography every time.

**Do I need both OpenRouter and Codex?**
No. Either provider works; if `codex` is selected and unavailable, it falls back to
OpenRouter when an API key is present.

**Where are my decks stored?**
In the local SQLite database `smart_slayt.db`; PNGs live under `out/<timestamp>/`.

## License

Released under the **ISC License**.

## Acknowledgments

- [Playwright](https://playwright.dev/) — deterministic rendering
- [OpenRouter](https://openrouter.ai/) — model routing
- [Express](https://expressjs.com/), [better-sqlite3](https://github.com/WiseLibs/better-sqlite3), [twitter-api-v2](https://github.com/PLhery/node-twitter-api-v2)
