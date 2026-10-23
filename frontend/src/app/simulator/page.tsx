import { SimulatorView } from "@/features/simulator";

export default async function SimulatorPage({ searchParams }: { searchParams: Promise<{ symbol?: string }> }) {
  const { symbol = "" } = await searchParams;
  return (
    <main className="mx-auto max-w-6xl space-y-3 p-6">
      <h1 className="text-xl font-semibold">Indicator simulator</h1>
      <SimulatorView initialSymbol={symbol.trim().toUpperCase()} />
    </main>
  );
}
