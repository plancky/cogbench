# CogBench: Product Requirements Document

| | |
|---|---|
| **Product** | CogBench, a personal cognitive benchmark suite |
| **Status** | v0.1 implemented (this document describes the built behaviour) |
| **Last updated** | 2026-10-19 |
| **Platform** | Local web app (React + Vite client, Hono on Bun, SQLite via `bun:sqlite`) |

---

## 1. Overview

CogBench is a self-hosted web app for measuring and tracking **your own** memory and attention over
time. It runs six short, well-established cognitive tasks, stores each session in a local SQLite
database, and shows trends against your personal baseline.

It is a **self-tracking tool, not a diagnostic instrument.** Scores are not normed and must not be
compared with other people or with clinical cut-offs.

### 1.1 Problem

People who want to see how sleep, exercise, caffeine, training or habits affect their cognition lack
a simple, private, repeatable way to measure it. Online "brain tests" are inconsistent, ad-laden,
store data elsewhere, and often have imprecise timing.

### 1.2 Goals

1. **Repeatable measurement**: the same tasks, rules and timing every session.
2. **Accurate timing**: reaction times are not distorted by UI framework overhead.
3. **Low friction**: a daily check of about 6 minutes and a weekly benchmark of about 15–20 minutes.
4. **Private by default**: data lives in one local SQLite file, and the server binds to localhost.
5. **Meaningful progress views**: trends versus your own baseline, direction-aware (for reaction
   times, lower is better).
6. **Portable data**: a spreadsheet row export, CSV, and JSON backup/restore.

### 1.3 Non-goals

- Diagnosis, screening, or any medical claim.
- Population norms, percentiles, or comparison with other users.
- Multi-user accounts, authentication, or cloud sync.
- Gamification (streaks, badges, leaderboards).
- A native mobile app (the web app is responsive down to phone width instead).

### 1.4 Target user

A single person, usually technical, running the app on their own machine and optionally opening it
from a phone on the home LAN. They value consistency and data ownership over polish.

---

## 2. Product principles

| Principle | What it means in practice |
|---|---|
| **Compare only to yourself** | Every progress view is relative to *your* baseline (the mean of your first 3 sessions). |
| **Practice effects are expected** | The first 3 sessions form the baseline; the UI says this in the Notes. |
| **Timing over flourish** | Test screens are plain, with no animations or transitions, and are driven outside React. |
| **Nothing is lost** | Results are saved only after a test ends. Failed saves are queued locally and retried. |
| **Direction-aware everywhere** | "Better" arrows, % change and the progress charts all account for lower-is-better metrics. |
| **Accessible** | Usable by keyboard. Charts have text summaries and hidden data tables, and never rely on colour alone. |

---

## 3. Test battery

Six test *flows* across two areas produce seven result *series*. Word Recall produces both an
immediate and a delayed series.

| # | Test | Area | Construct | Cadence | Series | Score | Better | Approx. time |
|---|---|---|---|---|---|---|---|---|
| 1 | Digit Span | Memory | Short-term and working memory | Daily | `digit_span` | forward span + backward span | Higher | 3–5 min |
| 2 | Corsi Span | Memory | Visual-spatial memory | Weekly | `corsi` | longest correct span | Higher | 3–5 min |
| 3 | 2-back | Memory | Working memory updating | Weekly | `nback` | hit % − false-alarm % | Higher | 2–3 min |
| 4a | Word Recall, immediate | Memory | Episodic encoding and recall | Weekly | `word_immediate` | words recalled /20 | Higher | ~3 min |
| 4b | Word Recall, delayed | Memory | Long-term retention | ≥24 h later (ideally 7 days) | `word_delayed` | words recalled /20 | Higher | ~2 min |
| 5 | Psychomotor Vigilance (PVT) | Focus | Sustained attention | Daily | `pvt` | median RT (ms) | Lower | ~2 min |
| 6 | Stroop | Focus | Selective attention and inhibition | Daily | `stroop` | mean RT on correct trials (ms) | Lower | ~2 min |

### 3.0 Common behaviour for every test

- **Instruction screen** before each test: the title, estimated duration, numbered steps, and a
  reminder to use the same device in a quiet spot. The Start button gets focus automatically.
- **Result screen** after each test: the headline score, a breakdown, and the save status (Saving…,
  Saved, saved locally and will retry, or not saved with the reason).
