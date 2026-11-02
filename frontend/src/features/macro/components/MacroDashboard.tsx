"use client";

import type { ReactNode } from "react";
import { useRadar } from "../hooks/useMacro";
import { BreadthPanel } from "./BreadthPanel";
import { IpoPipelineTable } from "./IpoPipelineTable";
import { LiquidityGauge } from "./LiquidityGauge";
import { MacroDualAxis } from "./MacroDualAxis";
import { RrgChart } from "./RrgChart";
import { ResponsiveCard } from "@/shared/ui";

const Card = ({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) => (
  <ResponsiveCard className={className}>
    <div className="border-b border-border/60 pb-3 mb-4">
      <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
    <div className="min-w-0">{children}</div>
  </ResponsiveCard>
);

export function MacroDashboard() {
  const { data: radar, error } = useRadar();

  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-3 min-w-0">
      <Card
        title="NEPSE vs Banking Liquidity"
        subtitle="Benchmark index correlation against banking system excess reserves & interbank interest rates"
        className="lg:col-span-2"
      >
        {error ? (
          <p className="text-xs text-rose-600 bg-rose-500/10 p-3 rounded-xl">{error.message}</p>
        ) : radar ? (
          <div className="overflow-hidden rounded-xl">
            <MacroDualAxis radar={radar} />
          </div>
        ) : (
          <div className="h-64 rounded-xl bg-muted/30 animate-pulse" />
        )}
      </Card>

      <Card
        title="NRB Liquidity Regime"
        subtitle="Current banking system liquidity status and market bias"
      >
        {radar ? (
          <div className="overflow-hidden rounded-xl">
            <LiquidityGauge regime={radar.regime} />
          </div>
        ) : (
          <div className="h-64 rounded-xl bg-muted/30 animate-pulse" />
        )}
      </Card>

      <Card
        title="Comprehensive Market Breadth & Moving Average Participation"
        subtitle="Advancing vs declining scrips, McClellan oscillator, and percentage of stocks trading above key moving averages"
        className="lg:col-span-3"
      >
        <BreadthPanel />
      </Card>

      <Card
        title="Sector Rotation Graph (RRG)"
        subtitle="Trailing relative strength (J-Ratio) vs momentum (J-Momentum) identifying leading, weakening, lagging, and improving sectors"
        className="lg:col-span-3"
      >
        <div className="overflow-hidden rounded-xl">
          <RrgChart />
        </div>
      </Card>

      <Card
        title="SEBON Issue & Capital Raising Pipeline"
        subtitle="Active applications and approved prospectuses tracked directly from SEBON regulatory records"
        className="lg:col-span-3"
      >
        <IpoPipelineTable />
      </Card>
    </div>
  );
}
