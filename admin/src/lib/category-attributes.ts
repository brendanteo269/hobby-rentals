export type AdminCategory = { slug: string; label: string; display_order: number; is_active: boolean };

export type AttributeDefinition = {
  id: string;
  category_slug: string;
  attribute_key: string;
  label: string;
  data_type: "text" | "number" | "select";
  is_required: boolean;
  is_pricing_factor: boolean;
  options: string[];
  min_val: number | null;
  max_val: number | null;
  display_order: number;
};
