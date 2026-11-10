---
type: feature
---
# The map shows the signed-in user's own posts as pins across NYC

## Why
Each pin is a place you went and photographed. As you go out, the map fills
up, which is the reward for the landing page's "Get out there." Tapping a pin
brings back the photo you took there.

## Where it lives
- `packages/domain/src/posts.ts`: `listMyMapPosts`
- `apps/web/app/map/page.tsx`: the `/map` route (a server component) and
  its header pill
- `apps/web/components/MyMap.tsx`: the map itself (a client component)
- `apps/web/components/PostCard.tsx`: the card a pin opens
- `apps/web/app/maplibre-worker.mjs/route.ts`: serves MapLibre's web worker
- Photo bytes come from `GET /api/posts/:postId/photo`
  ([posts/post-photo.md](../posts/post-photo.md)). The card's like control is
  `LikeButton` ([posts/like-button.md](../posts/like-button.md)).

## Behavior
- **Which posts.** `/map` shows only posts the current user wrote. Other
  people's posts never appear, not even `PUBLIC` ones. Soft-deleted posts
  never appear.
- **Where.** Only posts inside the NYC box appear: longitude −74.26 to
  −73.70, latitude 40.49 to 40.92. A post outside the box is left out of
  the response, not just hidden by the map.
- **How many.** At most 500 pins, the newest by `createdAt`. That number
  is the contract.
- **Data path.** The page loads the posts on the server and passes them to
  the map. A post on the page carries only `id`, `caption`, `latitude`,
  `longitude` and `createdAt`. The blob name is never sent to the browser.
- **The map.** It fills the viewport (`100svh`) with a MapLibre GL map on
  the OpenFreeMap `positron` base style, repainted in the ClickJournal map
  palette ([design-system.md](../design-system.md#map)) by
  `apps/web/components/map-theme.ts`. The map looks the same in light and
  dark mode. Panning is limited to the NYC box. The map first fits all the
  pins, or the whole box when there are none. The street grid and street
  names stay hidden below zoom 15.
- **Header pill.** A glass pill floats at the top center. It holds the
  "ClickJournal" wordmark, which links to `/` with a 44px target, and the
  count of pins on the map ("1 place" / "{n} places"). It comes first in
  the tab order, ahead of the map and pins.
- **Pins.** Each pin is a 44×44px `<button>` holding a 40px square photo
  frame. The frame shows the post's photo from
  `GET /api/posts/:postId/photo`, loaded lazily. If the photo fails, the
  frame shows an ice tile with a camera mark. The accessible name is "Post
  from {date}". Pins are in the tab order. Click, Enter or Space opens that
  post's card. The frame grows 1.25× on hover or focus and 1.5× while its
  card is open, and the open pin sits above its neighbors. The button
  itself never moves.
- **Card.** It is a frosted-glass panel
  ([design-system.md](../design-system.md#glass)) showing the photo, the
  caption if there is one, the date, and `LikeButton`. It is a bottom sheet below 768px and a side panel from
  768px up. Only one card is open at a time, so opening another pin
  replaces it.
  - If the photo request fails (any non-2xx), the card shows a "Photo
    unavailable" placeholder. Caption, date and likes still render.
  - Close with the close button or Esc. Focus returns to the pin that
    opened the card.
- **Empty state.** With zero posts, a centered message reads "No places
  yet. Get out there." It has no button, because creating posts doesn't
  exist yet.
- **Failure.** If the posts query throws, the page shows the Next.js error
  page. No raw error text reaches the client.

## Examples

| State / input | Behavior |
|---|---|
| Demo user has 3 posts in Manhattan | 3 photo-frame pins, map fitted to them |
| Another user has a `PUBLIC` post in Brooklyn | Not on the demo user's map |
| A post at lat 34.05, lng −118.24 (LA) | Not in the response |
| A soft-deleted post | Not in the response |
| User has 600 NYC posts | The 500 newest are pinned |
| User has no posts | Empty-state text, the map of NYC, and "0 places" in the pill |
| A post whose blob is missing | Its pin is an ice frame with a camera mark. Its card shows "Photo unavailable", caption, date, like button |
| A post with a photo | Its pin shows that photo in a white square frame |
| Tab from page load | The ClickJournal link, then the map, then the pins |
| Tab to a pin, Enter, then Esc | Card opens, then closes. Focus is back on that pin |
| Drag the map toward New Jersey | Stops at the NYC box edge |
| Zoom from 12 to 15 | No street grid until 15. Buildings fade in from 13 |

## Verify
- `pnpm test:integration` (`tests/integration/map-posts.test.ts`), `pnpm typecheck` and
  `pnpm build` all pass.
- `pnpm dev`, then `pnpm db:seed`, then open `http://localhost:3000/map`.
  The seeded demo posts show as pins in NYC.
- `curl -s -H 'x-user-id: nobody' localhost:3000/map | grep 'No places yet'`
  matches.
- Keyboard-only pass: Tab reaches the pins, Enter opens a card, Esc closes
  it and focus returns.
- Check at 375px and 1440px wide, in light and dark mode.

## Constraints & decisions
- Own posts only, because the map is a personal journal of where you've
  been. Friends' and public posts would need the Friendship model and
  their own spec.
- Pins are DOM markers, not a WebGL symbol layer, so they can take
  keyboard focus and hold an `<img>`. The 500 cap keeps that fast.
- Pin frames load the original photo, up to 5 MB each, shrunk in CSS.
  `loading="lazy"` limits this to pins near the viewport, and the card
  reuses the same cached URL. A thumbnail endpoint is the fix if this gets
  heavy. See Out of scope. Clustering is the change to
  make if the cap ever has to rise.
- Tiles come from OpenFreeMap: free, no API key, vector tiles. This adds
  one npm dependency, `maplibre-gl`. The browser fetches tiles from
  `tiles.openfreemap.org`. No user data goes in those requests.
- MapLibre's worker is served same-origin from `/maplibre-worker.mjs`, read
  from the installed `maplibre-gl` package, and set with `setWorkerUrl`.
  MapLibre's default lookup, next to its own script, breaks once Next
  bundles the library. Reading the worker from the package keeps it
  version-matched, with no copy checked into `public/`.
- MapLibre places a marker by writing `transform` on the marker element,
  so the pin button must never set `transform` itself. Any visual change
  goes on the inner dot. Scaling the button made pins jump on hover.
- Elevation relief comes from AWS Terrain Tiles, fetched by the browser
  from `s3.amazonaws.com/elevation-tiles-prod` and credited in the map
  attribution. It's a second tile host besides OpenFreeMap. Like the base
  tiles, no user data goes in those requests.
- The box is a rough rectangle, so it includes slivers of NJ and Nassau.
  Matching borough boundaries exactly isn't worth the complexity.

## Out of scope
- Creating posts and uploading photos. There is no spec yet.
- Friends' and public pins, and clustering. There is no spec yet.
- Redirects between `/` and `/map` based on sign-in. That belongs to the
  auth spec, which does not exist yet.
- Photo thumbnails and resizing ([posts/post-photo.md](../posts/post-photo.md)
  serves the original).
