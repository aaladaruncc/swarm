# 🤘 Welcome to Stagehand!

Hey! This is a project built with [Stagehand](https://github.com/browserbase/stagehand).

You can build your own web agent using: `npx create-browser-app`!

## Setting the Stage

Stagehand is an SDK for automating browsers. It's built on top of [Playwright](https://playwright.dev/) and provides a higher-level API for better debugging and AI fail-safes.

## Curtain Call

Get ready for a show-stopping development experience. Just run:

```bash
npm start
```

## What's Next?

### Add your API keys

Required API keys/environment variables are in the `.env.example` file. Copy it to `.env` and add your API keys.

```bash
cp .env.example .env && nano .env # Add your API keys to .env
```

### Custom .cursorrules

We have custom .cursorrules for this project. It'll help quite a bit with writing Stagehand easily.

### Run on Local

To run on a local browser, add your API keys to .env and change `env: "LOCAL"` to `env: "BROWSERBASE"` in [stagehand.config.ts](stagehand.config.ts).

## 🧪 Running the User Test Agent

The project includes a user testing agent that simulates real users browsing a website and generates comprehensive UX feedback reports.

### Basic Usage

```bash
npm test
```

This runs the test against the default URL with the first persona (Maria).

### Custom URL and Persona

```bash
npm test -- <URL> <persona-index>
```

**Examples:**

```bash
# Test a specific URL with default persona
npm test -- https://your-website.com

# Test with a specific persona (0, 1, or 2)
npm test -- https://your-website.com 1
```

### Available Personas

| Index | Name  | Profile |
|-------|-------|---------|
| 0 | Maria | 34yo teacher from Brazil, beginner tech user |
| 1 | James | 62yo retired factory worker, beginner tech user |
| 2 | Priya | 28yo software engineer from India, advanced tech user |

### Output

After running a test, you'll find the reports in the `sessions/<timestamp>/` folder:

- `thoughts-log.md` - Live thoughts captured during exploration
- `ux-report.md` - Comprehensive UX analysis
- `session-report.md` - Detailed session report
- `report-data.json` - Raw data for further processing
- `screenshots/` - Screenshots captured during the session
