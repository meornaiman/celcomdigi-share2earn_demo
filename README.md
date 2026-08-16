# CelcomDigi AIdealist

> Help when you need it. Independence when you're ready.

A mobile-first concept app carrying two connected journeys.

**Share2Earn** — a customer stuck on a digital task asks someone they trust for
help. The helper reviews a task-scoped slice of the account, recommends an
option, and sends it back. **The owner always has final approval** — nothing is
bought, changed or activated until they say yes. Built from
[`DESIGN.md`](DESIGN.md).

**Family Mobility, powered by Adaptive Identity** — a supplementary line leaves
the family account and becomes its own CelcomDigi account, keeping its number.
Trust the customer already established is reused, and verification steps up only
where the action itself adds risk. **The account owner's consent is always
required.**

Together: *help me → build my confidence → give me autonomy → keep me.*

---

## Run it

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>. Sign in with a demo account — the one-time
code is shown on screen.

| Account | Mobile        | Notes                         |
| ------- | ------------- | ----------------------------- |
| Mum     | 0123 333 444  | Postpaid 65, the account owner in the script |
| Aina    | 0123 111 222  | Digital Buddy Level 2, the helper |
| Ayah    | 0123 555 666  | Second trusted contact        |
| Faiz    | 0123 777 888  | Prepaid, third trusted contact |

### The presenter dashboard

**`/demo`** is the one surface for showing this to a room. Everything the
prototype does is reachable from it:

- **Journey switcher** — Share2Earn, Family Mobility, Data sharing. Each track
  swaps the script, the two personas, and the business impact panel
- **Scripted steps** — click through in order; completed steps go green
- **Exception states** — jump straight to the unhappy paths (Family Mobility)
- **Jump to any screen** — pick a phone, then any screen in that journey, so a
  question from the floor never needs a URL
- **Feature coverage** — what the prototype covers, grouped, at the bottom
- **Event stream** — the analytics events as they fire

`/family-demo` opens the same dashboard on the Family Mobility track.

The tracks share one data store, so order matters in one place: once Aina is
independent she leaves the family pool, and the data-sharing track says so and
offers a one-click reset rather than silently doing nothing.

### Family Mobility demo

Open **`/family-demo`** on a wide screen. Aina (supplementary line) on the left,
Mum (account owner) on the right, with the Business Impact panel beside them.

1. **Check eligibility** — the line is checked before anything is asked of her
2. **Adaptive identity** — three signals reused, one confirmation added
3. **Set up account** — her own plan and billing, then the owner is asked
4. **Principal approves** — Mum confirms it's her, then releases the line

The **exception state** buttons jump straight to the unhappy paths: active
contract, outstanding balance, low identity confidence, and not digitally
eligible. None of them dead-ends the customer.

The **data sharing** row runs the second, shorter story: Aina asks for 10GB
from the shared family pool and Mum confirms. Worth showing right after the
transfer, because the confirmation Mum gets is *"confirm it's me"* rather than
*"prove it's me"* — same product, same owner, lower risk, less friction. That
contrast is the adaptive model working.

The security model lives in [`lib/family.ts`](lib/family.ts): three assurance
levels — *don't interrupt me*, *confirm it's me*, *prove it's me* — with the
action deciding which applies. Adaptive Identity means the right amount of
security, never less of it.

### The Share2Earn 90-second demo

Open **`/demo`** on a wide screen. Two phone frames run side by side — Mum on
the left, Aina on the right — sharing one live data store. Drive it either by
tapping through the phones directly, or with the presenter toolbar:

1. **Trigger request** — Mum asks Aina about Thailand roaming
2. **Trigger recommendation** — Aina recommends the 3-Day Pass at RM38
3. **Approve** — Mum approves; this is the only step that changes anything
4. **Complete** — the task executes and both sides earn 500MB

**Reset demo** returns everything to the seed state.

`/admin` shows the metrics dashboard for whatever has been run in this browser.

---

## Architecture

The app is a **fully static export** (`output: "export"`) so it can be hosted on
GitHub Pages, which serves files and nothing else. That shapes two decisions:

**State lives in the browser.** `lib/store.ts` is a small repository over a
single JSON blob in `localStorage`, with selectors and mutations that mirror the
database model in `DESIGN.md` §14. Every table is there — requests, options,
recommendations, notifications, rewards, helper progress, audit log, events.

**Realtime is `BroadcastChannel`.** Any write broadcasts to every other tab,
window and iframe on the origin, which re-reads and re-renders. That is what
makes the two `/demo` panels update each other instantly, and it is why the
whole owner → helper → approve → reward loop is genuinely live rather than
faked.

The trade-off: state is per-browser, not per-account across devices. Two phones
would each keep their own copy. See *Swapping in a real backend* below.

### Layout

