"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { searchSymbols } from "../api";

/** Symbol box with suggestions; matches the ticker or any part of the company name. */
export function SymbolSearch({ value, onSelect }: { value: string; onSelect: (symbol: string) => void }) {
  const [text, setText] = useState(value);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => setText(value), [value]);
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 200);
    return () => clearTimeout(t);
  }, [text]);

  const { data = [] } = useQuery({
    queryKey: ["udf", "search", q],
    queryFn: () => searchSymbols(q, 12),
    enabled: open && q !== "",
    staleTime: 60_000,
  });

  const pick = (symbol: string) => {
    setOpen(false);
    setText(symbol);
    onSelect(symbol);
  };

  return (
    <div className="relative">
      <input
        value={text}
        onFocus={(e) => {
          e.target.select();
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, data.length - 1));
          else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          else if (e.key === "Escape") setOpen(false);
          else if (e.key === "Enter") {
            e.preventDefault();
            const typed = text.trim().toUpperCase();
            // Highlighted suggestion wins; with none loaded, take the typed ticker as is.
            const hit = data[active];
            if (hit) pick(hit.symbol);
            else if (typed) pick(typed);
          }
        }}
        placeholder="Symbol or company name"
        aria-label="Symbol or company name"
        className="w-52 rounded border px-2 py-1 font-mono"
      />
      {open && data.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-80 overflow-auto rounded border bg-surface shadow-lg">
          {data.map((d, i) => (
            <li key={d.symbol}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(d.symbol)}
                className={`flex w-full items-baseline gap-2 px-2 py-1 text-left text-sm hover:bg-hover ${i === active ? "bg-hover" : ""}`}
              >
                <span className="font-mono font-semibold">{d.symbol}</span>
                <span className="truncate text-xs text-gray-500">{d.description}</span>
                {d.type === "index" && <span className="ml-auto text-[10px] uppercase text-gray-500">index</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
