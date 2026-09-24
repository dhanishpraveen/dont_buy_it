# Prototype Flow

Phase 0 establishes the foundation only. Product screens are intentionally not implemented yet.

## Intended product path

1. A user enters a natural-language access request.
2. The backend extracts structured requirements with Gemini or a deterministic mock fallback.
3. The backend retrieves mock or database-backed resources.
4. The deterministic scoring engine compares access options.
5. Ownership analysis estimates whether borrowing, sharing, or buying is the most sensible path.
6. The application returns ranked options, a recommendation, and an explanation grounded in application data.

## Future screen groups

- Public: home, how it works, community, about, sign up, and login.
- Authenticated: dashboard, browse, item details, requests, listings, messages, saved items, community feed, and settings.
- Workflow: add listing, review listing, send borrow request, request details, notifications, help, issue report, and location selection.

The supplied screenshots remain the source of truth for these screens. New product behavior should fit the existing visual language and navigation patterns.