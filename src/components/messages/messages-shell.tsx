import type { ReactNode } from "react";
import { Container } from "@/components/ui";
import { RenterPortal, isRenting } from "@/components/renter-portal";

/** Two-pane inbox layout: a thread list on the left, the open thread (or a prompt) on the right. */
export async function MessagesShell({ list, children }: { list: ReactNode; children: ReactNode }) {
  const inbox = (
    <div className="grid overflow-hidden rounded-2xl border border-line lg:h-[75vh] lg:grid-cols-[340px_1fr]">
      <div className="max-h-[28rem] overflow-y-auto border-b border-line lg:max-h-none lg:h-full lg:border-r lg:border-b-0">
        {list}
      </div>
      <div className="min-h-[28rem] lg:h-full">{children}</div>
    </div>
  );

  if (await isRenting()) {
    return (
      <RenterPortal active="Messages" title="Messages">
        {inbox}
      </RenterPortal>
    );
  }

  return (
    <Container className="pt-8 pb-16">
      <h1 className="heading text-3xl">Messages</h1>
      <div className="mt-6">{inbox}</div>
    </Container>
  );
}
