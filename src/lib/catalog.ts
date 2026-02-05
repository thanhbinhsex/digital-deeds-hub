import { api, isApiConfigured } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

export type FetchProductsParams = {
  categoryId?: string;
  search?: string;
  limit?: number;
  featured?: boolean;
};

export async function fetchCategories(): Promise<any[]> {
  if (isApiConfigured()) {
    const res = await api.getCategories();
    return res.data ?? [];
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchProducts(params: FetchProductsParams = {}): Promise<any[]> {
  if (isApiConfigured()) {
    const res = await api.getProducts({
      category_id: params.categoryId,
      search: params.search,
      limit: params.limit,
      featured: params.featured,
    });
    return res.data ?? [];
  }

  let query = supabase
    .from("products")
    .select("*")
    .eq("status", "published");

  if (params.categoryId) {
    query = query.eq("category_id", params.categoryId);
  }

  if (params.featured !== undefined) {
    query = query.eq("featured", params.featured);
  }

  if (params.search && params.search.trim()) {
    const term = params.search.trim().replace(/,/g, "");
    // Search across name, Vietnamese name, slug
    query = query.or(`name.ilike.%${term}%,name_vi.ilike.%${term}%,slug.ilike.%${term}%`);
  }

  const limit = params.limit ?? 12;
  const { data, error } = await query
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
