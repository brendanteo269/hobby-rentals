import { NextResponse } from "next/server";
import { ConversationApiError, getConversation, getMessages } from "@/lib/api/conversations";

/**
 * Browser-facing poll for the newest page of an open thread's messages.
 *
 * A Route Handler rather than a Server Action on purpose: Next runs Server
 * Actions one at a time, so a poll in flight would delay the viewer's own
 * "Send" behind it.
 *
 * When `after` (the newest message id the client already has) is no longer
 * the last one, the thread has news the viewer is about to see on screen, so
 * it is marked read - GET /conversations/{id} does that as a side effect.
 * Otherwise a thread being actively watched would keep showing as unread.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const after = new URL(request.url).searchParams.get("after");

  try {
    const page = await getMessages(id);
    if (page.messages.length > 0 && page.messages.at(-1)?.id !== after) {
      await getConversation(id);
    }
    return NextResponse.json(page);
  } catch (caught) {
    if (caught instanceof ConversationApiError) {
      return NextResponse.json({ error: caught.message }, { status: caught.status });
    }
    throw caught;
  }
}
