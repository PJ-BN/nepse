"use client";

import type { Bracket, HorizonResult, SimulationResult } from "../types";

const LOW_SAMPLE = 30;

const pct = (v: number | null | undefined) => (v == null ? "–" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`);
const tone = (v: number | null | undefined) => (v == null ? "" : v > 0 ? "text-green-600" : v < 0 ? "text-red-600" : "");

function Badge({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  const cls = ok === null ? "bg-gray-200 text-gray-700" : ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

const bracketLabel = (b: Bracket | null) => (b === null ? "–" : b === "neither" ? "neither hit" : `${b} hit`);

function ForwardTable({ results }: { results: HorizonResult[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs text-gray-500">
        <tr><th>Horizon</th><th>Return</th><th>Best (MFE)</th><th>Worst (MAE)</th><th>Result</th></tr>
      </thead>
      <tbody>
        {results.map((r) => (
          <tr key={r.horizon} className="border-t">
            <td>{r.horizon} bars</td>
            <td className={tone(r.return_pct)}>{pct(r.return_pct)}</td>
            <td>{pct(r.mfe_pct)}</td>
            <td>{pct(r.mae_pct)}</td>
            <td><Badge ok={r.return_pct == null ? null : r.return_pct > 0}>{r.return_pct == null ? "no data" : r.return_pct > 0 ? "hit" : "miss"}</Badge></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ResultPanel({ result, showForward }: { result: SimulationResult; showForward: boolean }) {
  const { anchor, forward, events, stats, warnings } = result;
  const low = stats.count < LOW_SAMPLE;
  return (
    <div className="space-y-5 text-sm">
      {warnings.length > 0 && (
        <ul className="list-disc space-y-1 rounded border border-amber-400 bg-amber-50 p-3 pl-7 text-amber-900">
          {warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">At the anchor · {anchor.date}</h2>
        <p>
          <Badge ok={anchor.fired}>{anchor.fired ? "signal fired" : "signal did not fire"}</Badge>
        </p>
        <ul className="space-y-1">
          {anchor.conditions.map((c) => (
            <li key={c.label} className="flex items-center gap-2">
              <Badge ok={c.value}>{c.value ? "true" : "false"}</Badge>
              <span className="font-mono text-xs">{c.label}</span>
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-xs sm:grid-cols-4">
          {Object.entries(anchor.values).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 border-b">
              <dt className="text-gray-500">{k}</dt>
              <dd>{v == null ? "–" : v.toFixed(2)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">What happened next</h2>
        {showForward ? (
          <>
            <p className="text-xs text-gray-500">
              Entry {forward.entry_price == null ? "–" : forward.entry_price.toFixed(2)} at the close of {forward.entry_date ?? "–"} (the bar after the anchor). Bracket: {bracketLabel(forward.bracket)}.
            </p>
            <ForwardTable results={forward.results} />
          </>
        ) : (
          <p className="text-gray-500">Hidden until you reveal at least one future bar, so you can call it first.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Track record before the anchor</h2>
        {low && (
          <p className="rounded border border-amber-400 bg-amber-50 p-2 text-amber-900">
            Only {stats.count} earlier signal{stats.count === 1 ? "" : "s"} (under {LOW_SAMPLE}): these rates are anecdotes, not evidence.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.horizons.map((h) => (
            <div key={h.horizon} className="rounded border p-3">
              <div className="text-xs text-gray-500">{h.horizon} bars · n={h.n}</div>
              <div className="text-lg font-semibold">{h.win_rate == null ? "–" : `${(h.win_rate * 100).toFixed(0)}% win`}</div>
              <div className="text-xs">avg {pct(h.avg_return_pct)} · median {pct(h.median_return_pct)}</div>
            </div>
          ))}
        </div>
        {events.length > 0 && (
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-background text-xs text-gray-500">
                <tr>
                  <th>Signal date</th>
                  {events[0].results.map((r) => <th key={r.horizon}>{r.horizon}b</th>)}
                  <th>Bracket</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.date} className="border-t">
                    <td className="font-mono text-xs">{e.date}</td>
                    {e.results.map((r) => <td key={r.horizon} className={tone(r.return_pct)}>{pct(r.return_pct)}</td>)}
                    <td>{bracketLabel(e.bracket)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-gray-500">
        Limits: daily bars only. Entry is the close of the bar after the signal (the signal is only known after its close). No slippage and no liquidity check, so thin NEPSE stocks may not fill at the close. Costs apply only if you set them. A good past result is evidence, not proof.
      </p>
    </div>
  );
}
