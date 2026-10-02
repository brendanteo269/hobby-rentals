import { notFound } from "next/navigation";
import { MessagesShell } from "@/components/messages/messages-shell";
import { ConversationList } from "@/components/messages/conversation-list";
import { ConversationHeader } from "@/components/messages/conversation-header";
import { MessageThread } from "@/components/messages/message-thread";
import { MessageComposer } from "@/components/messages/message-composer";
import { getConversation, getMessages, getMyConversations } from "@/lib/api/conversations";
import { conversationPriceLocationLine } from "@/lib/conversations";
import { createClient } from "@/lib/supabase/server";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) notFound();

  let conversation, messages, conversations;
  try {
    // Fetched first, and awaited on its own: GET /conversations/{id} marks
    // the thread read as a side effect, and the list fetch right after needs
    // that to have already happened so its own unread dot is correct.
    conversation = await getConversation(id);
    [messages, conversations] = await Promise.all([getMessages(id), getMyConversations()]);
  } catch {
    notFound();
  }

  return (
    <MessagesShell list={<ConversationList conversations={conversations} activeId={id} />}>
      <div className="flex h-full flex-col">
        <ConversationHeader
          listingId={conversation.listing_id}
          photoUrl={conversation.listing_photo_url}
          listingName={conversation.listing_name}
          priceLocation={conversationPriceLocationLine(conversation)}
          booking={
            conversation.booking_status && conversation.booking_start_date && conversation.booking_end_date
              ? {
                  status: conversation.booking_status,
                  startDate: conversation.booking_start_date,
                  endDate: conversation.booking_end_date,
                }
              : null
          }
          otherPartyName={conversation.other_party_name ?? "Member"}
          otherPartyRole={conversation.other_party_role}
        />

        <div className="flex-1 overflow-y-auto">
          <MessageThread messages={messages} currentUserId={user.id} />
        </div>

        <div className="border-t border-line p-4">
          <MessageComposer target={{ kind: "reply", conversationId: id }} label="Reply" placeholder="Write a reply…" />
        </div>
      </div>
    </MessagesShell>
  );
}
