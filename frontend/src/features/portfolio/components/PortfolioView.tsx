"use client";

import type { ReactNode } from "react";
import { setToken, useToken } from "../hooks/useToken";
import { AuthForm } from "./AuthForm";
import { FeeCalculator } from "./FeeCalculator";
import { HoldingsTable } from "./HoldingsTable";
import { RealizedPnl } from "./RealizedPnl";
import { TxnForm } from "./TxnForm";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function PortfolioView() {
  const token = useToken();
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Portfolio</h1>
        {token && (
          <button className="text-sm underline" onClick={() => setToken(null)}>
            Log out
          </button>
        )}
      </div>
      {token ? (
        <>
          <Section title="Holdings">
            <HoldingsTable token={token} />
          </Section>
          <Section title="Add transaction">
            <TxnForm token={token} />
          </Section>
          <Section title="Realised P/L">
            <RealizedPnl token={token} />
          </Section>
        </>
      ) : (
        <AuthForm />
      )}
      <Section title="Fee & tax calculator">
        <FeeCalculator />
      </Section>
    </div>
  );
}
