"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BrokerIndexPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const valid = Number.isInteger(Number(id)) && Number(id) > 0;
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Brokers</h1>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) router.push(`/broker/${id}`);
        }}
      >
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          inputMode="numeric"
          placeholder="Broker number, e.g. 58"
          className="rounded border px-3 py-2"
        />
        <button disabled={!valid} className="rounded border px-3 py-2 disabled:opacity-50">
          Open
        </button>
      </form>
    </main>
  );
}
