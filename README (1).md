# NSCA 2026 Session Planner (NOLA)

A lightweight, offline-capable planner for the **2026 NSCA National Conference** (New Orleans, July 8–11). Browse sessions by day, flag them as Priority 1 / Priority 2 / starred, take per-session notes, and see scheduling conflicts between concurrent sessions — all saved automatically in your own browser.

> Built originally as a personal tool, now being developed into something shareable with colleagues attending the conference.

---

## Who this is for

Strength & conditioning researchers, graduate students, and practitioners attending NSCACon 2026 who want to triage a dense multi-track program down to a personal schedule, and keep notes in one place.

---

## What it does (current version)

- **Day-by-day browsing** — tabs for Wednesday through Saturday, plus a **My Schedule** view that gathers everything you've flagged.
- **Three-signal triage** — mark any session **P1**, **P2**, and/or **star** it. These are independent so you can layer them however you like.
- **Per-session notes** — a notes box on every session that autosaves as you type.
- **Conflict detection** — concurrent sessions you've both flagged are marked with a warning, since the conference runs multiple tracks at once.
- **Filters & search** — filter by session type or priority; live text search across titles, presenters, and topics.
- **Light / dark mode.**
- **Save & export** — download a JSON backup, export your plan to CSV, restore from a backup, or print / save-as-PDF.

Your selections and notes are stored locally in your browser (`localStorage`), so each person who opens the app keeps their own independent plan.

---

## How to use it

Open `index.html` in any modern browser. No install, no internet required after the first load. Your plan saves automatically on that device/browser.

---

## Data source & scope

Session data was extracted from the official NSCA National Conference 2026 schedule:
`https://www.nsca.com/events/conferences/NSCAcon/schedule/`

**Included session types:** Research, Research Lecture, Lecture (Research-tagged), Lecture (selected non-research talks of interest), Workshops (Hands-on sessions folded in), Abstract Podium Presentations, and Abstract Poster Sessions.

**Excluded by design:** Career Connection sessions, committee/SIG/PDG meetings, and social/catering/registration blocks.

**Two personal events were added manually:**
1. Your poster presentation — Friday, July 10, 1:00 PM *(date to be confirmed)*.
2. Colleague Dakota Tiede's podium presentation — Thursday, July 9, 1:30 PM.

> ⚠️ This is a personal planning aid. Always verify session times, rooms, and changes against the official on-site program.

---

## Tech notes

- Plain **HTML + CSS + JavaScript** — no framework, no build step (current version).
- Persistence via browser `localStorage`.
- Fonts loaded from Google Fonts with system-font fallbacks.

---

## Conventions for future edits (please read before changing code)

To keep this maintainable as it grows — including when using AI tools like Cursor:

1. **One change per commit.** Make a single feature or fix, test it in the browser, commit it, then move on. Avoid large multi-feature changes that are hard to review or roll back.
2. **Keep session data separate from app logic.** As the project grows, session data should live in its own data file (e.g. `data/sessions.json`), not hardcoded inside the HTML.
3. **Don't break offline use.** The app should keep working from a local file with no server.
4. **Don't lose user data.** Any change to how plans/notes are stored must preserve or migrate existing saved data. Never silently wipe `localStorage`.
5. **Accessibility floor:** visible keyboard focus, works on mobile, respects reduced-motion preferences.
6. **Write copy from the user's side of the screen** — name things by what the user does, in plain language.

## AI working notes (read this first in any new chat)

> Orientation for AI-assisted edits. If you are an AI agent working on this repo,
> read this section and the "Conventions for future edits" section before making
> any change. The codebase is the source of truth — not chat history.

### What this project is
A static, offline-capable session planner for the 2026 NSCA National Conference
(New Orleans, July 8–11). No backend, no build step, no framework. It is hosted
on GitHub Pages and must always keep working when `index.html` is double-clicked
directly from disk (`file://`).

### Current file structure
- `index.html` — HTML structure + `<link>`/`<script>` tags only.
- `styles.css` — all styling. Uses CSS variables (design tokens) for colors,
  including per-day accent colors and category badge colors. Light + dark themes
  are driven by these variables via a `data-theme` attribute.
