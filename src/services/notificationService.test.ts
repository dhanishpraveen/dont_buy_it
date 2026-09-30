import { describe, expect, it } from "vitest";
import {
  buildNotificationUrl,
  formatRelativeTime,
} from "./notificationService";

describe("notificationService", () => {
  it("builds the right destination for request notifications", () => {
    expect(
      buildNotificationUrl({
        reference_type: "request",
        reference_id: "abc-123",
      }),
    ).toBe("/requests/abc-123");
  });

  it("builds the right destination for conversation notifications", () => {
    expect(
      buildNotificationUrl({
        reference_type: "conversation",
        reference_id: "chat-456",
      }),
    ).toBe("/messages/chat-456");
  });

  it("formats recent timestamps into compact labels", () => {
    const created = new Date(Date.now() - 90 * 1000).toISOString();
    expect(formatRelativeTime(created)).toBe("2m");
  });
});
