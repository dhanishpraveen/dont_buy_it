import { Router } from "express";
import { bearerTokenFromHeader, requireAuth } from "../middleware/auth.js";
import {
  advanceExchange,
  cancelAccessRequest,
  createAccessRequest,
  decideAccessRequest,
  getAccessRequest,
  getAccessRequests,
  getExchange,
  LifecycleError,
  type ExchangeAction,
  type RequestDecision,
} from "../services/accessRequestService.js";

function accessToken(
  request: Parameters<typeof bearerTokenFromHeader>[0] extends never
    ? never
    : { get(name: string): string | undefined },
) {
  return bearerTokenFromHeader(request.get("authorization")) ?? undefined;
}

function sendError(
  response: { status(code: number): { json(body: unknown): unknown } },
  error: unknown,
  fallback: string,
) {
  if (error instanceof LifecycleError) {
    response
      .status(error.status)
      .json({ success: false, error: error.message });
    return;
  }
  console.error(
    "[Lifecycle API]",
    error instanceof Error ? error.message : "Unknown error",
  );
  response.status(500).json({ success: false, error: fallback });
}

export const accessRequestsRouter = Router();
accessRequestsRouter.use(requireAuth);

accessRequestsRouter.get("/received", async (request, response) => {
  try {
    response.json({
      success: true,
      data: await getAccessRequests("received", accessToken(request)),
    });
  } catch (error) {
    sendError(response, error, "We could not load requests received.");
  }
});

accessRequestsRouter.get("/", async (request, response) => {
  try {
    response.json({
      success: true,
      data: await getAccessRequests("mine", accessToken(request)),
    });
  } catch (error) {
    sendError(response, error, "We could not load your requests.");
  }
});

accessRequestsRouter.post("/", async (request, response) => {
  try {
    const id = await createAccessRequest(
      request.body ?? {},
      accessToken(request),
    );
    response.status(201).json({ success: true, data: { id } });
  } catch (error) {
    sendError(
      response,
      error,
      "We could not send your request. Please try again.",
    );
  }
});

accessRequestsRouter.get("/:id", async (request, response) => {
  try {
    const record = await getAccessRequest(
      request.params.id,
      accessToken(request),
    );
    if (!record) {
      response
        .status(404)
        .json({ success: false, error: "Request not found." });
      return;
    }
    response.json({ success: true, data: record });
  } catch (error) {
    sendError(response, error, "We could not load this request.");
  }
});

accessRequestsRouter.post("/:id/decision", async (request, response) => {
  const decision = request.body?.decision;
  if (decision !== "ACCEPT" && decision !== "REJECT") {
    response
      .status(400)
      .json({ success: false, error: "Choose accept or reject." });
    return;
  }
  try {
    const exchangeId = await decideAccessRequest(
      request.params.id,
      decision as RequestDecision,
      accessToken(request),
    );
    response.json({ success: true, data: { exchangeId } });
  } catch (error) {
    sendError(
      response,
      error,
      "We could not process this request. Please try again.",
    );
  }
});

accessRequestsRouter.post("/:id/cancel", async (request, response) => {
  try {
    await cancelAccessRequest(request.params.id, accessToken(request));
    response.json({ success: true });
  } catch (error) {
    sendError(
      response,
      error,
      "We could not cancel this request. Please try again.",
    );
  }
});

export const exchangesRouter = Router();
exchangesRouter.use(requireAuth);

exchangesRouter.get("/:id", async (request, response) => {
  try {
    response.json({
      success: true,
      data: await getExchange(request.params.id, accessToken(request)),
    });
  } catch (error) {
    sendError(response, error, "We could not load this exchange.");
  }
});

const exchangeActions: ExchangeAction[] = [
  "CONFIRM_HANDOVER",
  "CONFIRM_RECEIPT",
  "REQUEST_RETURN",
  "CONFIRM_RETURN",
];
exchangesRouter.post("/:id/actions", async (request, response) => {
  const action = request.body?.action;
  if (
    typeof action !== "string" ||
    !exchangeActions.includes(action as ExchangeAction)
  ) {
    response
      .status(400)
      .json({ success: false, error: "Choose a valid exchange action." });
    return;
  }
  try {
    await advanceExchange(
      request.params.id,
      action as ExchangeAction,
      request.body?.notes,
      accessToken(request),
    );
    response.json({ success: true });
  } catch (error) {
    sendError(
      response,
      error,
      "We could not update this exchange. Please try again.",
    );
  }
});
