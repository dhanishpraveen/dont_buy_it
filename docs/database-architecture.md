# Database Architecture

Phase 11 introduces an optional MongoDB/Mongoose persistence foundation. The existing demo remains deterministic and uses mock data by default.

## Runtime modes

Set these server-only variables in `.env`:

```env
DATABASE_MODE=mock
MONGODB_URI=
```

- `DATABASE_MODE=mock` keeps the Phase 1-10 deterministic demo path.
- `DATABASE_MODE=mongo` requires `MONGODB_URI`, connects during backend startup, and retrieves active listings through Mongoose.
- MongoDB credentials never enter React or API responses.

## Collections and relationships

- `users`: profile, verification status, and deterministic trust summary.
- `items`: physical resources owned by a user.
- `listings`: current access offers for an item, including borrow, rent, buy-used, and buy-new.
- `accessrequests`: future request lifecycle foundation.
- `exchanges`: future handover and return lifecycle foundation.
- `reviews`: bounded ratings linked to an exchange and users.
- `trusthistories`: extensible deterministic trust events.
- `notifications`: future user notification records.

References use MongoDB ObjectIds. Item and user details are populated only inside the backend repository before being mapped to the existing `AccessOption` contract.

## Resource flow

```text
/api/resources/match
        |
        v
resource service -> mock data OR MongoDB repository
        |
        v
AccessOption -> deterministic scoring -> ownership -> recommendation
```

The scoring, ownership, recommendation, Gemini, and frontend contracts are unchanged. MongoDB only replaces the resource data source when explicitly enabled.

## Seed data

With MongoDB running and `.env` configured:

```powershell
$env:DATABASE_MODE = 'mongo'
npm run seed:database
```

The seed imports the existing deterministic demo options and creates related users, items, and listings. It is safe to rerun for the Phase 11 seed records.

## API additions

- `GET /api/resources` returns active resources and the current data mode.
- `GET /api/resources/:id` returns one active resource.
- `POST /api/resources/match` continues to return the existing `AccessOption[]` response shape.
