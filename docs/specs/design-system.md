---
type: infrastructure
---
# Design system: minimal, punchy, outdoors-first

## Purpose

ClickJournal exists to get people outside, so the UI never competes with the
world it points at. This spec pins down the visual rules every page in
`apps/web` follows: the tokens, type, and interaction rules. A new page is
built from these tokens, not from ad-hoc Tailwind colors.

## Principles

1. **The outdoors is the hero.** Real outdoor photography and the map carry
   the color. Chrome stays quiet: few borders, no decorative gradients, no
   illustration.
2. **One loud thing per screen.** Each screen has a single accent-colored
   element, its primary action. If two things are yellow, one is wrong.
3. **Short words, big type.** Headlines are imperative and under 8 words
   ("Get out there."). Body copy is one or two sentences.
4. **Few choices.** A screen offers at most two actions. Everything else is
   secondary or not on the screen at all.
5. **Legible on any photo.** Text over imagery always sits on a scrim, so it
   meets contrast regardless of the photo.

## Where it lives

- `apps/web/app/globals.css`: tokens, declared in a Tailwind 4 `@theme`
  block so they are usable as utilities (`bg-signal`, `text-ink`, …).
- `apps/web/app/layout.tsx`: loads the typeface through `next/font` and sets
  the body background and text color from tokens. The body sets no width.
  Each page chooses its own container, so full-bleed pages are possible.

## Tokens

The palette comes from the landing hero photograph: overcast-sky whites,
slate-blue street shadows, and one taillight red.

| Token | Light | Dark | Use |
|---|---|---|---|
| `paper` | `#F3F4F1` | `#161B21` | Page background |
| `ink` | `#1C2229` | `#EEF0EE` | Primary text (14.5:1 / 15.1:1 on `paper`) |
| `muted` | `#5A6875` | `#98A4AE` | Secondary text (5.2:1 / 6.8:1 on `paper`) |
| `rule` | `#D5D9DC` | `#2C343C` | Hairlines, input borders |
| `signal` | `#D93025` | `#D93025` | The one accent: primary action fill |
| `signal-strong` | `#C22A20` | `#C22A20` | `signal` on hover |
| `on-signal` | `#FFFFFF` | `#FFFFFF` | Text on `signal` (4.8:1) |
| `night` | `#242A31` | `#242A31` | Background behind a photo, in case the photo fails to load; pin ring |
| `signal-soft` | `#FF9D94` | `#FF9D94` | `signal` as text on glass |
| `ice` | `#EAF4FF` | `#EAF4FF` | Map accents and empty photo frames |

- Dark values apply under `prefers-color-scheme: dark`. Text over a photo
  is always white, whatever the theme.
- **Scrim:** text over a photo sits on `rgb(22 27 33)` (from `night`) at
  0.65 opacity or more behind the text. That keeps white text at 4.5:1 or
  better, even over white sky.
- `signal` is a fill only. It is never used as body text, because it falls
  under 4.5:1 on dark `paper`.

## Map

The map uses the landing hero's colors, pushed in saturation, and is the
same in every color scheme: saturated slate-blue land, navy-black water,
and ice-white accents. The ice is visible at every zoom. At city scale it
comes from crisp shorelines, pale-ice parks and ice motorways. Up close,
towers turn ice white too.

- **Minimal by default.** No street grid, rail, street names, highway
  shields or admin borders. Motorways stay as thin ice lines so the bridges
  keep the boroughs connected. Streets, rail and street names appear only
  from zoom 15 (block level).
- **Buildings** fade in from zoom 13 to 14.5. Low-rise buildings sit one
  step lighter than the land. Towers 45m and taller are ice white, because
  heights only exist from zoom 14.
- **Pins are photo frames:** the post's own photo, 40px square, with a 2px
  white border, a `rounded-sm` (2px) corner and one crisp shadow. There is
  no glow and no red. An empty frame is an `ice` tile with a small camera
  mark.
- Source: `apps/web/components/map-theme.ts` (`MAP_PALETTE`,
  `STREETS_MIN_ZOOM`).

| Role | Color |
|---|---|
| Land | `#3D6488` |
| Water | `#0B1520` |
| Ice (shorelines, towers, empty frames) | `#EAF4FF`, shorelines at 90% |
| Parks | `#A9CDEE` |
| Motorways / streets (zoom 15+) | `#C4DCF2` / `#5A87B0` |
| Buildings, low-rise | `#5583AD` |
| Labels | `#FFFFFF` (cities) / `#D6E6F5` (others), on a `#264563` halo |

## Glass

UI that floats over the map or a photo (cards, map controls) is frosted
glass: the `glass` utility in `globals.css`.

- Surface: `rgb(14 22 32 / .8)`, `backdrop-filter: blur(18px) saturate(160%)`,
  a 1px `white / 14%` border, a 1px inner top highlight, and one deep soft
  drop shadow.
- Text on glass is white (`#FDFFF9`). Secondary text is white at 80%. Red
  text on glass uses `signal-soft` (`#FF9D94`), because `signal` is too dark
  to read there. These hold AA over the brightest thing glass can cover, an
  icy tower: 10.1:1 for white, 7.2:1 for white/80 and 5.1:1 for
  `signal-soft`. That's why the surface is .8 opaque and not lighter.
- Glass is never used on `paper`, only over imagery.

## Type

- One family: **Jost** (geometric sans), loaded with `next/font/google` and
  self-hosted at build time.
- Display: weight 600, tracking `-0.02em`, `clamp(2.5rem, 7vw, 5.5rem)`,
  line-height 1.
- Body: weight 400, 1rem to 1.125rem, line-height 1.5.
- Labels and buttons: weight 500, 0.9375rem.

## Shape & motion

- Radius: `0.5rem` on controls and cards, `9999px` on pills, and
  `0.125rem` on photo frames (map pins). Nothing else.
- Shadows: none on `paper`. Elements floating over a photo or the map get
  one soft shadow, or the `glass` treatment.
- Motion: one entrance per screen at most, 400ms or less, ease-out. All
  motion is off under `prefers-reduced-motion: reduce`.

## Interaction contract

- Every interactive element has a visible focus ring: a 2px `signal` outline
  with a 2px offset, shown on keyboard focus.
- Hit targets are at least 44×44px.
- Text and controls meet WCAG AA contrast: 4.5:1 for body text, 3:1 for
  large text and control boundaries.
- Navigation is a link (`<a>` / `next/link`). An action is a `<button>`.
  A link is never styled as a button just so it can do JavaScript work.
- No horizontal scroll at 320px width.

## Verify

- `pnpm typecheck && pnpm build` passes.
- `grep -rnE "(bg|text|border)-(neutral|gray|slate|zinc|stone)-" apps/web/app apps/web/components`
  finds nothing outside legacy components. New UI uses tokens.
- Keyboard pass on any page: every control shows the `signal` focus ring.
- With OS dark mode on, `paper` and `ink` swap. Text on photos does not
  change.

## Key ADRs

None yet.
