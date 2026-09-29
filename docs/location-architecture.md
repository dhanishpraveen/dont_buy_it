# Location architecture

## Overview

Location is treated as one input in the access-decision pipeline. It helps narrow candidate listings and compute real-world distance, but it does not override the existing deterministic scoring or recommendation logic.

## Privacy model

- Public listing responses do not expose exact private coordinates or home addresses.
- Users may provide approximate locations or browser-derived coordinates without exposing them publicly.
- Request and exchange details are available only to their requester/owner participants; they expose the listing's safe `location_area`, never private geography.
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
- MongoDB `locationPoint` stored as `[longitude, latitude]`, or Supabase `listings.location` as `geography(Point,4326)`

This keeps the privacy model clear: public display uses a safe area string, while computation uses only the validated coordinate payload when it exists.

## Distance calculation

Distance is computed deterministically with the Haversine formula in kilometers using the actual coordinate pair. The canonical internal unit is kilometers, and all access options use the same normalized measure.

## Geospatial support

The Mongo Listing model includes a 2dsphere index on `locationPoint`; Supabase uses a GiST index on `public.listings.location` and the `nearby_listings` PostGIS RPC. Both support nearby discovery without changing the scoring model.

## Nearby resource retrieval

Nearby queries accept parameters such as:

- latitude
- longitude
- radius in kilometers
- category
- accessType
- availability
- limit

The query validates radius and coordinate ranges before performing geospatial filtering. Mongo and Supabase results are sorted by deterministic distance and then mapped to the distance field in the access option. Supabase's RPC returns meters and the adapter converts them to kilometers; exact listing coordinates are never selected or returned.

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
