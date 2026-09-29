import { Router } from "express";
import { bearerTokenFromHeader, requireAuth } from "../middleware/auth.js";
import {
  createListing,
  getListing,
  listMyListings,
  listPublishedListings,
  removeListing,
  updateListing,
} from "../services/listingService.js";
import { ListingDatabaseError } from "../services/supabaseListingService.js";

const router = Router();

router.get("/", async (request, response) => {
  try {
    const data = await listPublishedListings(
      {
        search:
          typeof request.query.search === "string"
            ? request.query.search
            : undefined,
        category:
          typeof request.query.category === "string"
            ? request.query.category
            : undefined,
        accessType:
          typeof request.query.accessType === "string"
            ? request.query.accessType
            : undefined,
        condition:
          typeof request.query.condition === "string"
            ? request.query.condition
            : undefined,
        availability:
          typeof request.query.availability === "string"
            ? request.query.availability
            : undefined,
        location:
          typeof request.query.location === "string"
            ? request.query.location
            : undefined,
        sort:
          typeof request.query.sort === "string"
            ? request.query.sort
            : undefined,
      },
      request.user?.id,
    );
    response.json({ success: true, data });
  } catch {
    response
      .status(500)
      .json({ success: false, error: "We could not retrieve listings." });
  }
});

router.get("/:id", async (request, response) => {
  try {
    const token =
      bearerTokenFromHeader(request.get("authorization")) ?? undefined;
    const listing = request.user
      ? ((await getListing(request.params.id, true, request.user.id, token)) ??
        (await getListing(request.params.id)))
      : await getListing(request.params.id);
    if (!listing) {
      response
        .status(404)
        .json({ success: false, error: "Listing not found." });
      return;
    }
    response.json({ success: true, data: listing });
  } catch {
    response.status(404).json({ success: false, error: "Listing not found." });
  }
});

router.post("/", requireAuth, async (request, response) => {
  try {
    const listing = await createListing(
      request.user!,
      request.body ?? {},
      bearerTokenFromHeader(request.get("authorization")) ?? undefined,
    );
    response.status(201).json({ success: true, data: listing });
  } catch (error) {
    const persistenceError = error instanceof ListingDatabaseError;
    const development = process.env.NODE_ENV !== "production";
    response.status(400).json({
      success: false,
      error:
        persistenceError && !development
          ? "We could not publish the listing. Please try again."
          : error instanceof Error
            ? error.message
            : "We could not create this listing.",
      ...(persistenceError && development
        ? {
            code: error.code ?? "SUPABASE_ERROR",
            details:
              error.diagnostic ?? "Supabase rejected the database operation.",
          }
        : {}),
    });
  }
});

router.patch("/:id", requireAuth, async (request, response) => {
  try {
    const listingId =
      typeof request.params.id === "string"
        ? request.params.id
        : request.params.id[0];
    const listing = await updateListing(
      listingId,
      request.user!.id,
      request.body ?? {},
      bearerTokenFromHeader(request.get("authorization")) ?? undefined,
    );
    response.json({ success: true, data: listing });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "We could not update this listing.";
    response
      .status(
        message.includes("cannot modify")
          ? 403
          : message.includes("not found")
            ? 404
            : 400,
      )
      .json({ success: false, error: message });
  }
});

router.delete("/:id", requireAuth, async (request, response) => {
  try {
    const listingId =
      typeof request.params.id === "string"
        ? request.params.id
        : request.params.id[0];
    await removeListing(
      listingId,
      request.user!.id,
      bearerTokenFromHeader(request.get("authorization")) ?? undefined,
    );
    response.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "We could not remove this listing.";
    response
      .status(message.includes("cannot modify") ? 403 : 404)
      .json({ success: false, error: message });
  }
});

export const listingsRouter = router;

export const myListingsRouter = Router();
myListingsRouter.get("/", requireAuth, async (request, response) => {
  try {
    response.json({
      success: true,
      data: await listMyListings(
        request.user!.id,
        bearerTokenFromHeader(request.get("authorization")) ?? undefined,
      ),
    });
  } catch {
    response
      .status(500)
      .json({ success: false, error: "We could not retrieve your listings." });
  }
});
