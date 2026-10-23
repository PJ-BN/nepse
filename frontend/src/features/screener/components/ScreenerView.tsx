"use client";

import { useState } from "react";
import { downloadCsv, downloadXlsx } from "../api";
import { useScreenerRun } from "../hooks/useScreener";
import { type Combinator, filterToPills, newPill, type Pill, pillsToFilter } from "../pills";
import type { Preset, ScreenerRequest } from "../types";
import { FilterPillBuilder } from "./FilterPillBuilder";
import { Presets } from "./Presets";
import { ResultsTable } from "./ResultsTable";

export function ScreenerView() {
  const [pills, setPills] = useState<Pill[]>(() => [newPill({ field: "close", op: ">", compareTo: "sma_200" })]);
  const [combinator, setCombinator] = useState<Combinator>("and");
  const [sort, setSort] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  const req: ScreenerRequest = {
    filter: pillsToFilter(pills, combinator),
    sort: sort ? [sort] : undefined,
    limit: 200,
  };
  const { data, error, isFetching } = useScreenerRun(req);

  const pickPreset = (p: Preset) => {
    const parsed = filterToPills(p.filter);
    if (!parsed) return;
    setPills(parsed.pills);
    setCombinator(parsed.combinator);
    setSort(p.sort[0] ?? null);
    setPresetId(p.id);
  };

  return (
    <div className="space-y-4">
      <Presets activeId={presetId} onPick={pickPreset} />
      <FilterPillBuilder
        pills={pills}
        combinator={combinator}
        onChange={(p, c) => {
          setPills(p);
          setCombinator(c);
          setPresetId(null);
        }}
      />
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500">
          {data ? `${data.count} stocks` : ""}
          {isFetching ? " · updating…" : ""}
        </span>
        <button
          type="button"
          className="rounded border px-3 py-1 hover:bg-gray-100"
          onClick={() => {
            setCsvError(null);
            downloadCsv(req).catch((e: Error) => setCsvError(e.message));
          }}
        >
          Download CSV
        </button>
        <button
          type="button"
          className="rounded border px-3 py-1 hover:bg-gray-100"
          onClick={() => {
            setCsvError(null);
            downloadXlsx(req).catch((e: Error) => setCsvError(e.message));
          }}
        >
          Download Excel
        </button>
        {csvError && <span className="text-red-600">{csvError}</span>}
      </div>
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      {data && <ResultsTable columns={data.columns} rows={data.rows} sort={sort} onSort={setSort} />}
    </div>
  );
}
