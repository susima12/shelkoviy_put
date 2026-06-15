import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api-client";
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
  stages?: string[];
  criteria?: string[];
  fee_details?: string[];
  requirements?: string[];
  coordinators?: StaticCompetition["coordinators"];
  payment_note?: string;
  formFields?: StaticCompetition["formFields"];
};

function staticToCompetition(c: StaticCompetition): Competition {
  return {
    id: c.slug,
    slug: c.slug,
    name: c.name,
    short_description: c.short_description,
    description: c.description,
    display_order: c.display_order,
    accepting_applications: c.accepting_applications,
    age_categories: c.age_categories,
    nominations: c.nominations,
    org_fee: c.org_fee,
    stages: c.stages,
    criteria: c.criteria,
    fee_details: c.fee_details,
    requirements: c.requirements,
    coordinators: c.coordinators,
    payment_note: c.payment_note,
    formFields: c.formFields,
  };
}

function getStaticCompetitions(options?: { acceptingOnly?: boolean; limit?: number }) {
  let items = FESTIVAL_COMPETITIONS.map(staticToCompetition);
  if (options?.acceptingOnly) items = items.filter((c) => c.accepting_applications);
  if (options?.limit) items = items.slice(0, options.limit);
  return items;
}

let cache: Competition[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

function mergeWithStatic(row: {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description?: string | null;
  display_order: number;
  accepting_applications: boolean;
  age_categories: string[];
  nominations: string[];
}): Competition {
  const staticData = FESTIVAL_COMPETITIONS.find((c) => c.slug === row.slug);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name || staticData?.name || "",
    short_description: row.short_description ?? staticData?.short_description ?? null,
    description: row.description ?? staticData?.description ?? null,
    display_order: row.display_order ?? staticData?.display_order ?? 0,
    accepting_applications: row.accepting_applications ?? true,
    age_categories: row.age_categories?.length ? row.age_categories : staticData?.age_categories ?? [],
    nominations: row.nominations?.length ? row.nominations : staticData?.nominations ?? [],
    org_fee: staticData?.org_fee,
    stages: staticData?.stages,
    criteria: staticData?.criteria,
    fee_details: staticData?.fee_details,
    requirements: staticData?.requirements,
    coordinators: staticData?.coordinators,
    payment_note: staticData?.payment_note,
    formFields: staticData?.formFields,
  };
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
    const { data } = await api.getCompetitions({
      acceptingOnly: options?.acceptingOnly,
      limit: options?.limit,
    });

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
    console.warn("[competitions] API fetch failed", e);
    const msg = e instanceof Error ? e.message : String(e);
    const fallback = getStaticCompetitions(options);
    if (fallback.length) {
      cache = fallback;
      cacheTime = Date.now();
      return { data: fallback, fromCache: false, error: msg };
    }
    return { data: cache ?? [], fromCache: false, error: msg };
  }

  const fallback = getStaticCompetitions(options);
  if (fallback.length) {
    cache = fallback;
    cacheTime = Date.now();
    return { data: fallback, fromCache: false };
  }

  return { data: cache ?? [], fromCache: false };
}

export function useCompetitions(options?: { acceptingOnly?: boolean; limit?: number }) {
  const staticItems = useMemo(
    () => getStaticCompetitions(options),
    [options?.acceptingOnly, options?.limit]
  );
  const [items, setItems] = useState<Competition[]>(staticItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchCompetitions(options).then(({ data, error: err }) => {
      if (!mounted) return;
      if (data.length) setItems(data);
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
