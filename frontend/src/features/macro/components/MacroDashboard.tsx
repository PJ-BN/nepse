"use client";

import type { ReactNode } from "react";
import { useRadar } from "../hooks/useMacro";
import { BreadthPanel } from "./BreadthPanel";
import { IpoPipelineTable } from "./IpoPipelineTable";
import { LiquidityGauge } from "./LiquidityGauge";
import { MacroDualAxis } from "./MacroDualAxis";
import { RrgChart } from "./RrgChart";

const Card = ({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) => (
  <section className={`rounded border p-4 ${className}`}>
    <h2 className="mb-3 font-semibold">{title}</h2>
    {children}
  </section>
);

export function MacroDashboard() {
  const { data: radar, error } = useRadar();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="NEPSE vs liquidity" className="lg:col-span-2">
        {error ? <p className="text-sm text-red-600">{error.message}</p> : radar ? <MacroDualAxis radar={radar} /> : <p className="text-sm text-gray-500">Loading…</p>}
      </Card>
      <Card title="Liquidity regime">
        {radar ? <LiquidityGauge regime={radar.regime} /> : <p className="text-sm text-gray-500">Loading…</p>}
      </Card>
      <Card title="Market breadth" className="lg:col-span-3">
        <BreadthPanel />
      </Card>
      <Card title="Sector rotation (RRG)" className="lg:col-span-3">
        <RrgChart />
      </Card>
      <Card title="SEBON issue pipeline" className="lg:col-span-3">
        <IpoPipelineTable />
      </Card>
    </div>
  );
}
