# Profile template

A starter for your profile: a small static web app that the platform shows inside a sandboxed frame on your profile page. This repository contains:

- a working example profile (React, Vite, Tailwind) that uses every required API and control;
- one dependency, `@divr/profile-sdk`: the profile SDK with a mock mode for working offline, its React bindings, and the `profile-check` command, which runs the same static checks the platform runs on every deploy;
- a GitHub Actions workflow that builds the profile and uploads it when you push to `main`.

Everything here is yours to change, including the workflow. Any toolchain works, as long as it produces a static `dist/` that passes the checks below.

This repository is generated from the platform's source on every release and tagged `sdk-v<version>` with the SDK version it pins, so pull requests here are not merged; report problems in [Issues](https://github.com/open-divr/profile-template/issues).

## Setup

1. On GitHub, click **Use this template** and create the repository under your own account (public or private). The platform links deploys to the account that owns the repository, so organisation repositories cannot deploy.
2. Clone it and install:

   ```sh
   git clone https://github.com/<you>/<repo>.git
   cd <repo>
   npm ci
   ```

   Use the Node version in `.nvmrc` (24). `@divr/profile-sdk` is an ordinary npm package and installs with everything else.
3. Run `npm run dev` and open the printed URL. The page runs on fixture data; a toolbar in the bottom-right corner switches scenarios and viewport widths.
4. Run `npm run verify` until it passes.
5. Push to `main`. The **Deploy profile** workflow builds the profile, checks it and uploads it. The result, including any findings, shows on your profile's config page and in the Actions log. A failed deploy leaves the previous version live.

## Commands

| Command | Does |
| --- | --- |
| `npm run dev` | Vite dev server on fixture data, with the dev toolbar for scenarios and viewport widths |
| `npm run build` | Type-checks and builds the static site into `dist/` |
| `npm run preview` | Serves the built `dist/` locally |
| `npm run typecheck` | Type-checks only, without building |
| `npm run verify` | `build`, then `profile-check dist`: the same checks and report the platform produces on deploy. Online, it asks the platform which checker version it runs and judges the SDK check against that version, as the deploy will; offline, it judges against its own |
| `npm run update-sdk` | `npm install @divr/profile-sdk@latest`: the one command that updates the SDK, its React bindings and the checker together (they are one package with one version) |

When `verify` warns that the platform runs a newer checker, run `npm run update-sdk`, rebuild and verify again. When it reports `sdk.newer_than_platform`, the installed SDK is ahead of the platform: install the version the message names (`npm install @divr/profile-sdk@<version>`) and rebuild.

## Project layout

```
AGENTS.md                      instructions for coding agents: setup, API, rules, checks before each push, updates
.github/workflows/deploy.yml   build on push to main, then upload with the run's GitHub identity
scripts/deploy.sh              the upload step (curl and tar only)
index.html                     page shell; keeps the viewport meta tag
vite.config.ts                 relative asset paths, no inline scripts, no module-preload helper
src/main.tsx                   creates the SDK and renders the app
src/App.tsx                    page layout: two columns from 1024 px, one column with a menu of sheets below
src/layout.ts                  which layout applies (a media query)
src/components/                ProfileHeader, About, FollowersBox, PostList, Projects, MoreMenu, Water, Avatar,
                               ErrorBoundary, ui (panels, icons, error notes)
src/water.ts                   the shape of the water's crests
src/index.css                  Tailwind, the bundled Figtree font and the colour/type tokens
src/assets/                    the font files (with their licence) and the no-photo picture
```

## API reference

```ts
import { ProfileAPI } from '@divr/profile-sdk';

const api = new ProfileAPI(); // { mode?: 'auto' | 'live' | 'mock', scenario?: MockScenario }
```

Reads return public data only, the same for every viewer. The two things the profile learns about who is looking are whether it is the owner (`viewerIsOwner()`) and whether they follow the owner (`viewerFollowsOwner()`).

A profile must call the four required reads within 10 seconds of loading; the platform records each one it does not call as `contract.missing`, which admins see when reviewing reports about the profile. The optional reads may be left out.

