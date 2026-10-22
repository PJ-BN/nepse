import { notFound } from "next/navigation";
import { BrokerProfileView } from "@/features/broker-profile";

export default async function BrokerPage({ params }: { params: Promise<{ id: string }> }) {
  const broker = Number((await params).id);
  if (!Number.isInteger(broker) || broker <= 0) notFound();
  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Broker #{broker}</h1>
      <BrokerProfileView broker={broker} />
    </main>
  );
}
