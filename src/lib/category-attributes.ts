"use client";

import { createClient } from "@/lib/supabase/client";
import type { CategoryAttributeDefinition, ListingCategory } from "@/lib/listings";

/** Fetches public configuration with the member's Supabase access token. */
export async function getCategoryAttributes(category: ListingCategory): Promise<CategoryAttributeDefinition[]> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return [];
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");
  const response = await fetch(`${base}/categories/${encodeURIComponent(category)}/attributes`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error("Could not load category specifications.");
  return response.json() as Promise<CategoryAttributeDefinition[]>;
}
