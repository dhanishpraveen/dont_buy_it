# Don't Buy It Design System

The supplied desktop PDF and screenshots in `docs/design-reference/` are the visual source of truth. This document records the reusable approximations for implementation; future screens should preserve the reference structure instead of redesigning it.

## Visual direction

Warm, editorial, community-oriented, and quietly sustainable. Pages use an off-white canvas, espresso text, sage accents, brown actions, thin outlines, rounded surfaces, and generous whitespace. Motion should be limited to purposeful loading and state transitions.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#F6F1E8` | Page background |
| `surface` | `#FFFDF8` | Cards, inputs, panels |
| `ink` | `#3B2A20` | Primary text and headings |
| `muted` | `#776A5F` | Supporting text |
| `line` | `#DED5C8` | Borders and dividers |
| `bark` | `#704B36` | Primary buttons and strong actions |
| `sage` | `#71856B` | Sustainability accents, links, status |
| `sage-soft` | `#E2E9DD` | Soft badges and selected states |

Exact screenshot values are not available from the source assets, so these values are intentionally centralized approximations. They live as CSS variables in `src/styles/index.css` and are exposed through the Tailwind theme.

## Typography

- Display: Fraunces, 500-700, for editorial headings.
- Body: DM Sans, 400-700, for navigation, labels, and readable UI text.
- Handwritten accent: Caveat, 500-600, used sparingly for brand or community annotations.
- Base size: 16px; body line-height: 1.5; compact labels: 14px.
- Heading line-height: 1.1-1.25; avoid all-caps body copy.

## Shape and depth

- Card radius: 16px.
- Control radius: 8px.
- Default border: 1px `line`.
- Soft shadow: `0 8px 24px rgba(59, 42, 32, 0.08)`.
- Avoid nested cards and heavy shadows.

## Layout

- Content max-width: 1200px (`max-w-7xl`), with 24px mobile and 40px desktop gutters.
- Public navbar target height: 72px.
- Authenticated sidebar target width: 248px.
- Primary button target height: 44px; compact button: 36px.
- Input target height: 44px.
- Icon sizes: 16px compact, 20px default, 24px prominent.
- Responsive breakpoints: 640px, 768px, 1024px, and 1280px, using Tailwind defaults.

## Components

Build reusable primitives in `src/components/ui/`, then compose them into `layout/`, `navigation/`, `items/`, `forms/`, `recommendation/`, and `ai/`. Keep mock data in `src/data/`; keep server data and business logic in `server/`.