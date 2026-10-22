import { ScreenerView } from "@/features/screener";

export default function ScreenerPage() {
  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Stock screener</h1>
      <ScreenerView />
    </main>
  );
}