- **Quit:** `Esc` aborts the running test at any point. Nothing is saved, and you return home with a toast.
- **Header hidden** while a test runs, to reduce distraction.
- **Interstitials** inside a test (for example "Start practice", "Start test") accept Space, Enter,
  or a click.
- **No network calls** while a test runs. The only exception is Word Recall, which fetches its list
  *before* the study phase starts.

---

### 3.1 Digit Span

**Purpose.** Measures how many digits you can hold (forward) and mentally manipulate (backward).

**Procedure.**
1. **Forward phase.** An interstitial explains it: "type the digits in the order shown".
2. Each trial: a 600 ms blank, then digits shown one at a time, **800 ms on and 200 ms off**
   (1 digit per second), in a large centred display.
3. After the last digit, a numeric text input appears, labelled with the phase, length and attempt
   number. Submit with Enter or the Submit button.
4. **Backward phase.** The same procedure, but you type the digits in reverse order.

**Sequence rules.**
- Random digits 0–9, **no immediate repeats** (for example `3 3` never appears).
- Non-digit characters in the answer are ignored (`3 2,1` is read as `321`).

**Adaptive staircase** (each phase separately):
- Start at **length 3**, with **two attempts per length**.
- **Any success advances** to length + 1, resetting the attempt counter.
- **Two failures at the same length end the phase.**
- The maximum length is 12. Passing it also ends the phase.
- There is no per-trial correctness feedback.

**Scoring.**
- *Span* = the longest length answered correctly in that phase (0 if none).
- **Score = forward span + backward span.**

**Stored fields (`extra`).** `forward`, `backward`, and `trials[]`, where each trial records
`{ phase, length, sequence, answer, correct }`.

---

### 3.2 Spatial Span (Corsi)

**Purpose.** The visual-spatial counterpart of digit span.

**Procedure.**
1. An interstitial explains the task.
2. A **3×3 grid** of squares. Each trial: a 700 ms pause, then squares flash in sequence, **600 ms
   lit with a 300 ms gap** between them.
3. Then you select the squares in the same order by click or tap, or with **keys 1–9** (row by row,
   top-left = 1). Each selection flashes briefly (120 ms) as feedback, and a counter shows
   `n / length`.
4. The trial is scored as soon as the required number of squares has been selected.

**Sequence rules.** Squares are randomly ordered with **no square repeated within a sequence**.

**Adaptive staircase.** Same as Digit Span: start at 3, two attempts per length, advance on any
success, end after two failures at one length. The maximum length is 9 (the grid size).

**Scoring.** **Score = longest correct span.**

**Stored fields.** `trials[]` with `{ phase: "spatial", length, sequence, answer, correct }`.

---

### 3.3 2-back

**Purpose.** Measures working-memory updating: continuously comparing the current item with the
one two steps earlier.

**Stimuli.** 19 consonants (`B C D F G H J K L M N P Q R S T V X Z`). Vowels are excluded so letters
can't form words.

**Procedure.**
1. **Practice block: 10 trials with feedback, not scored.** After each trial's response window,
   feedback shows for 500 ms when relevant: "✓ Hit", "✗ Missed a match", or "✗ Not a match".
2. An interstitial: "Practice done…".
3. **Test block: 45 trials, no feedback.**
4. Each trial: a letter shown for **500 ms**, then a **1500 ms blank** (2 s per trial).
5. Press **Space** or **tap the stage** when the letter matches the one two back. The response window
   is the full 2000 ms from the letter's onset, and only the first press per trial counts.

**Stream generation.**
- **Exactly round(N/3) targets** (15 of 45), placed at random positions from trial 3 onwards. The
  first two trials can never be targets.
- Non-target letters never equal the letter 2 back (no accidental targets) or the letter 1 back
  (no 1-back lures).
- Target status for scoring is recomputed from the letters themselves.

**Scoring.**
- Hit rate = hits / targets × 100. False-alarm rate = false alarms / non-targets × 100.
- **Score = hit rate − false-alarm rate**, range −100 to +100, rounded to 0.1.
- If there are no targets or no non-targets, the corresponding rate is 0.

**Stored fields.** `hits`, `misses`, `falseAlarms`, `correctRejections`, `hitRate`,
`falseAlarmRate`, and `trials[]` with `{ letter, isTarget, responded, rt }`, where `rt` is in ms
from onset, or null.

---

### 3.4 Delayed Word Recall

**Purpose.** Measures encoding and immediate free recall, then retention over a delay of a day or more.

