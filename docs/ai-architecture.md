# AI Architecture

## Responsibility boundary

```text
Natural-language request
        |
        v
LLM requirement extraction
        |
        v
Structured requirement JSON
        |
        v
Resource retrieval -> deterministic access scoring -> ownership analysis
        |                                      |
        +--------------> ranked options -------+
                                               |
                                               v
                                  deterministic recommendation
                                               |
                                               v
                                  LLM explanation generation
```

Gemini is the primary provider. The provider interface must be small enough that an OpenAI adapter can be added later without changing routes, scoring, retrieval, or UI code.

## Non-negotiable rules

- The LLM may interpret user language and generate explanations.
- The LLM may not make the final decision.
- Prices, distances, availability, trust scores, savings, and listings must come from application data.
- Deterministic mock extraction and explanation must be available when Gemini is unavailable, misconfigured, or times out.
- Provider failures should become typed service errors and return a graceful API response rather than breaking the critical demo.

## Planned server boundaries

- `server/routes/`: HTTP input and output only.
- `server/services/llm/`: provider interface, Gemini adapter, and mock fallback.
- `server/services/scoring/`: deterministic scoring and ranking.
- `server/services/ownership/`: borrow/share/buy comparison.
- `server/models/`: Mongoose schemas when persistence is introduced.
- `server/data/`: server-side mock resources for development and demos.

No API credential belongs in React source, Vite environment variables exposed to the browser, or committed files.