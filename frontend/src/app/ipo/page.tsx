import { AnnouncementsList } from "@/features/calendar";
import { IpoPipelineTable } from "@/features/macro";
import { PageContainer, PageHeader, ResponsiveCard } from "@/shared/ui";

export default function IpoPage() {
  return (
    <PageContainer maxWidth="standard">
      <div className="space-y-6">
        <PageHeader
          title="IPO & Right Share Pipeline"
          description="SEBON regulatory approval stages, applied prospectus filings, issue sizes, and capital raising announcements."
          icon="🚀"
        />

        <div className="space-y-6">
          <ResponsiveCard>
            <IpoPipelineTable />
          </ResponsiveCard>

          <ResponsiveCard>
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
              <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>📢</span>
                <span>Latest Public Offering Notices</span>
              </h2>
            </div>
            <AnnouncementsList />
          </ResponsiveCard>
        </div>
      </div>
    </PageContainer>
  );
}
