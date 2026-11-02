/** S5-05: an access token a member created so an AI assistant can act for them. */
export type AssistantToken = {
  id: string;
  name: string;
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
};

/** Returned once, when the token is created. The backend keeps only a hash. */
export type CreatedAssistantToken = AssistantToken & { token: string };

/** Matches the limit on the column and the backend's request model. */
export const ASSISTANT_TOKEN_NAME_MAX_LENGTH = 60;

/** The name as it will be saved, or why it cannot be. */
export function validateAssistantTokenName(value: unknown): { name: string } | { error: string } {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) return { error: "Give this token a name, such as the app it is for." };
  if (name.length > ASSISTANT_TOKEN_NAME_MAX_LENGTH) {
    return { error: `Keep the name under ${ASSISTANT_TOKEN_NAME_MAX_LENGTH} characters.` };
  }
  return { name };
}

/** An expired token stays listed, so the member can see why their assistant stopped working. */
export function isAssistantTokenExpired(token: Pick<AssistantToken, "expires_at">, now: Date = new Date()): boolean {
  return new Date(token.expires_at) <= now;
}