```
app/
  (app)/            signed-in shell — home, help, activity, rewards, profile,
                    task/[type] (the five task builders), request (detail)
  login/            mobile + mock OTP
  demo/             presenter split-screen
  admin/            metrics dashboard
  manifest.ts       PWA manifest, base-path aware
lib/
  types.ts          domain model (DESIGN.md §14)
  tasks.ts          task catalogue: risk level, permissions, options, rewards
  store.ts          persistence, realtime, selectors, mutations, anti-abuse
  session.ts        prototype auth, plus the ?as= account pin used by /demo
  i18n.ts           English + Bahasa Melayu
  hooks.ts          React bindings over the store
components/         UI kit, app shell, shared request views
```

### Things worth knowing

- **`?as=<userId>`** pins a frame to one account without touching the stored
  session. It is how `/demo` runs two identities in one browser, and
  `useAppLink()` carries it across every in-app link.
- **Store identity is stable.** Reads skip parsing when the stored string is
  unchanged, so an unrelated write never hands React a new object for a record
  that did not change. Without this, effects keyed on a record loop forever.
- **Requests expire** after 24 hours; a sweep runs on an interval and on load.
- **Options are generated per request** from the context the owner submitted, so
  a helper can never see anything the owner did not deliberately share.

---

## How the design maps to the code

| DESIGN.md | Where |
| --- | --- |
| §5 Use cases (bill, roaming, plan, eSIM, onboarding) | `lib/tasks.ts`, `app/(app)/task/[type]/` |
| §6 Palette, typography, shape language | `app/globals.css` `@theme`, `components/ui.tsx` |
| §7 Bottom navigation | `components/app-shell.tsx` |
| §8 Screens incl. approval and success | `app/(app)/request/page.tsx` |
| §9 Notification events | `lib/store.ts` `notify()`, toasts in `components/providers.tsx`, push handlers in `public/sw.js` |
| §10 Status model | `RequestStatus` in `lib/types.ts` |
| §11 Task-scoped permissions | `Permission[]` per task in `lib/tasks.ts`, shown before consent in `PermissionPreview` |
| §12 Risk levels | `TaskDefinition.risk`; GREEN skips the purchase confirmation, RED is never offered |
| §13 Auth | `lib/session.ts`, `app/login/page.tsx` |
| §14 Database model | `lib/types.ts`, `lib/seed.ts` |
| §19 Demo mode | `app/demo/page.tsx` |
| §20 Accessibility | 16px body minimum, 44px targets, focus rings, status in words as well as colour, EN/BM |
| §21 Reward rules and anti-abuse | `issueReward()` — one reward per task per user, monthly cap, nothing for expired requests |
| §22 Admin dashboard | `app/admin/page.tsx` |
| §23 Event tracking | `track()`; live stream at the bottom of `/demo` |
| §24 Security | task-scoped grants, audit log on every transition, request expiry, immediate revocation |

### Deliberately not built

- **§15 API routes.** A static export has no server. The mutation functions in
  `lib/store.ts` are the same surface those routes would expose, so they map
  one-to-one when a backend lands.
- **Firebase Cloud Messaging.** `public/sw.js` implements the `push` and
  `notificationclick` handlers and expects the §9 payload shape, but no
  subscription is created because there is no push server. In-app delivery uses
  the toast system instead.
- **RED-risk tasks.** Ownership transfer, SIM replacement, identity changes and
  payment card changes are out of MVP scope and are not offered anywhere.

---

## Swapping in a real backend

`lib/store.ts` is the only file that knows where data lives. To move to
Supabase:

1. Replace the selectors with queries and the mutations with RPC or REST calls.
2. Replace the `BroadcastChannel` in `subscribe()` with a Supabase Realtime
   channel on the `help_requests` and `notifications` tables.
3. Drop `output: "export"` from `next.config.ts` and deploy somewhere with a
   Node runtime — Pages cannot run one.

The components only use the hooks in `lib/hooks.ts`, so they do not change.

---

## Deployment

Live: <https://imxde-code.github.io/celcomdigi-share2earn/>

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the export
with `NEXT_PUBLIC_BASE_PATH=/<repo>` and publishes `out/` to GitHub Pages.

> **The repository is private, but the Pages site is not.** GitHub only supports
> access-controlled Pages on Enterprise Cloud; on every other plan the published
> site is reachable by anyone with the link. That is acceptable here because the
> app contains nothing but fixture data — but do not put anything real behind
> this URL.

To build the same artifact locally:

```bash
NEXT_PUBLIC_BASE_PATH=/celcomdigi-share2earn npm run build
```

Regenerate the app icons after changing the mark:

```bash
node scripts/make-icons.mjs
```

---

## Prototype boundaries

No real customer data, no real billing, no real SIM or identity operations, and
no real money moves. Every account, plan, bill and roaming pass in this repo is
fixture data in `lib/seed.ts` and `lib/tasks.ts`.
