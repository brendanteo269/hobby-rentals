import { NextResponse } from "next/server";
import { ConversationApiError, getMyConversations } from "@/lib/api/conversations";
import type { ConversationActivity } from "@/lib/conversations";

/**
 * Browser-facing poll for the signed-in member's conversation activity, used
 * by the new-message toast. Only what the toast needs is sent - not the full
 * Conversation - since it runs on every page, every few seconds.
 */
export async function GET() {
  try {
    const conversations = await getMyConversations();
    const activity: ConversationActivity[] = conversations.map((c) => ({
      id: c.id,
      unread: c.unread,
      updated_at: c.updated_at,
      other_party_name: c.other_party_name,
    }));
    return NextResponse.json(activity);
  } catch (caught) {
    if (caught instanceof ConversationApiError) {
      return NextResponse.json({ error: caught.message }, { status: caught.status });
    }
    throw caught;
  }
}
