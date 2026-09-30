import { supabase } from "../lib/supabase";

export type ConversationRecord = {
  id: string;
  listing_id: string;
  request_id: string | null;
  exchange_id: string | null;
  created_at: string;
};

export type MessageRecord = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  sender?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

export async function getConversations(): Promise<ConversationRecord[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ConversationRecord[];
}

export async function getConversationMessages(
  conversationId: string,
): Promise<MessageRecord[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*, sender:profiles(id, full_name, avatar_url)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MessageRecord[];
}

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<void> {
  const trimmed = content.trim();
  if (!trimmed) return;

  const { data: sessionData } = await supabase.auth.getUser();
  const userId = sessionData.user?.id;
  if (!userId) {
    throw new Error("You must be signed in to send messages.");
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: userId,
    content: trimmed,
  });

  if (error) {
    throw new Error(error.message);
  }
}
