import { Suspense } from "react";
import { NewsFeed } from "@/features/news";

export default function NewsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
      <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading NEPSE news hub…</div>}>
        <NewsFeed />
      </Suspense>
    </main>
  );
}
