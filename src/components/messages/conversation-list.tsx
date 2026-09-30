import Link from "next/link";
import { ImageSlot } from "@/components/ui";
import { CONVERSATION_ROLE_LABELS, conversationPriceLocationLine, type Conversation } from "@/lib/conversations";
import { formatChatTimestamp } from "@/lib/format";

/**
 * The inbox's thread list, shared by the list-only and open-thread routes.
 *
 * Listing-first, not person-first: the photo and listing name lead each row,
 * with the other party demoted to a small caption. What a thread is about is
 * what you actually remember; who it's with rarely is.
 */
export function ConversationList({ conversations, activeId }: { conversations: Conversation[]; activeId?: string }) {
  return (
    <ul className="divide-y divide-line">
      {conversations.map((conversation) => {
        const active = conversation.id === activeId;
        return (
          <li key={conversation.id}>
            <Link
              href={`/messages/${conversation.id}`}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${active ? "bg-surface-muted" : "hover:bg-surface-muted"}`}
            >
              <ImageSlot label={conversation.listing_name} src={conversation.listing_photo_url ?? undefined} className="size-12 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-sm ${conversation.unread ? "font-semibold" : ""}`}>{conversation.listing_name}</p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-xs text-ink-soft">{formatChatTimestamp(conversation.updated_at)}</span>
                    {conversation.unread && <span aria-hidden="true" className="size-2 rounded-full bg-accent" />}
                  </div>
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-soft">{conversationPriceLocationLine(conversation)}</p>
                <p className="mt-0.5 truncate text-xs text-ink-soft">
                  {conversation.other_party_name ?? "Member"} · {CONVERSATION_ROLE_LABELS[conversation.other_party_role]}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
