# NSCA 2026 Session Planner

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