| Method | React hook | Required | Returns |
| --- | --- | --- | --- |
| `getProfile()` | `useProfile()` | yes | `{ id, handle, name, description, avatarUrl, profileUrl, links }` |
| `getFollowerCount()` | `useFollowerCount()` | yes | `number`: how many accounts follow the owner |
| `getFollowingCount()` | `useFollowingCount()` | yes | `number`: how many accounts the owner follows (the list itself is not exposed; the platform shows it) |
| `getPosts({ cursor? })` | `usePosts()` | yes | a page of posts, newest first, 10 per page |
| `getFollowers({ cursor?, limit? })` | `useFollowers({ limit })` | no | a page of `{ handle, name, avatarUrl }`, newest first; `limit` 1–50 |
| `getGithubProjects()` | `useGithubProjects()` | no | 0–6 `{ name, description, url, stars, language }` |
| `viewerIsOwner()` | `useViewerIsOwner()` | no | `boolean`: true when the owner is looking at their own profile; false in mock mode. Never rejects. The hook is `undefined` until the platform answers, before any read returns |
| `viewerFollowsOwner()` | `useViewerFollowsOwner()` | no | `boolean`: true when the viewer follows the owner; false when signed out. Never rejects. It changes when the viewer follows or unfollows, and `viewer.changed` fires after it does (the hook follows it). In mock mode it starts false and flips with each `openFollow()` |

A page is `{ items, nextCursor }`; pass `nextCursor` back for the next page (`null` means the end). A post is:

```ts
type Post = {
  id: string;
  author: { handle: string; name: string; avatarUrl: string };
  createdAt: string;                  // ISO 8601, UTC
  text: string | null;
  link: string | null;
  images: { url: string; width: number; height: number; alt: string }[];
  repostOf: Post | null;              // set on reposts, which have no text, link or images of their own
  counts: { likes: number; dislikes: number; comments: number; reposts: number }; // of the original on reposts
};
```

Actions ask the platform to act. They return nothing, and the profile never learns what the viewer did in a platform dialog; the one exception is following, which changes `viewerFollowsOwner()`:

| Method | Opens |
| --- | --- |
| `react(postId, 'like' \| 'dislike')` | the post sheet with Like or Dislike pre-selected |
| `openComments(postId)` | the post sheet on its comments |
| `openRepost(postId)` | the post sheet on Repost / Undo repost |
| `openFollow()` | Follow / Unfollow for the profile's owner: follows at once when the viewer does not follow them, asks before unfollowing when they do (signed out: the sign-up prompt) |
| `openMore()` | the More dialog for the profile's owner (block or unblock, report) |
| `openFork()` | the Fork sheet for this profile: use it as my profile, or download its source when the owner shares it |
| `openFollowers()` | the owner's Followers page |
| `openProfile(handle)` | another profile this page received (a follower, a post author) |
| `openLink(url)` | a "You're leaving for …" page for a URL this page received |

Actions only work from a real click or key press inside the profile, while no platform dialog is open, and only for posts, handles and URLs the page itself received through a read. Anything else is refused.

`api.on(event, callback)` returns an unsubscribe function. The events:

| Event | Fires | The React hooks that refetch |
| --- | --- | --- |
| `counts.changed` | when a platform dialog closes, and right after every `viewer.changed` | `useFollowerCount`, `useFollowingCount`, `useFollowers`, `usePosts` |
| `posts.changed` | after the owner posts | `usePosts` |
| `viewer.changed` | when the viewer follows or unfollows the owner, from any control | `useViewerFollowsOwner` |

`useProfile`, `useGithubProjects` and `useViewerIsOwner` read once per page load.

Reads reject with a `ProfileApiError` whose `code` is `rate_limited` (with `retryAfterMs`), `not_allowed`, `not_found` or `unavailable`. Reads are limited to 20 per second, with bursts up to 40, and the platform caches identical reads for 60 seconds. Load data when it is needed and page on scroll; never poll. Uncaught errors in your page are reported to the platform automatically. `api.reportError(err)` reports one you caught yourself.

**React components** (`@divr/profile-sdk/react`):

- `<ProfileProvider api?>` provides the SDK to the hooks.
- `<PostActions post>` renders Like, Dislike, Comment and Repost. Style it with `className` / `buttonClassName` and change the text with `labels`.
- `<FollowButton>`, `<MoreButton>` and `<ForkButton>` are the three owner controls. They render nothing on the owner's own profile. `<FollowButton>` is one button that reads Follow, then Unfollow once the viewer follows the owner; give it a function child, `{(following) => …}`, to keep a custom label in step (the template's header does). More and Fork keep static labels: whether the owner allows forks is the platform's to say in its sheet.
- `<LoadMoreSentinel onVisible disabled>` loads the next page when scrolled into view.
- `<LoadMoreButton>` is an explicit "load more" control.

**Mock mode.** The SDK uses fixtures whenever the page is not inside the platform's frame (`npm run dev`, `npm run preview`). Pick a scenario with `?scenario=` or the toolbar:

- `typical`
- `empty`
- `heavy`: 1,500 followers and 240 posts
- `long-text`: every text at its maximum length
- `no-projects`

