# Don't Buy It: Project Instructions

## Product

Don't Buy It is an AI-powered access decision platform. It helps people borrow, share, and access items rather than purchasing them unnecessarily.

## Phase 0 boundaries

- Keep this phase limited to project foundation, documentation, tokens, and configuration.
- Do not add product pages, AI behavior, scoring, or recommendation behavior until the next implementation phase.

## Architecture

- Keep the React client in `src/` and the Express API in `server/`.
- Frontend calls the backend API for protected or data-backed operations.
- Keep business logic separate from route handlers and UI components.
- Keep MongoDB, Gemini, JWT, and other secrets server-only and loaded from environment variables.
- Prefer React hooks and Context API when shared client state is needed. Do not add Redux without a demonstrated need.

## AI boundary

- LLMs extract requirements and write explanations only.
- Deterministic application code owns retrieval, scoring, ranking, ownership analysis, and the final recommendation.
- Never allow an LLM to invent prices, distances, availability, trust scores, savings, or item listings.
- Preserve a deterministic mock fallback so the core demo works when Gemini is unavailable.

## UI language

- Treat `docs/design-reference/` and `docs/Don't_Buy_It_Desktop.pdf` as the visual source of truth.
- Preserve warm/off-white surfaces, espresso typography, muted sage sustainability accents, brown primary controls, rounded cards, thin borders, restrained shadows, and generous whitespace.
- Use tokens from `src/styles/index.css` and `tailwind.config.ts`; do not scatter new raw visual values through components.
- Use Lucide React for interface icons. Avoid introducing dark mode, glassmorphism, neon colors, or generic AI dashboard styling.

## Validation

- Run `npm run build` after frontend configuration or component changes.
- Run `npm run build:server` after API or server changes.
- Add focused Vitest tests for frontend/unit behavior and Supertest tests for API behavior as those areas are implemented.