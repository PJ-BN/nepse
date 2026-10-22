import { AnnouncementsList } from "@/features/calendar";
import { IpoPipelineTable } from "@/features/macro";

export default function IpoPage() {
  return (
    <main className="space-y-8 p-6">
      <section>
        <h1 className="mb-4 text-2xl font-semibold">IPO &amp; right share listings</h1>
        <IpoPipelineTable />
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Latest announcements</h2>
        <AnnouncementsList />
      </section>
    </main>
  );
}