Add `?pfDebug=1` to log every call. In mock mode, each action shows a toast describing what the platform would open, or why it would refuse.

## Rendering rules

Your profile can look and behave however you like, as long as these hold.

**Required, visible to every viewer:**

| Item | How |
| --- | --- |
| Name, avatar, description | the name as text, the avatar as `<img src={avatarUrl}>` (already circular), the description as text (it may be empty) |
| Follower and following counts | both numbers |
| Follow control | one control with `data-pf-action="follow"` that calls `openFollow()` |
| More control | one control with `data-pf-action="more"` that calls `openMore()` |
| Fork control | one control with `data-pf-action="fork"` that calls `openFork()` |
| Posts | each post's content, and per post Like, Dislike, Comment and Repost controls (`data-pf-action` `like`, `dislike`, `comment`, `repost`) |
| Paging | the next page of posts through a scroll sentinel or a `data-pf-action="load-more"` control |
| Followers (optional) | if you fetch them: each follower's name and avatar. A control that calls `openFollowers()` is optional too; the platform lists followers and following on its own pages either way |
| Projects (optional) | if you fetch them: each project's name and link |
| Links (optional) | if you show them: each link |

**Rules:**

- Required items must be real HTML text and `<img>` elements. Canvas and WebGL are fine for decoration only.
- The Follow, More and Fork controls may be left out while `viewerIsOwner()` is true; the SDK's buttons already are.
- Custom controls are allowed if they carry the same `data-pf-action` value and call the same method. Write the value as a literal next to the attribute (`data-pf-action="like"`). A value computed at run time cannot be found by the checker.
- Outbound links must call `openLink(url)`. `<a target="_blank">`, `window.open` and navigating the frame are all blocked.
- The content security policy blocks `fetch`, XHR, WebSockets and beacons, so import any JSON data at build time. It does not stop `RTCPeerConnection` in recent Chrome and Firefox: that is forbidden below, and the checks look for it.
- Everything comes from your bundle. Images can also come from the platform's own image URLs, `data:` or `blob:`. Fonts must be bundled; remote fonts, scripts and stylesheets are blocked.
- There are no cookies or storage: the frame has no origin of its own, so `localStorage` and friends throw.
- No forms, password fields, WebAssembly, workers, pop-ups, `RTCPeerConnection` or crypto miners.
- Audio and video from the bundle may play on click (browsers block autoplay).
- The layout must work at 375 px and 1280 px wide. The frame fills the page below the platform bar and scrolls by itself.
- On narrow screens, required items stay on the page itself; a long description may be clamped behind a "Read more" control. Optional items may move behind a control, such as a menu that opens them in a sheet (the template does this below 1024 px).
- Keep `<meta name="viewport">` in `index.html`.
- Build with relative asset paths (`base: './'` in Vite). The deploy path is not known at build time.

## The checks the platform runs

Every deploy goes through the same static checks as `npm run verify`. They read the bundle's bytes and never run them. Every finding blocks the deploy.

| Check | Blocks when |
| --- | --- |
| Archive | more than 100 entries or 5 MB unpacked; links or special files; a file type outside the allowlist; a path segment not matching `[A-Za-z0-9][A-Za-z0-9._@+~-]{0,127}`, deeper than 16 levels or longer than 512 bytes; two paths that differ only in case |
| Structure | no `index.html` at the root, or no `<meta name="viewport">` in it |
| SDK | the bundle does not contain the SDK, uses a bridge version the platform no longer supports, or was built with an SDK whose major or minor version is newer than the platform's (a newer patch is allowed) |
| Contract | no `data-pf-action` value for each of `follow`, `more`, `fork`, `like`, `dislike`, `comment`, `repost` |
| Forbidden | `<form`, password inputs, `.wasm` files or `WebAssembly.`, `RTCPeerConnection`, known in-browser miners |
| Secrets | private keys and access tokens (AWS, Google Cloud, GitHub, Slack, Stripe, npm and similar) in any text file |

Allowed file types: html, js, mjs, css, json, map, png, jpg, jpeg, gif, webp, avif, svg, ico, woff, woff2, ttf, otf, mp3, ogg, wav, m4a, mp4, webm, txt.

These checks cannot prove that the page shows the required items; they look for the SDK and the control markers. The platform also notices when a live profile never loads its required data, and viewers can report profiles. Moderators can hold a profile that hides required items, which takes it offline until they clear the hold.

## How deploying works

`.github/workflows/deploy.yml` has two jobs:

