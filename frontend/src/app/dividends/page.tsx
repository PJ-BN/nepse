import { AnnouncementsList, DividendsBoard } from "@/features/calendar";
import { PageContainer, PageHeader, ResponsiveCard } from "@/shared/ui";

export default function DividendsPage() {
  return (
    <PageContainer maxWidth="standard">
      <div className="space-y-6">
        <PageHeader
          title="Dividends, Rights & Book Closures"
          description="Track corporate distribution events, right share entitlements, book closure dates, and official AGM notices."
          icon="💰"
        />

        <div className="space-y-6">
          <ResponsiveCard>
            <DividendsBoard />
          </ResponsiveCard>

          <ResponsiveCard>
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
              <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>📢</span>
                <span>Official Corporate Announcements</span>
              </h2>
            </div>
            <AnnouncementsList />
          </ResponsiveCard>
        </div>
      </div>
    </PageContainer>
  );
}
