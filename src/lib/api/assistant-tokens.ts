import type { AssistantToken, CreatedAssistantToken } from "@/lib/assistant-tokens";
import { backendRequest } from "./client";

export function getAssistantTokens() {
  return backendRequest<AssistantToken[]>("/assistant-tokens");
}

export function createAssistantToken(name: string) {
  return backendRequest<CreatedAssistantToken>("/assistant-tokens", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function revokeAssistantToken(tokenId: string) {
  return backendRequest<void>(`/assistant-tokens/${encodeURIComponent(tokenId)}`, { method: "DELETE" });
}
