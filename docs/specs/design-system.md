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

The map is an elevation relief in the landing hero's blues and ice, the
same in every color scheme. All land is colored by height in hard-edged
bands, so low-lying shore and higher ground form an organic pattern like a
flood map. The pattern covers the whole city at every zoom. Water is
navy-black and sits on top of the relief.

| Elevation | Color |
|---|---|
| up to 3m (shoreline lowlands) | `#3D6488` |
| 3–10m | `#7FA8D1` |
| 10–25m | `#C4DCF2` |
| above 25m (high ground) | `#EAF4FF` (ice) |

- **Minimal by default.** No street grid, rail, street names, highway
  shields, admin borders or park fills, so nothing masks the relief.
  Motorways stay as quiet mid-blue lines (`#26476A` at 70%) so the bridges
  read over the water. Streets, rail and street names appear only from
  zoom 15.
- **Buildings** fade in from zoom 13 to 14.5. Low-rise buildings are a
  translucent white wash (28%) that lets the relief show through. Towers
  45m and taller are solid ice.
- **Labels** are navy (`#0B1520`, `#26476A` for minor) on an ice halo,
  because most of the relief is light.
- **Shorelines:** a crisp ice line at 90%.
- **Pins are photo frames:** the post's own photo, 40px square, with a 2px
  white border, a `rounded-sm` (2px) corner and one crisp shadow. There is
  no glow and no red. An empty frame is an `ice` tile with a small camera
  mark.
- Source: `apps/web/components/map-theme.ts` (`RELIEF_BANDS`,
  `MAP_PALETTE`, `STREETS_MIN_ZOOM`). Elevation data is AWS Terrain Tiles
  (Terrarium encoding, free, no API key), drawn with MapLibre's
  `color-relief` layer.

## Glass

UI that floats over the map or a photo is liquid glass: the card, the map
header pill, the map's zoom controls, and buttons sitting on a photo. The
`.glass` class in `globals.css` provides it, and the zoom controls share
the same `--glass-*` variables.

- **Tint:** `rgb(14 22 32 / .8)`.
- **Backdrop:** `blur(20px) saturate(180%) brightness(1.08)`, so the map's
  color glows through.
- **Rim:** a 1px gradient border, brightest at the top-left like light
  catching a glass edge, fading around the shape.
- **Sheen:** a white highlight at 10%, fading out over the top 45%.
- **Depth:** a 1px inner highlight at the top and bottom edges, plus one
  deep soft drop shadow.
- Text on glass is white (`#FDFFF9`), with secondary text at white/80.
  Over the brightest possible backdrop, the tint gives 9.6:1 for white and
  6.9:1 for white/80. Under the sheen it's 7.2:1 and 5.3:1. That's why the
  tint stays at .8 and not clearer.
- Red text on glass uses `signal-soft` (`#FF9D94`). It reaches 4.85:1 on
  the tint but only 3.6:1 under the sheen, so it never goes in the top half
  of a glass panel.
- No refraction (edge distortion). SVG backdrop filters only work in
  Chromium, and the material must look the same in Safari.
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
