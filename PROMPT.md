# PROJECT: Soft Landing

You are the lead engineer on a hackathon submission. Build the product described below,
completely, in a single Next.js app. Work in phases; stop and report at the end of each.
Do not skip ahead. Do not invent Qloo parameters — verify them (see VERIFY FIRST).

## THE PRODUCT

Soft Landing is an agent that helps a person who has just moved to a new country build
cultural footing over their first 12 weeks. It is not a recommender with a search bar.
It is a weekly, cross-domain plan that ramps from familiar to unfamiliar and re-plans
as the person reacts to it.

Primary user: someone in their first 0-12 months in a new city. International student,
relocated professional, trailing spouse, refugee with a smartphone. They feel
culture-shocked, not uninformed. They don't need a listicle; they need a sequence.

One-line pitch for the README: "A 12-week cultural on-ramp for people who just moved
countries — sequenced by Qloo's taste graph, built on the fact that familiarity is a
dose you can calibrate."

## THE USER FLOW (exactly this, no extra screens)

1. **Onboarding (one page, one scroll, ~90 seconds)**
   - Origin city (free text, autocomplete from a static city list)
   - Destination city (same)
   - 5 anchors: free-text input like "Fela Kuti", "jollof rice", "Nollywood",
     "Things Fall Apart", "Premier League". Max 5, min 3.
   - Constraints: multi-select chips — halal / vegetarian / vegan / no alcohol /
     low budget / limited mobility / no subtitles / no horror
   - Adventure slider, 0-100, default 50. Label under it changes with value:
     0 "Keep me comfortable" → 100 "Throw me in the deep end"
   - Button: "Build my first 12 weeks"
2. **The Culture-Gap Readout** — appears immediately after submit, before the plan,
   as a single card of 5-6 lines. This is the first thing they see and the first
   showstopper (see SHOWSTOPPERS). Takes 2-4s to compute; show skeleton lines.
3. **The Plan** — a vertical timeline, 12 week cards, week 1 at top. Each card holds
   3 items (not 5 — 3 is doable in a real week). Each item is a small horizontal card:
   category icon, title, one-line subtitle, and two buttons: "Loved" / "Not for me".
   Week 1 expanded; later weeks collapsed with a one-line summary. A sticky bottom bar
   shows progress ("Week 1 of 12 · 2 of 3 rated").
4. **Item detail** — clicking an item opens a side panel with the "Why this?" explainability
   breakdown (SHOWSTOPPERS #3) and a link out (Spotify / Google Maps / Goodreads / JustWatch
   search URL — do NOT attempt real deep links to specific entities, search URLs are fine).
5. **Feedback → re-plan** — after all 3 items in the current week are rated, the next week
   is revealed and **weeks 2-12 visibly re-sequence**. Show a toast: "Re-planned. Week 4
   now leads with food." This transition is the product.

No login, no accounts, no database. State lives in localStorage under key
`softlanding.v1` plus a shareable `?persona=` query param. Everything must survive a
page reload.

## THE SEQUENCING ENGINE (this is the competitive core — get it right)

Do not hand-roll "pick 3 random things per week". Implement this precisely.

### Familiarity curve

For week w in 1..12, target novelty N(w):

    ramp(w) = (w - 1) / 11                  // 0 at week 1, 1 at week 12
    ease    = pow(ramp, 0.85)               // slight ease-out: novelty arrives gently
    lo      = 0.15 + 0.10 * (A)             // A = adventure/100
    hi      = 0.45 + 0.25 * (A)
    N(w)    = lo + (hi - lo) * ease

At A=0.5: N(1)=0.20, N(12)=0.575. At A=0: N(1)=0.15, N(12)=0.45. At A=1: N(1)=0.25,N(12)=0.70.
Clamp to [0,1]. Write these as named constants in `lib/ramp.ts` with a unit test asserting
monotonicity and the three endpoint cases.

### Item familiarity

Every candidate item gets `fam(item) ∈ [0,1]`:
- `raw(item)` = the numeric affinity/score Qloo returns for that item given the user's
  anchor entities as the signal (see QLOO ADAPTER).
