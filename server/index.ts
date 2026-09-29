import "dotenv/config";
import express from "express";
import { connectToDatabase, getDatabaseMode } from "./config/database.js";
import { attachUser } from "./middleware/auth.js";
import { listingsRouter, myListingsRouter } from "./routes/listings.js";
import { analyzeRequirement } from "./services/llm/requirementAnalyzer.js";
import {
  getAccessOptionById,
  getAccessOptionsForRequest,
  getAllAccessOptions,
  getNearbyAccessOptions,
} from "./services/resourceService.js";
import {
  validateCoordinates,
  validateRadius,
} from "./services/locationService.js";
import type { UserRequirement } from "../shared/types/requirements.js";
import type { ExplanationData } from "../shared/types/recommendation.js";
import { generateExplanation } from "./services/llm/explanationGenerator.js";

const app = express();
const port = 3000;

if (process.env.PORT && Number(process.env.PORT) !== port) {
  throw new Error("The backend must run on PORT=3000.");
}

app.use(express.json());
app.use(attachUser);
app.use("/api/listings", listingsRouter);
app.use("/api/users/me/listings", myListingsRouter);

app.post("/api/ai/analyze", async (request, response) => {
  const text =
    typeof request.body?.text === "string" ? request.body.text.trim() : "";
  if (!text) {
    response
      .status(400)
      .json({
        success: false,
        error: "Tell us what you need before analyzing.",
      });
    return;
  }
  if (text.length > 1000) {
    response
      .status(400)
      .json({
        success: false,
        error: "Please keep your request under 1,000 characters.",
      });
    return;
  }

  try {
    const result = await analyzeRequirement(text);
    response.json({
      success: true,
      data: result.requirement,
      source: result.source,
      fallbackReason: result.fallbackReason,
    });
  } catch {
    response
      .status(500)
      .json({
        success: false,
        error: "We could not understand that request. Please try again.",
      });
  }
});

app.post("/api/resources/match", async (request, response) => {
  const rawRequirement = request.body?.requirement as
    | UserRequirement
    | undefined;
  const requirement = rawRequirement
    ? {
        ...rawRequirement,
        locationCoordinates: rawRequirement.locationCoordinates
          ? validateCoordinates(rawRequirement.locationCoordinates)
          : null,
      }
    : undefined;
  if (!requirement || typeof requirement !== "object") {
    response
      .status(400)
      .json({ success: false, error: "A structured requirement is required." });
    return;
  }
  try {
    response.json({
      success: true,
      data: await getAccessOptionsForRequest(requirement),
    });
  } catch {
    response
      .status(500)
      .json({
        success: false,
        error: "We could not retrieve matching access options.",
      });
  }
});

app.get("/api/resources/nearby", async (request, response) => {
  try {
    const location = validateCoordinates({
      latitude: request.query.latitude,
      longitude: request.query.longitude,
    });
    const radiusKm = validateRadius(request.query.radius);
    const limitValue =
      request.query.limit === undefined ? 50 : Number(request.query.limit);
    if (!Number.isInteger(limitValue) || limitValue < 1 || limitValue > 100)
      throw new Error("Limit must be a whole number between 1 and 100.");
    const data = await getNearbyAccessOptions(location, radiusKm, {
      category:
        typeof request.query.category === "string"
          ? request.query.category
          : undefined,
      accessType:
        typeof request.query.accessType === "string"
          ? request.query.accessType
          : undefined,
      availability:
        typeof request.query.availability === "string"
          ? request.query.availability
          : undefined,
      limit: limitValue,
    });
    response.json({ success: true, data, mode: getDatabaseMode() });
  } catch (error) {
    response
      .status(400)
      .json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "We could not retrieve nearby resources.",
      });
  }
});

app.get("/api/resources", async (_request, response) => {
  try {
    const data = await getAllAccessOptions();
    response.json({ success: true, data, mode: getDatabaseMode() });
  } catch {
    response
      .status(500)
      .json({ success: false, error: "We could not retrieve resources." });
  }
});

app.get("/api/resources/:id", async (request, response) => {
  try {
    const resource = await getAccessOptionById(request.params.id);
    if (!resource) {
      response
        .status(404)
        .json({ success: false, error: "Resource not found." });
      return;
    }
    response.json({ success: true, data: resource, mode: getDatabaseMode() });
  } catch {
    response.status(404).json({ success: false, error: "Resource not found." });
  }
});

app.post("/api/ai/explain", async (request, response) => {
  const data = request.body?.data as ExplanationData | undefined;
  if (!data || typeof data !== "object") {
    response
      .status(400)
      .json({
        success: false,
        error: "Deterministic explanation data is required.",
      });
    return;
  }
  try {
    response.json({ success: true, data: await generateExplanation(data) });
  } catch {
    response
      .status(500)
      .json({ success: false, error: "We could not generate an explanation." });
  }
});

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "don't-buy-it-api",
    databaseMode: getDatabaseMode(),
  });
});

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    next: express.NextFunction,
  ) => {
    if (response.headersSent) {
      next(error);
      return;
    }
    const status =
      error &&
      typeof error === "object" &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : 500;
    response
      .status(status)
      .json({
        success: false,
        error: "The API could not process that request.",
      });
  },
);

export async function startServer() {
  await connectToDatabase();
  return app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch((error) => {
    console.error(
      "[API] Startup failed.",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  });
}

export { app };