- `data/sessions.js` — the session data, exposed as a global `window.SESSIONS`
  array. Each session object uses this schema:
  `{ id, date, day, start, end, category, title, presenter, topics, desc, sponsor, personal }`.
  Two entries have `personal: true` (the user's poster + a colleague's talk) and
  must never be removed.
- `app.js` — all application logic: rendering, day tabs, priority/star controls,
  notes, conflict detection, filters, search, theme toggle, export/import.

### How data loads (do not break this)
Data is loaded via a `<script src>` tag setting `window.SESSIONS`. Do NOT switch
to `fetch()` or load a `.json` file at runtime — browsers block `fetch` over
`file://`, which would break offline/double-click use. No external libraries,
no new dependencies, no build step.

### User data / persistence (do not lose this)
All user state is stored in the browser via `localStorage`. There are separate
keys for: (1) priorities + notes + stars, (2) the timeline-view preference, and
(3) the landing/last-view state. Any change to storage must preserve existing
saved data — never wipe or silently migrate it incorrectly. The priorities/notes
key and format are the most important to keep stable.

### How to make a change safely
1. Make ONE focused change per task. Minimal diff. Don't rewrite working code
   just to restyle it.
2. Reuse existing CSS variables, fonts, day colors, and category badges. Do not
   introduce a new design system, new fonts, or new libraries.
3. Keep all existing features and views behaving exactly as they do now unless
   the task explicitly says to change them.
4. After changes, the app must still: (a) open by double-clicking `index.html`
   offline, (b) load existing saved picks/notes intact, (c) stay responsive on
   mobile with visible keyboard focus and `prefers-reduced-motion` respected.
5. State which files you changed and how to test the result.

### Features DONE
- Day-by-day browsing (Wed–Sat) + "My Schedule" view aggregating flagged picks.
- Priority 1 / Priority 2 / star triage per session.
- Per-session notes with autosave.
- Time-conflict detection between flagged concurrent sessions.
- Type/priority filters, live search, light/dark theme.
- Export (JSON backup, CSV, print/PDF), import/restore, clear-all.
- Optional per-day timeline view (additive toggle; list view unchanged).
- Landing page ("NSCA Conference 2026 Personalized Schedule") with two entries:
  Conference Schedule (Tab 1) and My Personalized Schedule (Tab 2), over a
  code-drawn force–velocity / physiology-curve backdrop (no external images).

### Features PLANNED / IDEAS (not yet built)
- One-tap "resolve conflict" that demotes the lower-priority overlapping pick.
- Room / location field once NSCA publishes rooms.
- One-click "muscle physiology / hypertrophy / resistance training" interest
  filter tuned to the owner's research focus.
- Share-ready metadata (page title, favicon, link preview card).
- Calendar export (.ics) for Google/Apple Calendar.

### Data updates
New sessions from NSCA are added as a one-time data-refresh task (fetch the
schedule in chat, diff against `data/sessions.js`, append only missing entries
after the user confirms a proposed list). This is NOT a runtime feature — the
app never scrapes nsca.com on load.

### Known constraints / gotchas
- Static site on GitHub Pages → no server-side anything, no runtime third-party
  network calls (CORS will block them anyway).
- First load needs internet (files + Google Fonts); fully usable after that.
- Each browser/device keeps its own independent plan (by design).
- One session date is unconfirmed: the owner's poster is currently placed
  Friday July 10, 1:00 PM pending confirmation.

---

## Roadmap (ideas, not commitments)

- [ ] Restructure from single HTML file into a clean project (data separated from code).
- [ ] Per-day visual timeline/grid so overlapping sessions are obvious at a glance.
- [ ] Room / location column (once NSCA publishes rooms).
- [ ] One-tap "resolve conflict" that demotes the lower-priority overlapping pick.
- [ ] Deploy as a hosted link (GitHub Pages / Netlify / Vercel) for easy sharing.
- [ ] (Bigger) Optional shared/collaborative schedule — would require a backend.

---

## License

Personal project. Session content belongs to the NSCA. Not affiliated with or endorsed by the National Strength and Conditioning Association.
