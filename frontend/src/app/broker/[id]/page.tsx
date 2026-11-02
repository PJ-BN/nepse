import { notFound } from "next/navigation";
import Link from "next/link";
import { BrokerProfileView } from "@/features/broker-profile";
import { PageContainer, PageHeader } from "@/shared/ui";

export default async function BrokerPage({ params }: { params: Promise<{ id: string }> }) {
  const broker = Number((await params).id);
  if (!Number.isInteger(broker) || broker <= 0) notFound();

  return (
    <PageContainer maxWidth="standard">
      <div className="space-y-6">
        <PageHeader
          title={`Broker #${broker} Analytics Profile`}
          description="Net accumulation positions, buy volume-weighted average prices, and multi-day sector rotation."
          icon="🏛️"
          actions={
            <div className="flex items-center gap-2">
              <Link
                href="/broker"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors"
              >
                ← Back to Brokers
              </Link>
              <Link
                href={`/floorsheet`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors"
              >
                📊 Floorsheet Flow
              </Link>
            </div>
          }
        />
        <BrokerProfileView broker={broker} />
      </div>
    </PageContainer>
  );
}
