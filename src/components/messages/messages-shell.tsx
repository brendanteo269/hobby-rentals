import type { ReactNode } from "react";
import { Container } from "@/components/ui";

/** Two-pane inbox layout: a thread list on the left, the open thread (or a prompt) on the right. */
export function MessagesShell({ list, children }: { list: ReactNode; children: ReactNode }) {
  return (
    <Container className="pt-8 pb-16">
      <h1 className="heading text-3xl">Messages</h1>

      <div className="mt-6 grid overflow-hidden rounded-2xl border border-line lg:h-[75vh] lg:grid-cols-[340px_1fr]">
        <div className="max-h-[28rem] overflow-y-auto border-b border-line lg:max-h-none lg:h-full lg:border-r lg:border-b-0">
          {list}
        </div>
        <div className="min-h-[28rem] lg:h-full">{children}</div>
      </div>
    </Container>
  );
}
