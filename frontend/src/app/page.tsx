import { Dashboard } from "@/features/market-overview";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Market overview</h1>
      <Dashboard />
    </main>
  );
}
