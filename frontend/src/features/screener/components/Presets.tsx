"use client";

import { usePresets } from "../hooks/useScreener";
import type { Preset } from "../types";

export function Presets({ activeId, onPick }: { activeId: string | null; onPick: (p: Preset) => void }) {
  const { data, error } = usePresets();
  if (error) return <p className="text-sm text-red-600">Presets unavailable: {error.message}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {(data ?? []).map((p) => (
        <button
          key={p.id}
          type="button"
          title={p.description}
          onClick={() => onPick(p)}
          className={`rounded border px-3 py-1 text-sm ${
            activeId === p.id ? "border-blue-600 bg-blue-50 text-blue-700" : "hover:bg-gray-100"
          }`}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}
