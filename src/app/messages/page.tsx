import { EmptyState } from "@/components/ui";
import { MessagesShell } from "@/components/messages/messages-shell";
import { ConversationList } from "@/components/messages/conversation-list";
import { getMyConversations } from "@/lib/api/conversations";

export default async function MessagesPage() {
  const conversations = await getMyConversations();

  return (
    <MessagesShell list={<ConversationList conversations={conversations} />}>
      {conversations.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="No conversations yet"
            body="Message a listing's owner, or message about a confirmed booking, and the thread will show up here."
          />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-ink-soft">
          Select a conversation to view it.
        </div>
      )}
    </MessagesShell>
  );
}
