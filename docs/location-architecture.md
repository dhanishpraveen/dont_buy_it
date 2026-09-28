# Location architecture

## Overview

Location is treated as one input in the access-decision pipeline. It helps narrow candidate listings and compute real-world distance, but it does not override the existing deterministic scoring or recommendation logic.

## Privacy model

- Public listing responses do not expose exact private coordinates or home addresses.
- Users may provide approximate locations or browser-derived coordinates without exposing them publicly.
- Exact exchange details remain out of scope for this phase and are not exposed in public APIs.
- The frontend uses approximate location metadata only for discovery and distance calculations.

## User location

The app supports these safe states:

- `LOCATION_UNKNOWN`
- `LOCATION_REQUESTED`
- `LOCATION_AVAILABLE`
- `LOCATION_DENIED`
- `LOCATION_UNAVAILABLE`
- `LOCATION_MANUAL`

The browser geolocation flow requests permission only when the user explicitly chooses to use device location. If permission is denied or unavailable, the app keeps working with a manual or approximate location fallback.

## Listing location

Listing records may include:

- an approximate public description such as `Adyar, Chennai`
- optional GeoJSON `Point` coordinates for distance calculation
- `locationPoint` stored in MongoDB as `[longitude, latitude]`

This keeps the privacy model clear: public display uses a safe area string, while computation uses only the validated coordinate payload when it exists.

## Distance calculation

Distance is computed deterministically with the Haversine formula in kilometers using the actual coordinate pair. The canonical internal unit is kilometers, and all access options use the same normalized measure.

## Geospatial support

The Listing model includes a 2dsphere index on the `locationPoint` field for efficient nearby queries. This supports MongoDB-backed resource discovery without changing the scoring model.

## Nearby resource retrieval

Nearby queries accept parameters such as:

- latitude
- longitude
- radius in kilometers
- category
- accessType
- availability
- limit

The query validates radius and coordinate ranges before performing geospatial filtering. Results are sorted by distance and then returned with the distance already included in the access option.

## Access score integration

Distance is integrated into the existing access score as a weighted factor. The scoring engine remains deterministic and continues to evaluate:

- cost
- availability
- distance
- trust
- convenience
- condition
- usage suitability

Distance is one factor, not the deciding factor. The recommendation remains driven by the existing scoring and ownership logic.

## Fallback and graceful degradation

When location data is unavailable, the app gracefully degrades to normal browsing and scoring. No AI or recommendation path depends on a successful location lookup.
