const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Fetch the latest persisted AI evaluation from the PostgreSQL database via FastAPI backend.
 */
export async function getStoredAiEvaluation<T>(feature: string, entityKey: string): Promise<T | null> {
  try {
    const url = `${API_BASE}/api/v1/ai/evaluation?feature=${encodeURIComponent(
      feature.toLowerCase()
    )}&entity_key=${encodeURIComponent(entityKey.toUpperCase())}`;

    const res = await fetch(url, {
      cache: "no-store",
    });

    if (res.status === 200) {
      return (await res.json()) as T;
    }
    return null;
  } catch (err) {
    console.warn(`[dbStorage] Could not fetch stored AI evaluation for ${feature}:${entityKey}:`, err);
    return null;
  }
}

/**
 * Persist an AI-generated evaluation into PostgreSQL database.
 */
export async function saveStoredAiEvaluation(
  feature: string,
  entityKey: string,
  payload: unknown,
  source = "agy",
  generatedAt?: string
): Promise<boolean> {
  try {
    const url = `${API_BASE}/api/v1/ai/evaluation`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feature: feature.toLowerCase(),
        entity_key: entityKey.toUpperCase(),
        payload,
        source,
        generated_at: generatedAt || new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn(`[dbStorage] Failed to save AI evaluation to DB for ${feature}:${entityKey}:`, err);
    return false;
  }
}
