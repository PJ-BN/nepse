import Link from "next/link";
import { ChartView } from "@/features/charting";

export default async function ChartPage({ searchParams }: { searchParams: Promise<{ symbol?: string }> }) {
  const { symbol = "" } = await searchParams;
  const sym = symbol.trim().toUpperCase();
  return (
    <main className="mx-auto max-w-6xl space-y-3 p-6">
      <h1 className="text-xl font-semibold">
        {sym || "Chart"}
        {sym && (
          <Link href={`/company/${sym}`} className="ml-3 text-sm font-normal text-blue-700 hover:underline">
            Company page →
          </Link>
        )}
      </h1>
      <ChartView key={sym} symbol={sym} />
    </main>
  );
}