- Normalise **within each insight call**: `fam = (raw - min) / (max - min)` across the
  returned set. Different domains return different score distributions; never compare raw
  numbers across calls. If max == min, fam = 0.5 for all.
- `novelty(item) = 1 - fam(item)`, then apply a destination-locality bonus:
  if the item is a place or is tagged to destination metro, `novelty += 0.10`. Cap at 1.

### Week assignment

For each week w, choose K=3 items to minimise:

    cost = Σ |novelty(item) - N(w)|                       // hit the target
         + 0.35 * domainPenalty                          // no 2 items same domain
         + 0.15 * Σ pairwiseSimilarity(item_i, item_j)    // use Qloo-affinity between
                                                          // items if available, else
                                                          // tag overlap count
         + 0.50 * repeatedTagPenalty                     // tag seen in an earlier week
         + 1.00 * hardConstraintViolationPenalty         // NEVER violate: return Infinity

Greedy selection is acceptable if deterministic and documented, but prefer exhaustively
scoring the candidate pool per week (pool is small, ≤ 60 items) and picking the argmin
triple, then reserving used items so nothing appears twice across 12 weeks.

### Domain rotation

Across 12 weeks × 3 items = 36 slots, enforce a soft quota: music 8, food 8, film/TV 7,
books 5, podcasts 4, places 4. Enforce as a penalty that grows with deviation from quota
in `pick()`, not as a hard block — the ramp must win when they conflict.

### Feedback re-planning

State per item: `loved | notForMe | unrated`. On rating:
- **loved** → add that item's top tags to `user.affinities` with weight +1, and nudge
  `A` up by 0.03 (cap 1). Re-plan weeks > current only.
- **notForMe** → add tags to `user.avoid` with weight -1, penalise that domain by 0.15
  for the next 2 weeks, nudge `A` down 0.03 (floor 0).
- **re-plan must be stable**: given identical state, identical output. No `Math.random()`.

`A` is user-visible and draggable at any time. Dragging re-sequences **all unrated weeks**
live, in under 300ms, with no network call (re-compute locally from already-fetched
candidate pools). This is showstopper #2.

## QLOO ADAPTER

Create ONE module, `lib/qloo/`, that is the only place that talks to Qloo. It exports a
typed interface; a mock implementation and a live implementation both satisfy it. Nothing
else in the app may `fetch` Qloo.

```ts
export interface QlooAdapter {
  resolveEntities(query: string, types: EntityType[], limit?: number): Promise<Entity[]>
  findTags(query: string, limit?: number): Promise<Tag[]>
  insights(req: InsightRequest): Promise<InsightResult[]>   // with optional explainability
  compareCities(a: string, b: string, category: Category): Promise<CompareResult>
  trending(req: TrendingRequest): Promise<InsightResult[]>
}
```

`Entity` = `{ id: string; name: string; type: EntityType; tags: string[]; imageUrl?: string; locality?: string; externalUrls?: Record<string,string> }`
`InsightResult` = `{ entity: Entity; affinity: number; explanation?: Array<{ tagId: string; tagName: string; contribution: number }> }`
`CompareResult` = `{ category: Category; overlap: number; summary: string; sharedTags: Tag[]; divergence: Tag[] }`

### VERIFY FIRST — before writing the live adapter

Read these and confirm exact param names, they are easy to get wrong and wrong params
return 200 with empty/ignored results:

