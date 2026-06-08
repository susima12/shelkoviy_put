import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FESTIVAL_COMPETITIONS, type StaticCompetition } from "@/lib/competitions-data";

export type Competition = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description?: string | null;
  display_order: number;
  accepting_applications: boolean;
  age_categories: string[];
  nominations: string[];
  org_fee?: string;
  formFields?: StaticCompetition["formFields"];
};

let cache: Competition[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

function mergeWithStatic(row: Record<string, unknown>): Competition {
  const staticData = FESTIVAL_COMPETITIONS.find((c) => c.slug === row.slug);
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: (row.name as string) || staticData?.name || "",
    short_description: (row.short_description as string | null) ?? staticData?.short_description ?? null,
    description: (row.description as string | null) ?? staticData?.description ?? null,
    display_order: (row.display_order as number) ?? staticData?.display_order ?? 0,
    accepting_applications: (row.accepting_applications as boolean) ?? true,
    age_categories: (row.age_categories as string[])?.length
      ? (row.age_categories as string[])
      : staticData?.age_categories ?? [],
    nominations: (row.nominations as string[])?.length
      ? (row.nominations as string[])
      : staticData?.nominations ?? [],
    org_fee: staticData?.org_fee,
    formFields: staticData?.formFields,
  };
}

function staticFallback(): Competition[] {
  return FESTIVAL_COMPETITIONS.map((c) => ({
    id: `static-${c.slug}`,
    slug: c.slug,
    name: c.name,
    short_description: c.short_description,
    description: c.description,
    display_order: c.display_order,
    accepting_applications: c.accepting_applications,
    age_categories: c.age_categories,
    nominations: c.nominations,
    org_fee: c.org_fee,
    formFields: c.formFields,
  }));
}

export async function fetchCompetitions(options?: {
  acceptingOnly?: boolean;
  limit?: number;
}): Promise<{ data: Competition[]; fromCache: boolean; error?: string }> {
  if (cache && Date.now() - cacheTime < CACHE_TTL_MS) {
    let items = [...cache];
    if (options?.acceptingOnly) items = items.filter((c) => c.accepting_applications);
    if (options?.limit) items = items.slice(0, options.limit);
    return { data: items, fromCache: true };
  }

  try {
    let query = supabase
      .from("competitions")
      .select("id, slug, name, short_description, description, display_order, accepting_applications, age_categories, nominations")
      .order("display_order");

    if (options?.acceptingOnly) query = query.eq("accepting_applications", true);
    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) throw error;

    if (data?.length) {
      const knownSlugs = new Set(FESTIVAL_COMPETITIONS.map((c) => c.slug));
      const merged = data
        .filter((row) => knownSlugs.has(row.slug))
        .map((row) => mergeWithStatic(row));

      if (merged.length > 0) {
        cache = merged.sort((a, b) => a.display_order - b.display_order);
        cacheTime = Date.now();
        return { data: cache, fromCache: false };
      }
    }
  } catch (e) {
    console.warn("[competitions] Supabase fetch failed, using static data", e);
    const fallback = staticFallback();
    cache = fallback;
    cacheTime = Date.now();
    const msg = e instanceof Error ? e.message : String(e);
    let items = fallback;
    if (options?.acceptingOnly) items = items.filter((c) => c.accepting_applications);
    if (options?.limit) items = items.slice(0, options.limit);
    return { data: items, fromCache: false, error: msg };
  }

  const fallback = staticFallback();
  cache = fallback;
  cacheTime = Date.now();
  let items = fallback;
  if (options?.acceptingOnly) items = items.filter((c) => c.accepting_applications);
  if (options?.limit) items = items.slice(0, options.limit);
  return { data: items, fromCache: false };
}

export function useCompetitions(options?: { acceptingOnly?: boolean; limit?: number }) {
  const [items, setItems] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchCompetitions(options).then(({ data, error: err }) => {
      if (!mounted) return;
      setItems(data);
      setError(err ?? null);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [options?.acceptingOnly, options?.limit]);

  return { items, loading, error };
}

export function invalidateCompetitionsCache() {
  cache = null;
  cacheTime = 0;
}