#### Word pool and list creation
- A built-in pool of **365 common, concrete, easy-to-picture nouns** (apple, anchor, lighthouse,
  violin…).
- `POST /api/wordlists`: the **server** picks **20 random words never used in any earlier list**. In
  the same transaction it records them in `used_words` and saves the list with a server timestamp.
- When fewer than 20 unused words remain, the API returns **409 "word pool exhausted"**. That is
  18 lists, roughly 18 weeks of weekly use.

#### Immediate session
1. **Study:** an interstitial, then each word shown for **3 s**, with a `n / 20` counter.
2. **Distractor (60 s):** "Count backwards by 7 from *N*", where N is random from 300 to 999. Count
   aloud or type into an optional field (not scored). A countdown is shown, and the screen moves on
   automatically when time is up.
3. **Free recall:** a textarea, one word per line (commas also separate words). There is a live count
   of words entered. Submit with the button or Ctrl/⌘+Enter.
4. **Result:** the score /20, the words recalled, and a note that delayed recall unlocks tomorrow,
   ideally on a date 7 days later.

#### Delayed session
- The **Home → Word lists** panel lists every saved list that hasn't been recalled yet, with its
  study time and immediate score:
  - a list is **locked** until `created_at + 24 h`, using **server time**, and shows "Unlocks *date
    time*";
  - an **unlocked** list shows a **Delayed recall** button.
- The panel prompts: *"Study a new list now, recall it in 7 days."*
- The delayed session has an instruction screen (it shows when the list was studied), then the free
  recall textarea, then the result: score /20, **days elapsed** (to 1 decimal), and the words recalled.
- Each list can be recalled **once**. Repeat attempts and attempts on a locked list return **409**.
- Pending-list responses never include the words, so the list can't be previewed.

#### Matching rules (immediate and delayed)
- Answers are trimmed and **case-insensitive**.
- **Duplicates are ignored**, and each target word can be credited at most once.
- **Spelling tolerance:** a guess within **1 Levenshtein edit** counts, **only for target words of 5
  or more letters** (for example `candl` → candle, `pian` → piano, but not `lamb` → lamp).
  A transposition counts as 2 edits and is rejected.
- Exact matches are credited before fuzzy matches, so a near-miss can't steal another word's credit.
- Scoring is done on the server (authoritative) and mirrored on the client for instant display.

**Stored data.**
- `word_lists` row: `immediate_score`, `recalled_at`, `delayed_score`, `days_elapsed`.
- Result series `word_immediate` and `word_delayed`, with `extra = { listId, recalled[], daysElapsed? }`.

---

### 3.5 Psychomotor Vigilance Task (PVT)

**Purpose.** Sustained attention and reaction speed; it is sensitive to sleep loss and fatigue.

**Procedure.**
1. An interstitial explains the task.
2. **20 trials.** Each trial: a blank screen showing "Trial n of 20", then after a **random delay of
   2–8 s (uniform)** a large **millisecond counter** appears and counts up.
3. Press **Space** or **tap anywhere on the stage** as fast as possible. The counter freezes on your
   RT for 1 s, with "Lapse (>500 ms)" shown if it applies.
4. **False start:** pressing before the counter appears shows "Too soon! Wait for the counter." for
   1.2 s. **The trial restarts with a new random delay**, and the false start does not use up a trial.
5. **Timeout:** with no response 30 s after onset, the trial is recorded as a 30 000 ms RT, which
   counts as a lapse.

**Scoring.**
- **Score = median RT** (ms, rounded).
- Also: mean RT, **lapses** (RT > 500 ms), and **false starts**.

**Stored fields.** `median`, `mean`, `lapses`, `falseStarts`, and `rts[]` (every trial RT in ms).

---

### 3.6 Stroop

**Purpose.** Selective attention and response inhibition: naming the ink colour while ignoring the
word.

