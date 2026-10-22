"use client";

import { FIELDS, type FieldName, numericFields, opsFor } from "../fields";
import { type Combinator, newPill, type Pill } from "../pills";

type Props = {
  pills: Pill[];
  combinator: Combinator;
  onChange: (pills: Pill[], combinator: Combinator) => void;
};

const input = "rounded border px-2 py-1 text-sm";

function PillEditor({ pill, onChange, onRemove }: { pill: Pill; onChange: (p: Pill) => void; onRemove: () => void }) {
  const kind = FIELDS[pill.field].kind;
  const canCompare = kind === "num" && pill.op !== "between" && pill.op !== "in";
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-full border bg-gray-50 px-3 py-1 dark:bg-gray-900">
      <select
        aria-label="Field"
        className={input}
        value={pill.field}
        onChange={(e) => {
          const field = e.target.value as FieldName;
          const op = opsFor(field).includes(pill.op) ? pill.op : "=";
          onChange({ ...pill, field, op, compareTo: FIELDS[field].kind === "num" ? pill.compareTo : null });
        }}
      >
        {(Object.keys(FIELDS) as FieldName[]).map((f) => (
          <option key={f} value={f}>{FIELDS[f].label}</option>
        ))}
      </select>
      <select
        aria-label="Operator"
        className={input}
        value={pill.op}
        onChange={(e) => onChange({ ...pill, op: e.target.value as Pill["op"] })}
      >
        {opsFor(pill.field).map((op) => (
          <option key={op} value={op}>{op}</option>
        ))}
      </select>
      {canCompare && pill.compareTo ? (
        <select
          aria-label="Compare with field"
          className={input}
          value={pill.compareTo}
          onChange={(e) => onChange({ ...pill, compareTo: e.target.value as FieldName })}
        >
          {numericFields.map((f) => (
            <option key={f} value={f}>{FIELDS[f].label}</option>
          ))}
        </select>
      ) : (
        <input
          aria-label="Value"
          className={`${input} w-28`}
          inputMode={kind === "num" ? "decimal" : "text"}
          placeholder={pill.op === "in" ? "a,b,c" : pill.op === "between" ? "from" : "value"}
          value={pill.value}
          onChange={(e) => onChange({ ...pill, value: e.target.value })}
        />
      )}
      {pill.op === "between" && (
        <input
          aria-label="Upper bound"
          className={`${input} w-28`}
          inputMode="decimal"
          placeholder="to"
          value={pill.value2}
          onChange={(e) => onChange({ ...pill, value2: e.target.value })}
        />
      )}
      {canCompare && (
        <button
          type="button"
          className="text-xs text-blue-600 hover:underline"
          title="Compare with another column instead of a number"
          onClick={() => onChange({ ...pill, compareTo: pill.compareTo ? null : "sma_200" })}
        >
          {pill.compareTo ? "value" : "column"}
        </button>
      )}
      <button type="button" aria-label="Remove condition" className="px-1 text-gray-500 hover:text-red-600" onClick={onRemove}>
        ×
      </button>
    </div>
  );
}

export function FilterPillBuilder({ pills, combinator, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Combine conditions with"
        className={input}
        value={combinator}
        onChange={(e) => onChange(pills, e.target.value as Combinator)}
      >
        <option value="and">Match all</option>
        <option value="or">Match any</option>
      </select>
      {pills.map((p) => (
        <PillEditor
          key={p.id}
          pill={p}
          onChange={(next) => onChange(pills.map((x) => (x.id === p.id ? next : x)), combinator)}
          onRemove={() => onChange(pills.filter((x) => x.id !== p.id), combinator)}
        />
      ))}
      <button
        type="button"
        className="rounded-full border border-dashed px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={() => onChange([...pills, newPill()], combinator)}
      >
        + condition
      </button>
    </div>
  );
}
