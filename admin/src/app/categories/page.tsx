import { CategoryManagement } from "@/components/category-management";
import { AddCategory } from "@/components/add-category";
import { Container } from "@/components/ui";
import { requirePortalSession } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminCategory, AttributeDefinition } from "@/lib/category-attributes";

export const metadata = { title: "Category management — HobbyRentals Admin" };

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await requirePortalSession();
  const supabase = createAdminClient();
  const [{ data: definitions, error: definitionsError }, { data: categories, error: categoriesError }] = await Promise.all([
    supabase.from("category_attribute_definitions").select("id,category_slug,attribute_key,label,data_type,is_required,is_pricing_factor,options,min_val,max_val,display_order").order("display_order"),
    supabase.from("listing_categories").select("slug,label,display_order,is_active").order("display_order"),
  ]);
  const error = definitionsError ?? categoriesError;
  const { category: selectedCategory } = await searchParams;
  const initialSlug = (categories ?? []).some((category) => category.slug === selectedCategory)
    ? selectedCategory!
    : (categories ?? [])[0]?.slug ?? "";
  return <Container className="py-12"><p className="eyebrow">Admin</p><h1 className="display-caps mt-3 text-3xl">Category management</h1><p className="body-copy mt-3">Configure the specifications owners provide for each equipment category.</p><AddCategory />{error ? <p role="alert" className="mt-8 text-sm text-bad">Could not load category definitions.</p> : <div className="mt-8"><CategoryManagement definitions={(definitions ?? []) as AttributeDefinition[]} categories={(categories ?? []) as AdminCategory[]} initialSlug={initialSlug} /></div>}</Container>;
}