**Stimuli.**
- The colour words RED, BLUE, GREEN and YELLOW, displayed in an ink colour on a **fixed dark panel**
  (#1a1a1a), so the colours look the same in light and dark themes.
- Ink colours: RED `#ff4d4d`, BLUE `#4d8dff`, GREEN `#3ecf5a`, YELLOW `#ffd633`.
- Answer buttons are labelled with **words only, not coloured**: `1 RED`, `2 BLUE`, `3 GREEN`,
  `4 YELLOW`.

**Procedure.**
1. **Practice: 6 trials with feedback** ("✓ Correct", "✗ The ink was BLUE", "✗ Too slow", 600 ms each).
2. An interstitial, then the **test: 40 trials**.
3. Each trial: a **"+" fixation for 500 ms**, then the word stays until you respond (keys **1–4** or
   the buttons), or for up to 3 s. A 300 ms blank follows before the next trial.

**Trial generation.**
- **Exactly 50% congruent** (word = ink) and 50% incongruent, shuffled.
- No two identical stimuli in a row (the same word in the same ink).

**Scoring.**
- **Score = mean RT on correct trials** (ms).
- **Accuracy %** = correct / all trials. Timeouts count as incorrect.
- **Mean congruent RT** and **mean incongruent RT**, both from correct trials only.
- **Interference effect** = incongruent − congruent (ms). It is null if either condition has no
  correct trials.

**Stored fields.** `accuracy`, `congruentRt`, `incongruentRt`, `interference`, and `trials[]` with
`{ word, ink, congruent, response, correct, rt }`.

---

### 3.7 Sessions

| Session | Launched from | Contents | Approx. time |
|---|---|---|---|
| **Daily check** | Home → *Daily check* | Digit Span → PVT → Stroop | ~6–9 min |
| **Weekly benchmark** | Home → *Weekly benchmark* | Digit Span → Corsi → 2-back → Word Recall (new list) → PVT → Stroop | ~15–20 min |
| **Single test** | Home card → *Run* / *Study list* | One test | as per test |
| **Delayed recall** | Home → Word lists → *Delayed recall* | Recall of one saved list | ~2 min |

In multi-test sessions, each result screen shows "Test *n* of *m*" and a **"Next: *Test name*"**
button. The last test shows **Done**. Each result is saved when its test ends, so quitting partway
keeps the tests already completed.

---

## 4. Progress and tracking features

All progress views read from the same SQLite data and share one rule: **the baseline is the mean of
your first 3 sessions**, and any "improvement" figure is **signed so positive means better**.

### 4.1 Home dashboard

- **Action bar:** *Daily check*, *Weekly benchmark*, *Copy today's row*.
- **Word lists panel:** a *Study new list* button, the "recall in 7 days" prompt, and pending lists
  with unlock times or *Delayed recall* buttons.
- **One card per series** (7 cards), each showing:
  - the name (linking to the detail page), a **Daily/Weekly** badge, and a one-line description;
  - **Last**, **Best** (direction-aware), and **Last-5 average**;
  - a **sparkline** of the last 20 results, with no axes and the latest point marked;
  - a **trend indicator** comparing the last result with the mean of the up-to-5 results before it:
    ▲ "better than recent average", ▼ "worse…", or ＝ "same…". The arrow follows *improvement*, not
    raw value, so a faster PVT shows ▲. Each indicator has a text label as well as a colour;
  - "Higher/Lower is better" and the area;
  - a *Run* button (or *Study list*; the delayed-recall card points to the Word lists panel).
- **Copy today's row dialog:** pick a date (default today), fetch the tab-separated export row, and
  copy it to the clipboard. On plain-http LAN origins it falls back to `execCommand`, and the row is
  shown in a preview so it can be copied by hand if both methods fail.

### 4.2 Test detail page (`#/detail/<series>`)

Opened from a card title.

- **Trend chart:**
  - dated x-axis; every session as a focusable point joined by a thin line;
  - **5-session moving average** line (trailing);
  - **shaded baseline band**: the mean of the first 3 sessions ± 1 SD, with a mean line. The
    legend says "Baseline (n/3 sessions)" while it is still forming;
  - **dashed best-score marker**, labelled;
  - **hover or focus tooltip:** date, score, 5-session average, baseline. A crosshair snaps to the
    nearest session (D3 bisector);
  - **keyboard:** Tab onto a point, then ←/→ (or ↑/↓) to move, Home/End to jump.
- A header with session count, best and overall mean, plus a *Run* button.
- A **recent sessions table** (last 15) with test-specific details, for example PVT mean, lapses and
  false starts, or Stroop accuracy and interference.
- With zero results it shows an empty state ("No results yet…").

### 4.3 Progress overview (`#/progress`)

A **small-multiples grid**, one panel per series, showing **% change versus baseline** over time.

- **Direction handled for you:** RT metrics are inverted, so **up always means improving** in every
  panel.
- The baseline always comes from the first 3 sessions *ever*, not from the visible window.
- **Shared, symmetric y-axis** across all panels (for example ±25%, ±50%, ±100%), so panels can be
  compared directly. A heavier zero line marks the baseline.
- **Range toggle:** 30 days, 90 days (default), or All time.
- Each panel header shows the latest change (for example "▲ +12.4%"). The **tooltip shows the raw
  value** (for example "263 ms") as well as the % change.

### 4.4 Weekly report (`#/report`)

Trial-level views of a **single chosen session**. Each section has its own session picker, which
defaults to the latest session.

| Section | Visual | Details |
|---|---|---|
| **PVT reaction times** | Histogram (25 ms bins) + a strip plot of every trial | Dashed **500 ms lapse line**, a labelled **median line**, and lapse bins drawn in a second colour. Bars are focusable with tooltips. |
| **2-back breakdown** | Horizontal bars | **Hits, Misses, False alarms, Correct rejections**, with counts at the bar tips. Errors use a second colour, but the text labels carry the meaning. Below: "Hit rate − false-alarm rate = score". |
| **Stroop distributions** | Side-by-side jittered strip plots | **Congruent (circles) vs Incongruent (squares)**, correct trials only, with a labelled **mean line** per condition. Below: interference and accuracy. |

### 4.5 Tracking page (`#/tracking`)

This replaces a separate spreadsheet. All data comes straight from SQLite.

**Columns** (shared with the export row):
`Date | Digit Span | Corsi Span | 2-back Score | PVT Median RT | PVT Lapses | Stroop RT | Stroop Accuracy | Stroop Interference | Immediate Recall | Delayed Recall`

A day's value is the **latest result of that test on that local date**. Days with no result for a
test are blank.

| Tab | Contents |
|---|---|
| **Log** | Daily rows, newest first, with blanks shown as "—". Range selector (30 days / 90 days / All time). A **Copy** button on each row (TSV). **Download CSV**. |
| **Summary** | Per metric (all 10): **Baseline** (mean of first 3 non-blank days), **Latest 3** (mean of the last 3 non-blank days), **Best** (direction-aware), and **Change** (% vs baseline, positive = improving) as a ▲/▼ badge with an "improving"/"worse" label. "baseline in progress (n/3)" appears until 3 days exist. With 0 entries everything shows "—"; with 1 entry baseline = latest = that value and change is "—". On phones the Best column is hidden. |
| **Charts** | Trend charts (same component as §4.2) for Digit Span, Corsi Span, 2-back, PVT Median RT, Stroop RT and Delayed Recall, built from the daily log. |
| **Data** | **Download backup (JSON)** and **Restore from backup…** (confirmation required; replaces all data). |

### 4.6 Notes page (`#/notes`)

Static guidance:
1. The first 3 sessions are your baseline (practice effects).
2. Test at the same time of day, on the same device.
3. Compare only to yourself; scores aren't normed.
4. Not diagnostic: talk to a clinician if you're concerned.
5. Good habits: a daily cadence, a weekly benchmark with a new word list, minimising distractions.

---

## 5. Data and integrations

### 5.1 Data model (SQLite, `./data/cogbench.db`)

| Table | Columns | Notes |
|---|---|---|
| `results` | `id, ts, test, score, extra_json` | `ts` = epoch ms; `test` = series id; index on `(test, ts)` |
| `word_lists` | `id, created_at, words_json, immediate_score, recalled_at, delayed_score, days_elapsed` | `created_at` = server time |
| `used_words` | `word` (PK) | Guarantees no word is reused across lists |

- The database is created and migrated on startup, with versions tracked in `PRAGMA user_version`.
- WAL journal mode.

### 5.2 API

All input is validated with zod. Each test's `extra` field is checked against its own schema.

| Method and path | Purpose |
|---|---|
| `POST /api/results` | Save a result `{ test, score, extra, ts? }`. A client `ts` preserves the original time when a queued result is retried. |
| `GET /api/results?test=&limit=` | Latest *limit* results (default 500), oldest first. |
| `GET /api/summary` | Per series: count, last, best, average of last 5, last 20 (for the sparkline). |
| `POST /api/wordlists` | Create a list of 20 unused words, returning `{ id, createdAt, words }`. |
| `POST /api/wordlists/:id/immediate` | Score and record immediate recall (once per list). |
| `GET /api/wordlists/pending` | Lists not yet recalled, with `unlockAt` and `unlocked` (server time); no words. |
| `POST /api/wordlists/:id/recall` | Score delayed recall (unlocked lists only, once). |
| `GET /api/export/row?date=YYYY-MM-DD[&header=1]` | Tab-separated spreadsheet row; defaults to today (server time). |
| `GET /api/export/csv` | Long-format CSV (`id,ts,iso_time,date,test,score,extra_json`). |
| `GET /api/backup` / `POST /api/restore` | JSON snapshot of all three tables; restore replaces everything atomically. |
| `GET /api/tracking/log?days=` / `GET /api/tracking/summary` | Data for the Tracking page. |

### 5.3 Reliability: local retry queue

If saving a result fails (server unreachable, or a 5xx error), the request is stored in a
localStorage queue and a banner shows "*n* results waiting to sync". The queue is retried:
- on app load;
- when the browser reports it is back online;
- every 30 s;
- after any successful save.

It never retries while a test is active. Requests rejected with a 4xx error (for example, already
recorded) are dropped.

---

## 6. Non-functional requirements

### 6.1 Timing accuracy
- **The test engines are plain TypeScript modules** (`src/client/engine/`) that write the DOM
  directly. React only mounts an empty host element, so **no React state updates happen during
  trials.**
- **Stimulus onset** = `performance.now()` taken inside the `requestAnimationFrame` callback that
  applies the stimulus, i.e. on the frame it is painted.
- **Response time** comes from the input event's own `timeStamp`, which uses the same clock, with a
  fallback to `performance.now()`.
- **Test screens** have no transitions or animations; they are forced off in CSS.
- **Chart code** is lazy-loaded on separate pages and never runs during a test.

### 6.2 Accessibility
- **Keyboard:** every test can be completed with the keyboard (Enter, Space, 1–9, 1–4, Esc).
- **Charts:**
  - an `aria-label` text summary and a visually hidden data table;
  - focusable points and bars;
  - legends with shape and dash differences and text labels, so meaning never depends on colour.
- **Colour:** the chart palette was validated for colour-vision deficiency. Colours follow the theme
  through CSS variables.
- **Theme:** light and dark mode follow `prefers-color-scheme`.

### 6.3 Responsiveness
- Works at **375 px** width with no horizontal page scrolling.
- Chart tick density adapts to width, and tick labels never overlap or clip; both are verified in
  end-to-end tests.

### 6.4 Privacy and deployment
- **Localhost by default:** the server binds to `127.0.0.1`. `HOST` and `PORT` override this for
  LAN access. There is no authentication, so only expose it on trusted networks.
- **Local data:** everything lives in one SQLite file, which you can back up by copying it.

### 6.5 Quality
- **Unit tests** (`bun test`): the staircase rules, 2-back generation and scoring, PVT false starts,
  median and lapses, Stroop interference, Levenshtein matching, the 24 h unlock, no word reuse, and
  the tracking statistics.
- **API tests:** every endpoint against a temporary SQLite file.
- **End-to-end** (Playwright):
  - all six tests run end to end, via Daily, Weekly and single runs;
  - delayed recall, the export row and the CSV download;
  - the retry queue;
  - chart pages with 0, 1 and 35+ results at phone and desktop widths, with zero console errors.
- **`?fast=1`:** a test-only flag that shortens delays and trial counts and exposes expected answers
  for automation. Normal runs are unaffected.

---

## 7. Success metrics (personal)

- **Adherence:** at least 5 daily checks per week and 1 weekly benchmark per week.
- **Data completeness:** at least 90% of logged days have all three daily metrics.
- **Delayed recall follow-through:** at least 80% of studied lists are recalled within 6–8 days.
- **Zero data loss:** no results lost to network failures (the retry queue drains).

---

## 8. Known limitations and future work

| Item | Notes |
|---|---|
| Word pool runs out after 18 lists | Add words to `src/shared/words.ts`, or allow reuse after N months. |
| Device and display latency | Input and display latency differ between devices. Mitigated by "same device" guidance; per-device tagging could be added. |
| No authentication | Fine for localhost; LAN exposure relies on a trusted network. Optional basic auth is a possible addition. |
| Day boundaries use the server's local time zone | Fine for single-timezone use. |
| No reminders or notifications | Could add an optional daily reminder. |
| Context annotations | Future: tag sessions (sleep hours, caffeine, notes) to support personal correlation analysis. |
