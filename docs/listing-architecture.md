# Resource Listing Architecture

Phase 13 adds user-generated listings while preserving the existing `AccessOption` contract and deterministic decision engine.

## Item vs Listing

An `Item` is the physical resource: name, description, category, images, condition, capabilities, and owner.

A `Listing` is the current access offer for that item: borrow, rent, buy-used, or buy-new, with price, availability, approximate location, and publication status. A future access mode can be represented as another listing without duplicating the physical item concept.

## Lifecycle

The existing Mongoose listing status values are retained:

- `active`: published and visible to other users.
- `paused`: owned listing is hidden from public browsing.
- `closed`: soft-deleted/unpublished so historical references remain possible.
- `draft`: reserved for future draft workflows.

Availability remains `available`, `partially-available`, or `unavailable`.

## API

- `POST /api/listings`: authenticated creation; owner is derived from the session.
- `GET /api/listings`: public published listings with search, category, access type, condition, and sort query support.
- `GET /api/listings/:id`: public active listing detail.
- `GET /api/users/me/listings`: authenticated owner management list.
- `PATCH /api/listings/:id`: authenticated owner-only update, including pause/publish status.
- `DELETE /api/listings/:id`: authenticated owner-only soft delete to `closed`/`unavailable`.

Public responses expose the owner's display name and trust summary only. Passwords, email, exact private addresses, and internal fields are not returned.

## AccessOption integration

MongoDB listings are populated with their item and owner in `server/repositories/resourceRepository.ts` and mapped into the existing `AccessOption` shape. The scoring engine, ownership analyzer, and recommendation engine receive the same contract as before. No recommendation or score is hardcoded by the listing layer.

## Images and location

Phase 13 stores image references supplied by the client, up to six URLs per listing. It does not implement cloud uploads or storage credentials. Listing location is an approximate area string; exact private addresses are not accepted as a separate public field.

## Data modes

`DATABASE_MODE=mock` supports local listing API demonstrations in memory. `DATABASE_MODE=mongo` persists items and listings through Mongoose. The original deterministic demo catalog remains available in the Browse page when no user-generated listings exist.
