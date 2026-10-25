# Agent instructions

This repository is a Divr profile: a static web app (React, Vite, Tailwind, TypeScript) that https://divr.space shows
in a sandboxed iframe on its owner's profile page. It started as a copy of
https://github.com/open-divr/profile-template. The page talks to the platform only through the npm package
`@divr/profile-sdk`: the SDK, its React bindings and the `profile-check` deploy checker, one package with one version.

`README.md` is the author's guide. This file is the procedure for coding agents: how to set up, change, check and
ship the profile. Start every session with [Before you start](#before-you-start). For what the installed SDK
actually requires, read the package itself in `node_modules/@divr/profile-sdk/` (`README.md`, `CHANGELOG.md`, and
`src/protocol.ts`, whose `REQUIRED_READ_METHODS` and `REQUIRED_ACTIONS` define the contract). If that disagrees
with this file, the package is right.

## Platform constraints

The browser enforces most of these on every viewer's screen. `npm run verify` checks only a few of them, so a build can
break them, pass the checks and still fail live.

- **Sandbox.** The frame is `sandbox="allow-scripts"` with an opaque origin. There are no cookies and no storage:
  `localStorage`, `sessionStorage`, IndexedDB and `document.cookie` throw. Keep state in memory.
- **No fetch, XHR, WebSocket or beacons.** `connect-src 'none'` blocks them and EventSource. `RTCPeerConnection` is
  banned below. Import any data at build time (for example a JSON
  import).
- **Everything comes from the bundle.** Scripts, styles, fonts and media load only from the deploy's own path. This
  rules out CDNs, remote fonts (Google Fonts included), remote stylesheets and remote scripts. Images can also be
  the platform's own image URLs that reads return (avatars, post images), `data:` or `blob:`. Fonts can be bundled
  files or `data:`.
- **Scripts only from bundle files.** Inline scripts, `eval` and `new Function` are blocked. Inline styles are
  allowed. `vite.config.ts` is set up for this (relative `base: './'`, no module-preload helper), and its header
  explains each setting. Keep it.
- **No leaving the frame on your own.** `<a target="_blank">`, `window.open` and navigating the frame are blocked.
  Open outbound URLs with `api.openLink(url)` and other profiles with `api.openProfile(handle)`.
- **Banned:** forms, password inputs, WebAssembly, workers (service workers too), nested iframes, pop-ups,
  `RTCPeerConnection`, crypto miners and autoplaying media. Audio or video from the bundle may play on click.
- **Viewport.** `index.html` keeps `<meta name="viewport">`. The layout must work at 375 px and at 1280 px wide.
  The frame fills the page below the platform's bar (at least 480 px tall) and scrolls by itself.
- **Bundle size.** `dist/` may hold at most 100 entries and 5 MB unpacked. Only the file types listed in `README.md`
  ("The checks the platform runs") are allowed.
- **Everything shipped is public.** Anyone can download the deployed files, including source maps, bundled JSON and
  every `import.meta.env.VITE_*` value. While **Allow forks** is on, any signed-in member can also download the
  committed source. Keep secrets, private notes and other people's personal data out of the repository.
- **Treat the viewer as private.** The page learns two facts about who is looking: `viewerIsOwner()` and
  `viewerFollowsOwner()`. Do not send either anywhere: not through `RTCPeerConnection` (banned; some browsers do not
  enforce the restriction), and not by choosing which link to offer through `openLink(url)` by either fact, because the
  site it opens sees the address. Call `openFollow()` only from a control the viewer presses to follow: it follows the
  owner at once for a signed-in viewer who does not follow yet, so any other click would follow them without their
  asking.

## Setup from zero

1. The owner needs a Divr account: sign in at https://divr.space with the GitHub account that will own the
   repository. Deploys are accepted only from repositories owned by that personal account. Organisation-owned
   repositories cannot deploy.
2. On https://github.com/open-divr/profile-template, click **Use this template** and create the repository under
   that personal account (public or private).
3. Clone it, switch to the Node version in `.nvmrc` (`nvm use`, or install that major version), then install:
   `npm ci`. Then run [Before you start](#before-you-start): a copy made from an older template release pins an
   older SDK.
4. Run `npm run dev` and open the printed URL. The SDK runs in mock mode on fixture data, and a toolbar in the
   bottom-right corner switches scenarios and widths.
5. Run the checklist in [Before every push](#before-every-push).
6. Push to `main` (or use **Run workflow** under Actions). The **Deploy profile** workflow builds, checks and uploads
   the profile. The run shows in the repository's Actions tab, and the deploy history on https://divr.space/config.
   The first upload, even a failed or rejected one, links the repository to the account. Once an upload is
   accepted, the profile shows at `https://divr.space/u/<handle>`.

## Before you start

Run this at the start of every session, before changing anything. The installed `@divr/profile-sdk` is also the
`profile-check` checker, and the platform checks deploys with the same package, so when the installed version
equals the platform's, local checks apply the platform's rules exactly.

```sh
npm ci
npx profile-check --version                     # installed SDK and checker
curl -s https://divr.space/v1/checker-version   # {"checkerVersion":"…","bridgeVersions":[…]}: what the platform runs
npm view @divr/profile-sdk version              # latest on npm
```

Compare the installed version with `checkerVersion`:

- **Equal:** current. Start work.
- **Lower:** update first ([Updating the SDK](#staying-current)) and commit the update on its own, then start. npm
  `latest` is never ahead of the platform, but it can trail it briefly after a release. If `npm view` still prints
  a version below `checkerVersion`, the release has not reached npm yet: work on the installed version (the
  platform accepts an older SDK while its bridge version is supported) and update once it appears.
- **Higher:** run `npm install @divr/profile-sdk@<checkerVersion>`. The platform refuses a bundle built with a newer
  major or minor (`sdk.newer_than_platform`), and a newer patch may check differently from the platform.
- **`curl` prints nothing or no JSON:** the platform is unreachable from here. Work on the installed version and
  repeat this check before pushing; `npm run verify` makes the same comparison when it can reach the platform.

## Commands

| Command | Does |
| --- | --- |
| `npm ci` | installs exactly what `package-lock.json` pins (CI runs `npm ci --ignore-scripts`) |
| `npm run dev` | Vite dev server in mock mode, with the dev toolbar |
| `npm run typecheck` | `tsc --noEmit` over `src/` |
| `npm run build` | type-checks, then builds the static site into `dist/` |
| `npm run preview` | serves the built `dist/` (also in mock mode) |
| `npm run render-preview` | `profile-preview dist`: renders the built profile in a headless Chromium and writes `dist/preview/tile.webp` ([Preview image](#preview-image)). Exit 0 written or skipped, 1 not written with `--strict`, 2 usage error or no `dist/index.html` |
| `npm run verify` | `build`, then `profile-preview dist`, then `profile-check dist`: the platform's deploy checks, with the SDK judged against the checker version https://divr.space runs (against the installed one when offline). Exit 0 pass, 1 findings, 2 usage or read error |
| `npx profile-check --json dist` | the same report as JSON (`findings: [{ check, code, message, file, line }]`) |
| `npx profile-check --version` | the installed checker version, which is also the installed SDK version |
| `npx profile-preview --json dist` | the render outcome as JSON (`status`, `files`, `timings`, `requiredReadsDone`, `pageErrors`) |
| `npm run update-sdk` | `npm install @divr/profile-sdk@latest`: updates the SDK, the React bindings and the checker together |

## API

```ts
import { ProfileAPI } from '@divr/profile-sdk';          // framework-free
import { ProfileProvider, useProfile /* … */ } from '@divr/profile-sdk/react';
const api = new ProfileAPI(); // mode 'auto': live inside the platform's frame, mock anywhere else
```

### Reads

| Bridge method | `ProfileAPI` | React hook | Required | Returns |
| --- | --- | --- | --- | --- |
| `profile.get` | `getProfile()` | `useProfile()` | yes | `{ id, handle, name, description, avatarUrl, profileUrl, links }`: name 1–50 chars, description 0–500, 0–6 links |
| `followers.count` | `getFollowerCount()` | `useFollowerCount()` | yes | `number` |
| `following.count` | `getFollowingCount()` | `useFollowingCount()` | yes | `number`. The following list is not exposed; the platform shows it |
| `posts.list` | `getPosts({ cursor? })` | `usePosts()` | yes | a page of posts, newest first, 10 per page |
| `followers.list` | `getFollowers({ cursor?, limit? })` | `useFollowers({ limit })` | no | a page of `{ handle, name, avatarUrl }`, newest first; `limit` 1–50 |
| `projects.list` | `getGithubProjects()` | `useGithubProjects()` | no | 0–6 `{ name, description, url, stars, language }` |

**Required** means the read must be called within 10 s of `new ProfileAPI()` on every load: at every width, for
every viewer (the owner too), and without waiting for a click or a scroll. If one is missing, the platform records
`contract.missing` against the deployment, and moderators see it. No deploy check catches this.

A page is `{ items, nextCursor }`, and `nextCursor: null` means the last page. The `Post` type is in `README.md`.
On a repost, `repostOf` holds the original, and `counts` are the original's.

Hook results:

- `useProfile`, `useFollowerCount`, `useFollowingCount` and `useGithubProjects` return
  `{ data, error, isLoading, isFetching, refetch }`.
- `usePosts` and `useFollowers` return `{ posts | followers, pages, error, isLoading, isFetching,
  isFetchingNextPage, hasNextPage, fetchNextPage, refetch }`.

Viewer facts:

- `viewerIsOwner()` (hook `useViewerIsOwner()`) is true when the owner is looking at their own profile.
- `viewerFollowsOwner()` (hook `useViewerFollowsOwner()`) is true when the viewer follows the owner. It changes
  after a follow or unfollow, and `viewer.changed` fires.
- Neither method ever rejects. Each hook is `undefined` until the platform answers, then `true` or `false`.
- In mock mode the viewer is never the owner. Following starts false and flips with each `openFollow()`.

### Actions

| `ProfileAPI` | Bridge method | `data-pf-action` | SDK control | Required |
| --- | --- | --- | --- | --- |
| `react(post.id, 'like')` | `ui.openPost` | `like` | `<PostActions post>` | yes, on every post |
| `react(post.id, 'dislike')` | `ui.openPost` | `dislike` | `<PostActions post>` | yes, on every post |
| `openComments(post.id)` | `ui.openPost` | `comment` | `<PostActions post>` | yes, on every post |
| `openRepost(post.id)` | `ui.openPost` | `repost` | `<PostActions post>` | yes, on every post |
| `openFollow()` | `ui.follow` | `follow` | `<FollowButton>` | yes; may be left out while `viewerIsOwner()` is true |
| `openMore()` | `ui.more` | `more` | `<MoreButton>` | yes; same |
| `openFork()` | `ui.fork` | `fork` | `<ForkButton>` | yes; same |
| the next `getPosts` page | none | `load-more` | `<LoadMoreButton>`, `<LoadMoreSentinel>` | paging is required, through a sentinel or a `load-more` control |
| `openFollowers()` | `ui.openFollowers` | none | none | no |
| `openProfile(handle)` | `nav.profile` | none | none | no; for followers and post authors |
| `openLink(url)` | `ui.openLink` | none | none | required for every outbound link the page offers |

The checker refuses a bundle that lacks any of the seven values `follow`, `more`, `fork`, `like`, `dislike`,
`comment` and `repost`. It does not look for `load-more`. The SDK components carry the values and skip the owner
controls for the owner on their own.

An action is refused (`not_allowed`, logged by the SDK as the warning `sdk.ui_refused`) unless all of these hold:

- it runs synchronously in the handler of a real click or key press inside the page;
- no platform dialog is open, and the previous action was not a moment ago;
- its post id, handle or URL arrived through a read in this page load.

Actions return nothing. The page never learns what the viewer did in a platform dialog. The one exception is
following, which updates `viewerFollowsOwner()` and fires `viewer.changed`.

### Events, errors, limits

- **Events.** `api.on('posts.changed' | 'counts.changed' | 'viewer.changed', cb)` returns an unsubscribe function.
  The hooks already refetch: counts and followers on `counts.changed`, posts on `posts.changed` and
  `counts.changed`, and the follow state on `viewer.changed`. The profile and projects reads never refetch.
- **Read errors.** A failed read rejects with `ProfileApiError` (check with `isProfileApiError`). Its `code` is
  `rate_limited` (with `retryAfterMs`), `not_allowed`, `not_found` or `unavailable`; `unavailable` also covers a
  10 s timeout. Invalid arguments, such as `limit: 60`, throw a `TypeError` before anything is sent.
- **Limits.** Reads are limited to 20 per second, with bursts up to 40, and the platform caches identical reads
  for 60 s. Read each thing once and pass it down, page on scroll, and never poll.
- **Error reporting.** Uncaught errors go to the platform automatically. `api.reportError(err)` reports one the
  page caught itself.

## Rendering rules

These must be visible to every viewer as real HTML text and `<img>` elements. Canvas and WebGL are fine for
decoration only.

| Item | How |
| --- | --- |
| Name, avatar, description | the name as text, `<img src={avatarUrl}>` (the image is already circular), the description as text (it may be empty) |
| Follower and following counts | both numbers |
| Follow, More, Fork | one control each. They may be left out while `viewerIsOwner()` is true, and only then. Follow reads Follow or Unfollow to match `viewerFollowsOwner()` |
| Posts | each post's content (text, images, link card, a repost's original), each with Like, Dislike, Comment and Repost |
| Paging | the next page of posts through a scroll sentinel or a `load-more` control, until `hasNextPage` is false |
| Followers (optional) | once fetched, each follower's name and avatar; `openFollowers()` is optional |
| Projects (optional) | once fetched, each project's name and link, opened with `openLink` |
| Links (optional) | if shown, each link, opened with `openLink` |

Phones and other small screens:

- Required items stay on the page at every width. Never move them into a menu, sheet, tab or collapsed section.
- Shortening a long text behind a "Read more" control keeps the item on the page. The template's
  `ClampedDescription` does this.
- Optional items may move behind a control. The template's phone layout puts the Friend Space, links and projects
  in bottom sheets (`MoreMenu`).
- In the owner's view, only Follow, More and Fork may disappear.

Moderators can hold a live profile that hides required items. A held profile is offline until they clear it.

## How the template is built

| Path | Role | Change |
| --- | --- | --- |
| `src/main.tsx` | creates the one `ProfileAPI` and renders `<ProfileProvider api>` around `App`; errors caught by the boundary go to `api.reportError` | keep the structure |
| `src/App.tsx` | makes the profile, both count and projects reads once and passes them down. Picks the layout. Wraps each box in `ErrorBoundary`. Builds the phone menu's sections | rearrange freely within the rules |
| `src/layout.ts` | `useWideLayout()`: the `(min-width: 64rem)` media query (1024 px) | breakpoint is yours |
| `src/components/ProfileHeader.tsx` | name (`h1`), avatar, handle, profile URL, both counts. `OwnerControls` holds `FollowButton` (with a function child for Follow / Unfollow), `MoreButton` and `ForkButton`, or a note in the owner's view. `ContactBox` holds those controls on wide screens | restyle; keep the items and controls |
| `src/components/About.tsx` | `AboutBox` (description), `ClampedDescription` (four lines plus Read more), `LinksBox` (links through `openLink`) | restyle |
| `src/components/PostList.tsx` | `usePosts`, each post with `<PostActions>`, repost credit through `openProfile`, link cards through `openLink`, `LoadMoreSentinel` plus `LoadMoreButton` | restyle; keep the controls and paging |
| `src/components/FollowersBox.tsx` | Friend Space: `useFollowers({ limit: 8 })`, faces opening `openProfile`, "View all followers" calling `openFollowers()` | optional box |
| `src/components/Projects.tsx` | projects from `App`, each through `openLink`. Renders nothing while loading or when there are none | optional box |
| `src/components/MoreMenu.tsx` | phones only: one button per optional box, each opening a modal `<dialog>` sheet. A sheet's content mounts only while it is open | keep it for optional boxes only |
| `src/components/ErrorBoundary.tsx`, `ui.tsx` | the per-box error boundary; `ErrorNote` (message plus Retry), `Skeleton`, `Panel`, pixel icons, URL helpers | reuse |
| `src/components/Avatar.tsx`, `src/assets/no-photo.svg` | avatar as `<img>`, with a bundled fallback when the URL is empty or broken | keep `<img>` |
| `src/components/Water.tsx`, `src/water.ts` | decorative background, drawn once | free; delete if unwanted |
| `src/index.css`, `src/assets/fonts/` | Tailwind, the bundled Figtree font (OFL licence alongside it), the colour and type tokens in `@theme`, panel, button and sheet styles | free |
| `src/log.ts` | JSON console logger, `log(level, context, message, fields)`; `warn` and above in builds, `info` in dev | use it on every failure path |
| `index.html`, `vite.config.ts`, `tsconfig.json` | page shell with the viewport meta, and build settings the sandbox needs | keep the viewport meta and the build settings |
| `.github/workflows/deploy.yml`, `scripts/deploy.sh` | build and upload on push to `main` | see [Deploying](#deploying) |
| `package.json`, `package-lock.json`, `.nvmrc` | scripts, the pinned SDK, the Node version | commit `package.json` and the lockfile together |

## Changing the profile

**Free to change:** colours, type and spacing (start with the `@theme` tokens in `src/index.css`), fonts (bundle the
files and keep their licence), copy, icons, box order, the breakpoint, the water. You can add components and bundled
assets, or replace React or Tailwind entirely, as long as the result is a static `dist/` that uses the SDK and
follows the rules above.

**Must stay, or be replaced with an equivalent:**

1. One `ProfileAPI`, created at start-up and provided to the tree.
2. The four required reads, made on mount at every width. Today they live in `App.tsx` (profile and both counts)
   and `PostList.tsx` (posts), which is mounted in both layouts. Do not put the post list behind a tab, a sheet or
   a lazy import that waits for input.
3. Every required item visible, as listed in [Rendering rules](#rendering-rules).
4. The controls. Prefer the SDK components and style them through `className`, `buttonClassName`, `labels` and
   `children`. A custom control must carry the value as a literal next to the attribute and call the same method:

   ```tsx
   <button type="button" data-pf-action="like" onClick={() => api.react(post.id, 'like')}>Like</button>
   ```

   A computed value (`data-pf-action={name}`, or values mapped from an array) is invisible to the checker and
   fails the deploy. Values inside comments do not count either.
5. Follow is one control whose label follows `viewerFollowsOwner()`. With `<FollowButton>`, pass a function
   child: `{(following) => (following ? 'Unfollow' : 'Follow')}`. Never a static "Follow": pressing it when the
   viewer already follows starts an unfollow.
6. Paging. Keep `<LoadMoreSentinel onVisible={…} disabled={!hasNextPage || isFetchingNextPage || error !== undefined} />`
   after the last post. Keep `<LoadMoreButton>` as the keyboard path.
7. Actions called directly in click or key handlers, with ids, handles and URLs from reads. Never call them from
   effects, timers or after an `await`.
8. Failure handling. Every box sits in its own `ErrorBoundary`; a failed read shows `ErrorNote` with Retry;
   loading shows a `Skeleton`. One failed read must never blank the page.

**Layouts.** `App.tsx` builds both arrangements from the same boxes, using `useWideLayout()`:

- From 1024 px, two columns. Left: identity with both counts, `ContactBox` (the owner controls), Friend Space
  (faces two across), links, projects. Right: About me, posts.
- Below 1024 px, one column: identity with the counts and the owner controls (`withControls`), About me clamped
  (left out when the description is empty), `MoreMenu`, then posts.
- The posts sit in the second grid column in both layouts, so crossing the breakpoint does not remount the list or
  drop its loaded pages. Keep that if you rearrange.
- The phone sheets list only optional boxes. `sections` in `App.tsx` adds Friend Space always, Links when the
  profile has links, and Projects when there are projects or their read failed. Never add a required box there.

**Logging.** Log every catch block and fallback with `src/log.ts`:

```ts
log('warn', 'profile.<area>', '<what failed>', { ...errorFields(err), recovery: '<what the page does instead>' });
```

Use `error` for failures that lose content and `warn` for ones the page recovers from. Report unexpected errors
with `api.reportError(err)`. `ErrorBoundary` already does both. There is nothing about the viewer to log, and
nothing private should be logged.

**Dependencies.** A new package must work under the sandbox: no network at run time, no `eval` or `new Function`,
no workers, WebAssembly or storage, and no `<form>`. Check that `dist/` stays within 100 entries and 5 MB. CI
installs with `--ignore-scripts`, so a package that needs an install script fails there.

## Before every push

Run all of these and fix everything they find before pushing. A rejected deploy still counts against the
account's daily deploy limit.

1. `npm ci` after a fresh clone or a dependency change.
2. `npm run typecheck`. It must exit 0.
3. `npm run verify`. It must end with `PASSED` and exit 0. On `FAILED`, each finding prints as
   `x [check] code file:line` followed by its message. Look the code up in [Troubleshooting](#troubleshooting), fix
   the cause, and run `verify` again.
4. If `verify` printed `profile-check: warning: the platform checks deploys with profile-check <version>, newer
   than this copy`, update first ([Staying current](#staying-current)), then repeat steps 2 and 3.
5. Run step 3 online. `verify` asks https://divr.space which checker version it runs and reports an SDK ahead of
   it as `sdk.newer_than_platform`, as the deploy would. Offline, that lookup is skipped without a message and the
   rule is judged against the installed version, which cannot catch it. `npx profile-check --verbose dist` prints
   why when the lookup was skipped.
6. Look for things only the browser blocks. Both commands must print nothing:

   ```sh
   grep -rnE "(^|[^.[:alnum:]])fetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie|window\.open|_blank|new Worker|serviceWorker|new Function|eval\(|<iframe" src index.html
   grep -rnE "(url\(|src=|href=|@import)[^)]*https?://" src index.html
   ```

7. Check every scenario at both widths with `npm run dev`:
   - Open `/?scenario=<name>&pfViewport=375`, then the same with `pfViewport=1280`, or size the browser window to
     those widths.
   - The scenarios are `typical`, `empty`, `heavy` (1,500 followers, 240 posts), `long-text` (every text at its
     maximum length) and `no-projects`.
   - In each one, confirm:
     - name, avatar, description and both counts are visible;
     - Follow, More and Fork are visible;
     - every post shows its four controls;
     - scrolling loads further pages until the end (`heavy` has 24 pages);
     - long texts wrap and nothing scrolls sideways at 375 px;
     - empty states read sensibly.
8. Open the page at full width with `?pfDebug=1` and watch the console. Without any input, it must log
   `sdk.read_started` for `profile.get`, `followers.count`, `following.count` and `posts.list`. Then click each
   control once, with real clicks (a browser automation click works; `element.click()` from a script does not).
   If the page never stands still, read [Pages that keep moving](#pages-that-keep-moving) first.
   - Each click shows a toast naming the platform surface it would open.
   - A red toast or a `mock.ui_call_refused` warning means the call would be refused live. Fix it.
9. Optional: run `npm run preview` and repeat the scenario checks against the production build.

The checks cannot prove:

- that the required items are visible;
- that the required reads happen in time;
- that nothing violates the sandbox or the Content-Security-Policy;
- that the layout works.

Steps 6 to 8 cover these. Live, the platform also records missing required reads, and viewers can report the
profile.

### Pages that keep moving

Browser automation assumes that a page settles. Playwright, and tools like it, wait for an element to stop moving
before they click it. Screenshot comparisons expect two captures of the same state to match, and "wait until idle"
helpers expect animations to finish. A profile with continuous motion breaks all three. Examples are an animated
background, boxes that drift or bob, a canvas or WebGL scene redrawn every frame, a marquee, or a CSS animation set
to `infinite`. The symptoms:

- clicks that time out with "element is not stable", although the control is plainly there;
- screenshots that differ on every run;
- waits that never resolve.

Nothing is wrong with the controls. The automation is waiting for a stillness that never comes. Which way round it
works depends on the profile, so decide case by case. Hold to two things whatever you choose:

- Steps 7 and 8 still have to pass in full.
- At least once, click each control while the page is moving, as a viewer would, and confirm that it responds. A
  control that only works once the motion stops is broken for every viewer.

## Staying current

How versions work:

- `@divr/profile-sdk` has one semver for the SDK, the React bindings and the checker.
  - A patch fixes a bug or lets a check accept more.
  - A minor adds API or adds or tightens a check.
  - A major changes the bridge version or the report shape, or removes an export.
- A version reaches npm only once https://divr.space runs it, so npm `latest` is never ahead of production.
  `npm run update-sdk` is always safe to deploy.
- The platform refuses a bundle built with an SDK whose major.minor is above its own (`sdk.newer_than_platform`).
  A newer patch is accepted. An older SDK is accepted while its bridge version is still supported
  (`sdk.unsupported_bridge` otherwise).
- Every upload is judged by the platform's current checker, whatever SDK built it. When the platform's checker is
  newer than the installed one, `profile-check` prints a warning, because a stricter rule may reject on deploy what
  passed locally.

Finding versions (this file never names one):

| What | How |
| --- | --- |
| installed | `npm ls @divr/profile-sdk`, or `npx profile-check --version` |
| latest on npm | `npm view @divr/profile-sdk version` |
| what the platform runs | `curl -s https://divr.space/v1/checker-version` returns `{"checkerVersion": …, "bridgeVersions": […]}` |
| template releases | `git ls-remote --tags https://github.com/open-divr/profile-template 'sdk-v*'` (each tag `sdk-v<version>` pins that SDK) |
| what changed | `node_modules/@divr/profile-sdk/CHANGELOG.md` after installing |

Updating the SDK:

1. Note the installed version, then run `npm run update-sdk`.
2. Read the new sections of `node_modules/@divr/profile-sdk/CHANGELOG.md`. Then check `REQUIRED_READ_METHODS` and
   `REQUIRED_ACTIONS` in `node_modules/@divr/profile-sdk/src/protocol.ts` for new requirements.
3. Run [Before every push](#before-every-push), and commit `package.json` and `package-lock.json` together.

If `verify` fails after an update, fix the profile, not the version:

- A new or stricter rule names itself in the finding code.
- A type error follows an API change described in the changelog.
- Going back to the older SDK does not help, because the platform applies its own current rules to every upload.

Pulling later template improvements:

A copy made with **Use this template** shares no history with `open-divr/profile-template`, so `git merge` does not
work. Replay the upstream diff instead:

```sh
git remote add template https://github.com/open-divr/profile-template.git   # once
git fetch template main --tags
# The template commit this repository started from: its tree equals your first commit's tree.
first=$(git rev-list --max-parents=0 HEAD | tail -n 1)
base=$(git log --format='%H %T' template/main | awk -v t="$(git rev-parse "$first^{tree}")" '$2 == t { print $1; exit }')
echo "${base:-not found}"
git diff --stat "$base" template/main                      # what upstream changed since
git diff "$base" template/main -- . ':(exclude)package-lock.json' | git apply -3
```

- **No base found.** If your first commit was edited, `base` comes out empty. Use the tag of the SDK version that
  commit pinned instead: `git show "$first:package.json" | grep profile-sdk`, then `base=sdk-v<that version>`.
  After a pull, use the upstream commit you pulled from as the next base, and name it in the commit message.
- **Conflicts.** `git apply -3` stages what applies cleanly and leaves conflict markers where you and upstream
  changed the same lines (`git status` lists them).
- **Deleted files.** If it stops with `<path>: does not exist in index`, you deleted that file on purpose. Rerun
  with `--exclude=<path>`.
- **Whole files.** For a file you never changed, `git checkout template/main -- <path>` takes it whole.
- **Finish.** Resolve `package.json` by hand, run `npm install` to regenerate the lockfile, run
  [Before every push](#before-every-push), then commit.

## Preview image

`npm run verify` and the workflow also run `profile-preview dist`, which renders the built profile in a headless
Chromium on the `typical` fixture scenario, framed as the platform frames it, and writes `dist/preview/tile.webp`
(480×270, the image on the owner's gallery cards). The file ships inside the bundle (about 10 KB); the platform
re-encodes it on deploy and drops it if it cannot decode it, and the deploy stands either way.

- It is optional. Without `playwright-core` or a browser the command prints
  `profile-preview: warning: no preview written: …` and exits 0, and the deploy goes on without it;
  `--strict` turns that into exit 1. `PROFILE_PREVIEW_SKIP=1` skips the render on a host that cannot run a browser.
- It needs a Chromium. The workflow uses the Chrome on GitHub's Ubuntu runners and installs nothing; locally the
  command finds an installed Chrome or Edge on its own, or takes `--channel msedge` / `--browser <path>`. A machine
  with no browser at all can install Playwright's headless shell: `npx playwright-core install --only-shell
  chromium` (about 100 MB).
- The picture follows the code: re-run `npm run verify` after a visual change. Never edit or commit it; `dist/` is
  ignored.
- `npx profile-preview --json dist` prints the outcome. `requiredReadsDone: false`, or a warning that the profile
  threw errors, means the picture shows a loading or broken state, which is also what a viewer sees first: fix the
  profile, not the picture. `--scenario <name>` renders another fixture scenario; `--settle-ms <n>` waits longer
  for transitions.

## Deploying

`.github/workflows/deploy.yml` runs on every push to `main` and on **Run workflow**. A new push cancels a run that is
still in progress.

- **build** runs your code with read-only permissions and no way to obtain a deploy token. It runs
  `npm ci --ignore-scripts`, then `npm run build`, then `npx --no-install profile-preview dist` (after installing
  the headless Chromium it needs), then `npx --no-install profile-check dist`, all writing their output to
  `build.log`. It uploads `dist/` (preview image included) and `source.tar.gz` (`git archive` of the commit) as
  artifacts.
- **deploy** runs no npm code. It runs `scripts/deploy.sh`, which gets the run's GitHub identity token and sends
  `dist/` as a `tar.gz` to `https://divr.space/v1/deploy`, with the source archive as a second part. If the build
  job failed, it sends the last 64 KB of `build.log` to `/v1/deploy/failure` instead.

Where the outcome shows:

| Outcome | Actions log | https://divr.space/config |
| --- | --- | --- |
| accepted | deploy job green; the response JSON has `"status":"ready"` | **Ready**, live at once |
| rejected by the platform's checks | deploy job red; the 422 response JSON holds `report.findings` | **Rejected by checks**, with the report |
| `npm ci`, the build or `profile-check` failed in the build job | build job red; findings in its `profile-check` step | **Build failed**, with the tail of `build.log`: the build output, then the checker's report when `profile-check` ran |
| upload refused (403, 429) | deploy job red; the error JSON | nothing recorded |

- **Failed deploys.** A failed or rejected deploy leaves the previous version live. The config page can roll back
  to any earlier ready deployment.
- **Workflow changes.** Keep added third-party steps in **build**, never in **deploy**: any step in the deploy job
  can obtain that job's token. The repository variable `PROFILE_API_URL`, when set, sends uploads to another
  platform instance; leave it unset.
- **Source archive.** The platform keeps the source archive only while **Allow forks** is on. To never upload it,
  remove the `git archive` step and the `source` artifact upload.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `contract.missing_<action>` | a required control is missing, or its value is computed or only in a comment | use the SDK component, or write `data-pf-action="<action>"` literally on the control |
| `sdk.missing_marker` | the bundle does not use `@divr/profile-sdk`, or a build step stripped its `__pf_sdk_version__:` string | import and use `ProfileAPI` from `@divr/profile-sdk`; do not strip that string |
| `sdk.newer_than_platform` | installed SDK major.minor is above the platform's (`verify` reports it only when online) | install the version the message names (`npm install @divr/profile-sdk@<version>`), verify, push |
| `sdk.unsupported_bridge` | SDK too old for the platform | `npm run update-sdk` |
| `structure.missing_index`, `structure.missing_viewport` | no `index.html` at the root of `dist/`, or no viewport meta | restore `index.html` and its `<meta name="viewport">` |
| `archive.too_many_entries`, `archive.too_large` | more than 100 entries or 5 MB | remove or compress assets; keep `sourcemap: false` |
| `archive.extension`, `archive.bad_path`, `archive.duplicate_path` | file type not allowed; path segment not matching `[A-Za-z0-9][A-Za-z0-9._@+~-]{0,127}`; names differing only in case | convert or remove the file; rename it |
| `forbidden.form`, `forbidden.password_input` | a `<form>` or password input, often from a library | buttons with click handlers; drop the library |
| `forbidden.webassembly`, `forbidden.wasm_file`, `forbidden.rtc_peer_connection`, `forbidden.miner` | banned code, usually from a dependency | remove it |
| `secrets.<kind>` | a credential in a text file of `dist/` (source maps count) | remove it from the source and rotate it; it became public when it was pushed |
| `profile-check: warning: … newer than this copy` | the platform runs a newer checker | `npm run update-sdk`, then verify again |
| `profile-preview: warning: no preview written: …` | no `playwright-core`, or no Chromium it could launch | install Chrome or Edge, pass `--browser <path>`, or `npx playwright-core install --only-shell chromium`; the deploy works without the image |
| `profile-preview: warning: the profile had not made every required read` | the page had not called `profile.get`, `followers.count`, `following.count` and `posts.list` within 10 s | the preview shows a loading state; make the reads on mount |
| works in `npm run dev`, broken or blank live | something the sandbox or CSP blocks: remote asset, `fetch`, storage, `eval`, inline script, absolute asset path | read the browser console on the live profile; bundle the asset, remove the call, keep `base: './'` |
| browser automation times out on a visible control ("element is not stable"), or screenshots never match | the page or the control moves continuously | see [Pages that keep moving](#pages-that-keep-moving) |
| a click does nothing live (`sdk.ui_refused` in the console) | not called from a real click, target not from a read, a platform dialog open, or two actions in a row | call the method synchronously in the handler, with values from reads |
| `contract.missing` recorded for the live profile | a required read is not made within 10 s | make all four reads on mount at every width |
| deploy job 403 `oidc_claim_rejected` | repository owned by an organisation; no Divr account for the owning GitHub account; account suspended; not `main`; account linked to another repository, or repository linked to another account | use a repository under the account owner's personal GitHub account; unlink the old repository on the config page |
| deploy job 429 `daily_cap_reached` | the account's deploys for this UTC day are used up (failed and rejected ones count) | wait for the next UTC day; verify locally before pushing |
| build job fails at `npm ci` | lockfile out of sync with `package.json`, or a different Node major | `npm install` with the `.nvmrc` version, commit the lockfile |
| build fails in CI but not locally | install script skipped by `--ignore-scripts`; import path differs in letter case (the runner is Linux) | avoid packages that need install scripts; match file name case exactly |
