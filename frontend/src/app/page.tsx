import { getJson } from "@/shared/api/http";

type Health = { status: string; timescaledb: string };

async function loadHealth(): Promise<Health | null> {
  try {
    return await getJson<Health>("/healthz", { cache: "no-store" });
  } catch {
    return null;
  }
}

export default async function Home() {
  const health = await loadHealth();
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">NEPSE Analytics</h1>
      <p className="mt-4">
        API: {health ? `${health.status} (TimescaleDB ${health.timescaledb})` : "unreachable"}
      </p>
    </main>
  );
}
