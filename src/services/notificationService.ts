import { supabase } from "../lib/supabase";

export type NotificationRecord = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
};

export function buildNotificationUrl(
  notification: Pick<NotificationRecord, "reference_type" | "reference_id">,
): string {
  switch (notification.reference_type) {
    case "request":
      return notification.reference_id
        ? `/requests/${notification.reference_id}`
        : "/requests";
    case "exchange":
      return notification.reference_id
        ? `/exchanges/${notification.reference_id}`
        : "/exchanges";
    case "conversation":
      return notification.reference_id
        ? `/messages/${notification.reference_id}`
        : "/messages";
    default:
      return "/notifications";
  }
}

export function formatRelativeTime(value: string): string {
  const differenceMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.round(differenceMs / 60000));

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export async function getNotifications(): Promise<NotificationRecord[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as NotificationRecord[];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message);
  }
}
