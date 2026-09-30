import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const fromMock = vi.fn();

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: getUserMock,
    },
    from: fromMock,
  },
}));

describe("notification service user scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads notifications only for the active signed-in user", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const orderMock = vi
      .fn()
      .mockResolvedValue({ data: [{ id: "n1" }], error: null });

    fromMock.mockReturnValue({
      select: selectMock,
      eq: eqMock,
      order: orderMock,
    });

    const { getNotifications } = await import("./notificationService");
    const result = await getNotifications();

    expect(result).toHaveLength(1);
    expect(selectMock).toHaveBeenCalledWith("*");
    expect(eqMock).toHaveBeenNthCalledWith(1, "user_id", "user-1");
  });

  it("marks notifications read only for the active user", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const updateMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    fromMock.mockReturnValue({
      update: updateMock,
      eq: eqMock,
    });

    const { markNotificationRead } = await import("./notificationService");
    await markNotificationRead("notification-42");

    expect(updateMock).toHaveBeenCalledWith({ is_read: true });
    expect(eqMock).toHaveBeenCalledWith("id", "notification-42");
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-1");
  });
});
