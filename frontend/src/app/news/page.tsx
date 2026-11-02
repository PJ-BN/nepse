import { Suspense } from "react";
import { NewsFeed } from "@/features/news";
import { PageContainer } from "@/shared/ui";

export default function NewsPage() {
  return (
    <PageContainer maxWidth="standard">
      <Suspense fallback={<div className="p-8 text-sm text-muted-foreground animate-pulse">Loading NEPSE news hub…</div>}>
        <NewsFeed />
      </Suspense>
    </PageContainer>
  );
}
