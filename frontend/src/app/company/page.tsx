"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchSymbols } from "@/features/charting";

export default function CompanyIndexPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["company-search", debounced],
    queryFn: () => searchSymbols(debounced, 50),
  });
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Companies</h1>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search symbol or name…"
        className="w-full rounded border px-3 py-2"
      />
      {error && <p className="text-sm text-red-700">{error.message}</p>}
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <ul className="divide-y text-sm">
          {data.map((s) => (
            <li key={s.symbol} className="flex items-center gap-4 py-2">
              <Link href={`/company/${s.symbol}`} className="w-24 font-medium hover:underline">
                {s.symbol}
              </Link>
              <span className="flex-1 text-gray-600">{s.description}</span>
              <Link href={`/chart?symbol=${s.symbol}`} className="text-gray-500 hover:underline">
                Chart
              </Link>
            </li>
          ))}
          {data.length === 0 && <li className="py-2 text-gray-500">No matches.</li>}
        </ul>
      )}
    </main>
  );
}
