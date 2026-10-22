import type { Flag } from "../types";

const STYLE: Record<Flag["level"], string> = {
  red: "border-red-300 bg-red-50 text-red-800",
  green: "border-green-300 bg-green-50 text-green-800",
  info: "border-gray-300 bg-gray-50 text-gray-800",
};

export function SectorFlags({ flags, metrics }: { flags: Flag[]; metrics: Record<string, unknown> | null }) {
  return (
    <section className="rounded border p-4">
      <h2 className="font-semibold">Sector health</h2>
      {flags.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">No flags raised.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {flags.map((f) => (
            <li key={f.code} className={`rounded border px-2 py-1 text-sm ${STYLE[f.level]}`}>
              {f.message}
            </li>
          ))}
        </ul>
      )}
      {metrics && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {Object.entries(metrics).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-gray-500">{k.replaceAll("_", " ")}</dt>
              <dd>{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
