---
type: feature
---
# The landing page invites a visitor outside and offers sign up or sign in

## Why
The landing page is a first-time visitor's first look at ClickJournal. In
one screen it should make them want to go outside and photograph their
city, then let them sign up or sign in. Nothing else.

## Where it lives
- `apps/web/app/page.tsx`: the `/` route, a server component with no data
  fetching.
- `apps/web/app/layout.tsx`: the shell, which must allow full-bleed pages
  (see [design-system.md](../design-system.md)).
- `apps/web/public/landing/hero.jpg`: the hero photograph, 2400×3600 JPEG.

## Behavior
- `/` renders one full-viewport screen (`100svh`): a full-bleed outdoor
  city-street photograph, covered by a `scrim`, behind centered content.
  The photo is portrait (2:3). `object-cover` crops it to the viewport
  around a focal point at 50% / 55%, which keeps the street and its
  taillights in frame at landscape sizes.
- The content, top to bottom:
  - the wordmark "ClickJournal"
  - the headline "Get out there."
  - one line of subcopy: "Photograph your city, one place at a time."
  - two actions, side by side, wrapping onto two lines below 360px:
    - **Sign up**: a link to `/sign-up`, `signal` fill, `on-signal` text. This is
      the screen's one accent element.
    - **Sign in**: a link to `/sign-in`, a white outline on the photo.
- The page has exactly two interactive elements. There is no nav menu,
  footer links, or scroll content.
- The hero image is served with `next/image`, using `priority` and
  `sizes="100vw"`, and has empty `alt`, because it is decorative.
- The headline fades and rises in once, in 400ms. Under
  `prefers-reduced-motion` it appears with no motion.
- The page reads no user and no database, so it renders the same for every
  visitor and is statically prerendered.
- If the image fails to load, the `night` background shows and the
  text and actions still render and stay readable.

## Examples

| State / input | Behavior |
|---|---|
| `GET /` | 200. HTML contains links with `href="/sign-up"` and `href="/sign-in"` |
| Keyboard: Tab from page load | Focus lands on Sign up, then Sign in, then leaves the page. Each shows the `signal` focus ring |
| Viewport 320px wide | No horizontal scroll. The two actions stack |
| `prefers-reduced-motion: reduce` | Headline is visible immediately, with no animation |
| Hero image 404 | Text and both actions are still visible on the fallback background |
| Click Sign in today | `/sign-in` returns 404 until auth exists (see Out of scope) |

## Verify
- `pnpm typecheck && pnpm build` passes, and the build output lists `/` as
  static (○).
- `curl -s localhost:3000/ | grep -oE 'href="/sign-(up|in)"'` prints both
  hrefs.
- Keyboard-only pass: there are exactly two tab stops, both with a visible
  focus ring.
- In DevTools, check the 320px viewport, emulate reduced motion, and block
  `hero.jpg`. Each case matches Examples.

## Constraints & decisions
- The page offers two actions and nothing else, because the design system
  allows at most two choices per screen.
- It is static, with no `currentUserId()`. The dev identity stub always
  returns a user, so the page cannot tell who is signed in until real auth
  exists.
- The font comes from `next/font/google`, which is part of Next. It adds
  no npm dependency, but `pnpm build` needs network access the first time
  it fetches the font.
- The hero photo must be licensed for use, such as an Unsplash/Pexels
  license or our own photo. It is never a screenshot of another site.

## Out of scope
- The `/sign-up` and `/sign-in` pages, and redirecting signed-in users from
  `/` to the map. These belong to the auth spec, which does not exist yet.
- The NYC map for signed-in users. Its spec does not exist yet.
- Marketing sections below the fold.