- **build** runs your code and dependencies: `npm ci --ignore-scripts`, `npm run build`, `profile-check dist`. It then uploads `dist/` as an artifact, and `git archive` of the commit (`source.tar.gz`) as a second one. This job has read-only access and cannot obtain a deploy token.
- **deploy** runs only `scripts/deploy.sh` (curl and tar, no npm). It asks GitHub for this run's identity token, which proves which repository, owner and branch the upload comes from. It then sends `dist/` as a `tar.gz` to the platform's `/v1/deploy`, with the source archive as a second part. If the build failed, it sends the last 64 KB of the build log to `/v1/deploy/failure` instead, so the failure shows on your config page.

The source archive is for members who fork your profile. The platform keeps it only when you have turned on **Allow forks** on your config page (off by default); otherwise it is discarded on arrival. It must stay under 5 MB and 2,000 entries and is scanned for secrets; a finding discards the archive and deletes the previous one without affecting the deploy itself. One archive is kept per account, replaced by every deploy that goes live. Remove the `git archive` step and the `source` artifact from the workflow if you never want it uploaded.

### Forks

Every profile shows a Fork control (the `<ForkButton>`, and the platform's own button in its bar). For a signed-in viewer it opens a sheet with up to two choices, both of which only work while you allow forks:

- **Use as my profile** copies your live bundle byte for byte into a deployment of the viewer's own account.
- **Fork the source** (only when the archive of your live version is stored) unlinks the viewer's repository and hands them a short-lived download link plus the commands that turn the archive into a new private repository. Their first push deploys the fork.

Turning **Allow forks** off deletes the stored archive at once and refuses both choices from then on; copies already made stay with the members who made them.

The platform accepts only uploads from `main` of a repository owned by your account. Your first deploy links your profile to that repository; you can unlink it on the config page. A newer upload replaces the live version as soon as it passes the checks, and pushing again cancels a run still in progress. Any third-party step you add to the **deploy** job could obtain that job's token, so keep extra steps in **build**.

## Privacy notes for authors

- **Your bundle is public.** Anyone can download the deployed files, including comments, source maps and bundled JSON. Never put secrets, private notes or other people's personal data in the repository's build output. The secrets check is a safety net, not a guarantee.
- **What the platform stores about a deploy:** the bundle files; the check report; the SDK and checker versions; and the repository ID, commit SHA and workflow run from the upload's GitHub identity token. For a failed build it also stores the uploaded log tail. Avoid printing anything sensitive during the build.
- **Your source is shared only when you say so.** The `source.tar.gz` your workflow uploads is kept only while **Allow forks** is on, and then any signed-in member can download it from the Fork sheet; it is deleted the moment you turn forks off. `git archive` packs the committed tree only (no `.git` history, nothing ignored by `.gitattributes export-ignore`), but it does include every committed file: keep secrets and private notes out of the repository, not just out of `dist/`.
- **What the platform records at run time:** uncaught errors from your page (message and stack, truncated), and counts of refused or rate-limited SDK calls per deployment. Admins use these when reviewing reports; nothing about your viewers is involved.
- **What your viewers keep private from you.** The SDK never tells the profile who is viewing it. It tells the page two facts, whether the viewer is the owner and whether they follow the owner, so the owner controls can hide on your own profile and the Follow control can read Unfollow. The sandbox blocks the page's requests to other sites, but three things get past it. `openFollow()` called from any click or key press follows your profile at once for a signed-in viewer who does not follow it yet, without their asking, so call it only from a Follow control. A link you offer through `openLink(url)` can be chosen by those two facts; the viewer sees the address and presses Continue, and the site it opens sees the address and the viewer's IP address. And in recent Chrome and Firefox `RTCPeerConnection` still works despite the restriction the platform sends to block it; the terms forbid it and the checks look for it, but the browser does not enforce the restriction. Nothing a viewer does in a platform dialog is reported back, beyond a follow or unfollow changing `viewerFollowsOwner()`, and a signal, whenever any platform dialog closes, that counts may have changed.

## Rehearsing against a tunnel

To test the whole pipeline against a platform instance other than the default (for example, a local stack exposed through a tunnel):

1. In your repository, go to **Settings → Secrets and variables → Actions → Variables** and add a variable `PROFILE_API_URL` with the instance's origin, e.g. `https://example-tunnel.trycloudflare.com`.
2. That instance must accept this origin as its token audience, because the deploy token is issued for exactly the URL it is sent to.
3. Push to `main` or use **Run workflow**. The deploy job uploads to `PROFILE_API_URL`. Delete the variable to go back to the default.

To compare your checker with that instance's, run `API_URL=https://example-tunnel.trycloudflare.com npm run verify`.