- https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide
- the Entity Type Parameter Guide (linked from it)
- the /v2/insights and /analysis/* reference pages

Assert and log every assumption you confirm. If an endpoint I named below does not exist
under that path, find the real one and note the correction in `NOTES.md`. Do not guess.

### Live adapter rules

- Base URL `https://hackathon.api.qloo.com` — read from `QLOO_BASE_URL`, default to this.
- Auth header `X-Api-Key: ${process.env.QLOO_API_KEY}`. Never `Authorization: Bearer`.
- GET with query params. Build URLSearchParams; do not hand-concatenate.
- `take` capped at 50. Paginate with `page` if you need more.
- Requests run **server-side only**, in Next.js route handlers under `app/api/*`.
  The key must never appear in any client bundle, log, error message, or fixture.
- Entity types: confirm exact URN spelling per type in the guide before use. Known-good
  starting point: `urn:entity:artist`, `urn:entity:movie`, `urn:entity:tv_show`,
  `urn:entity:book`, `urn:entity:podcast`, `urn:entity:place`, `urn:entity:restaurant`.
  Some references disagree (e.g. videogame vs video_game) — verify each one you touch.
- Use `feature.explainability=true` on the insights calls that feed item detail. If the
  response shape differs from `InsightResult.explanation` above, adapt the type to the
  real shape and update this spec in NOTES.md.
- Handle 429 with one retry after 800ms, then surface a friendly error.
- Cache: in-memory `Map` per server process, keyed by a stable hash of the request,
  TTL 10 minutes. Never write Qloo payloads to disk or to git.

### Mock adapter (build this FIRST, it unblocks everything)

`lib/qloo/mock.ts` must return payloads shaped 1:1 like the live ones, from a fixture file
`lib/qloo/fixtures/personas.ts`. It is chosen automatically when `QLOO_API_KEY` is unset,
and can be forced with `QLOO_MODE=mock`. Fixtures are hand-authored, clearly labelled
`// DEMO FIXTURE — not live Qloo data` in the header comment, and contain no real API
responses. Include enough items per domain (≥ 12) that the sequencing engine has a real
pool to search. Mock latency 120-400ms so loading states get exercised.

## THE THREE PERSONAS (seeded, first-class)

`/` shows a persona picker above the onboarding form: "Try a demo" with three cards.
Selecting one pre-fills onboarding and jumps straight to the plan.

1. **Amara, 24** — Lagos → Manchester. Student, tight budget, loves Afrobeats, jollof,
   Nollywood, Arsenal, Chimamanda Ngozi Adichie. Adventure 65.
   Story beat: food is the hard part; music is nearly frictionless.
2. **Dmitri, 38** — São Paulo → Lisbon. Relocated engineer, has money, loves bossa nova,
   churrasco, Wong Kar-wai films, sci-fi novels, long-form tech podcasts. Adventure 40.
   Story beat: language-adjacent, high overlap, but a loneliness problem — places matter more.
3. **Yuki, 29** — Osaka → Toronto. Trailing spouse, mobility-limited, vegetarian,
   loves Studio Ghibli, ramen, Murakami, city-pop, true-crime podcasts. Adventure 30.
   Story beat: constraints bite hardest; the plan must find genuinely accessible options
   and say so.

Each persona must produce a visibly *different* 12-week plan and a different gap readout.
If two personas yield similar plans, the engine is broken — fix the engine, not the fixtures.

## THE FIVE SHOWSTOPPERS

Build all five. They are the submission.

1. **Culture-gap readout** — after onboarding, show 5-6 lines like
   "Music: 0.62 overlap — you'll find your feet here fast"
   "Food: 0.31 — expect this to be the steepest stretch"
   driven by the cross-city comparison call, one per category. Plain numbers, plain
   sentences, no charts. This is the first card on screen and the frame for everything after.
2. **Live adventure slider** — dragging re-sequences the visible unrated weeks in <300ms with
   zero network calls. Must be smooth at 60fps. Debounce render, not state. Animate with
   `transform`/`opacity` only; honour `prefers-reduced-motion`.
3. **"Why this?" panel** — per item, list the top 3 contributing signals with their
   contribution values as horizontal bars, in plain language: "Because you love Fela Kuti
   (0.71)", "Popular in Manchester", "Matches your love of jollof rice (0.44)". If a
   recommendation has no explanation, hide the panel rather than invent one. Never fabricate
   a contribution number — if explainability data is absent, show "Why: similar audience" only.
4. **Ablation view** — a route `/ablation` showing two columns for the same persona and week:
   left "Without Qloo" (a canned generic response, clearly labelled as an illustration of the
   naive approach — do not claim it was generated live), right "With Qloo" (real). Three
   contrasting pairs are enough. Label it honestly: "Illustration of the difference."
   Link to it from the README and a small "Why Qloo?" link in the footer. Not in the main flow.
5. **Personas** — as specified above.

## STACK & STRUCTURE

Next.js 15 App Router, TypeScript strict, Tailwind, no UI component library (build the
handful of primitives you need), Vercel deploy. Server components where free; route
handlers for all Qloo calls. No database. No auth.

    app/
      page.tsx                  persona picker + onboarding
      plan/page.tsx             the 12-week timeline
      ablation/page.tsx         showstopper 4
      api/bootstrap/route.ts    resolve anchors, compute gap, build initial plan
      api/replan/route.ts       optional server-side replan (client should also manage)
    components/                 PlanTimeline, WeekCard, ItemCard, WhyPanel, Slider,
                                GapReadout, PersonaCard, Toast
    lib/
      ramp.ts                   the curve + unit tests
      sequence.ts               pick(), quotas, penalties + unit tests
      state.ts                  localStorage persistence, schema versioning
      qloo/types.ts  index.ts  live.ts  mock.ts  fixtures/personas.ts
    NOTES.md                    every API assumption you verified or corrected

Design constraints (non-negotiable, this is 25% of the score):
- One palette: 5-6 named CSS custom properties. Pick something that suits "arrival" —
  not cream-and-terracotta, not near-black-with-neon. Warm paper, deep ink, one signal colour.
- Two typefaces max, distinct roles, a real scale. Headlines carry personality.
- Semantic HTML: one h1, ordered headings, `<button>` for actions, `<a>` for links.
- Every control labelled, `:focus-visible` visible, keyboard-complete, contrast ≥ 4.5:1.
- Works at 375px with no horizontal scroll. Touch targets ≥ 44px.
- Empty, loading (skeletons), and error states designed, not an afterthought.
- Handle backend fully unavailable: if Qloo errors, fall back to mock, show a small
  honest banner "Showing demo data — live data unavailable."

## BUILD ORDER (do not reorder)

1. Scaffold + Tailwind + the design tokens + a static `/plan` with hardcoded week data.
   Ship this, confirm it renders at 375px and 1440px.
2. `lib/qloo/types.ts` + `mock.ts` + fixtures for all 3 personas. Log one mock call.
3. `lib/ramp.ts` + `lib/sequence.ts` with unit tests. Tests must pass before any UI wiring.
4. Wire mock → `/api/bootstrap` → real plan. Personas load end-to-end on mock data.
5. Feedback loop + re-plan + persistence. Verify reload keeps state.
6. Adventure slider live re-sequencing.
7. WhyPanel with mock explanation data.
8. Gap readout.
9. Live adapter behind the same interface. Flip with `QLOO_API_KEY`. Verify one real call,
   fix any param mistakes, update NOTES.md.
10. Ablation page.
11. Polish pass: loading, errors, empty, reduced-motion, keyboard, contrast.
12. README (with screenshots + the ablation framing), MIT LICENSE, deploy to Vercel,
    set env var in Vercel dashboard only.

## DEFINITION OF DONE

- Cold load `/` → pick Amara → plan for 12 weeks renders in under 3s on mock.
- Drag adventure slider end to end: visible weeks re-sequence, no jank, no network tab activity.
- Rate all 3 items in week 2 as "not for me": week 3 changes, toast explains why.
- Reload the page: state and week preserved.
- Click any item: WhyPanel shows ≥ 2 real contributing signals.
- `/ablation` renders both columns for all 3 personas.
- `grep -r "QLOO_API_KEY" .next/static` returns nothing. Key absent from client bundle.
- `npm run build` clean, `npx tsc --noEmit` clean, unit tests green.
- Lighthouse: accessibility ≥ 95, performance ≥ 85 on the plan page.
- 375px, 768px, 1440px all correct. Keyboard-only walkthrough completes.
- README explains: what it is, why Qloo is load-bearing, how to run mock vs live,
  the ablation result, and a limitations paragraph that states plainly this is not a
  clinical tool and makes no wellbeing claims.

## NEVER

- Never claim a health, mental-health, or wellbeing outcome. No "reduces loneliness",
  no "improves integration". It is a cultural orientation tool. Say so on screen and in
  the README.
- Never fabricate Qloo data, explanation scores, or live-generated comparisons.
- Never put the API key in the client, in git, in a fixture, or in a log line.
- Never commit real Qloo response payloads (ToS restriction — keep caches in memory only).
- Never add a feature not listed here. Depth over width; judges penalise proof-of-concept.
