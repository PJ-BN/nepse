import { MutualFundsView } from "@/features/mutual-funds";

export default function MutualFundsPage() {
  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Mutual funds: NAV discount</h1>
      <MutualFundsView />
    </main>
  );
}
