"use server";

import { revalidatePath } from "next/cache";
import { requirePortalSession } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AttributeDefinition } from "@/lib/category-attributes";

export type CategoryActionState = { error?: string; success?: string } | undefined;
export type AddCategoryState = { error?: string; success?: string } | undefined;
export type CategoryMutationState = { error?: string; success?: string } | undefined;
type Draft = Omit<AttributeDefinition, "id" | "category_slug">;

function draftFrom(value: unknown): Draft | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const key = typeof row.attribute_key === "string" ? row.attribute_key.trim() : "";
  const label = typeof row.label === "string" ? row.label.trim() : "";
  const dataType = row.data_type;
  if (!/^[a-z][a-z0-9_]*$/.test(key) || !label || !["text", "number", "select"].includes(String(dataType))) return null;
  const options = Array.isArray(row.options) ? row.options.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [];
  if (dataType === "select" && options.length === 0) return null;
  const numeric = (input: unknown) => input === null || input === "" ? null : typeof input === "number" && Number.isFinite(input) ? input : null;
  const min = numeric(row.min_val);
  const max = numeric(row.max_val);
  if ((row.min_val !== null && row.min_val !== "" && min === null) || (row.max_val !== null && row.max_val !== "" && max === null) || (min !== null && max !== null && min > max)) return null;
  return { attribute_key: key, label, data_type: dataType as Draft["data_type"], is_required: Boolean(row.is_required), options, min_val: min, max_val: max, display_order: typeof row.display_order === "number" && Number.isInteger(row.display_order) ? row.display_order : 0 };
}

export async function saveCategoryAttributes(_previous: CategoryActionState, formData: FormData): Promise<CategoryActionState> {
  await requirePortalSession();
  const slug = String(formData.get("category_slug") ?? "");
  const supabase = createAdminClient();
  const { data: category, error: categoryError } = await supabase.from("listing_categories").select("slug").eq("slug", slug).maybeSingle();
  if (categoryError || !category) return { error: "Choose a platform category." };
  let raw: unknown;
  try { raw = JSON.parse(String(formData.get("definitions") ?? "[]")); } catch { return { error: "The submitted attribute definitions were invalid." }; }
  if (!Array.isArray(raw)) return { error: "The submitted attribute definitions were invalid." };
  const definitions = raw.map(draftFrom);
  if (definitions.some((definition) => definition === null)) return { error: "Every specification needs a label, valid type, and valid type-specific rules." };
  const rows = definitions as Draft[];
  if (new Set(rows.map((row) => row.attribute_key)).size !== rows.length) return { error: "Specification names must be unique within a category." };
  const { data: existing, error: existingError } = await supabase.from("category_attribute_definitions").select("id,attribute_key").eq("category_slug", slug);
  if (existingError) return { error: existingError.message };
  if (rows.length) {
    const { error } = await supabase.from("category_attribute_definitions").upsert(rows.map((row) => ({ ...row, category_slug: slug, updated_at: new Date().toISOString() })), { onConflict: "category_slug,attribute_key" });
    if (error) return { error: error.message };
  }
  const kept = new Set(rows.map((row) => row.attribute_key));
  const staleIds = (existing ?? []).filter((row) => !kept.has(row.attribute_key)).map((row) => row.id);
  if (staleIds.length) {
    const { error } = await supabase.from("category_attribute_definitions").delete().in("id", staleIds);
    if (error) return { error: error.message };
  }
  revalidatePath("/categories");
  return { success: "Category specifications saved. They apply only to future listing submissions." };
}

export async function addCategory(_previous: AddCategoryState, formData: FormData): Promise<AddCategoryState> {
  await requirePortalSession();
  const label = String(formData.get("label") ?? "").trim();
  const slug = label.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!label || !/^[A-Z][A-Z0-9_]*$/.test(slug)) return { error: "Enter a category name." };
  const { error } = await createAdminClient().from("listing_categories").insert({ slug, label, display_order: 1000, is_active: true });
  if (error) return { error: error.code === "23505" ? "That category name or key already exists." : error.message };
  revalidatePath("/categories");
  return { success: "Category added. It is now available when owners create a listing." };
}

export async function renameCategory(slug: string, _previous: CategoryMutationState, formData: FormData): Promise<CategoryMutationState> {
  await requirePortalSession();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Enter a category name." };
  const { error } = await createAdminClient().from("listing_categories").update({ label, updated_at: new Date().toISOString() }).eq("slug", slug);
  if (error) return { error: error.code === "23505" ? "That category name already exists." : error.message };
  revalidatePath("/categories");
  return { success: "Category name updated." };
}

export async function deleteCategory(slug: string, _previous: CategoryMutationState, _formData: FormData): Promise<CategoryMutationState> {
  void _previous;
  void _formData;
  await requirePortalSession();
  const supabase = createAdminClient();
  const { count, error: countError } = await supabase.from("listings").select("id", { count: "exact", head: true }).eq("category", slug);
  if (countError) return { error: countError.message };
  if ((count ?? 0) > 0) return { error: "This category is used by existing listings and cannot be deleted. Keep it to preserve those records." };
  const { error: definitionsError } = await supabase.from("category_attribute_definitions").delete().eq("category_slug", slug);
  if (definitionsError) return { error: definitionsError.message };
  const { error } = await supabase.from("listing_categories").delete().eq("slug", slug);
  if (error) return { error: error.message };
  revalidatePath("/categories");
  return { success: "Category deleted." };
}
