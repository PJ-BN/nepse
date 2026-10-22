import { AnnouncementsList, DividendsBoard } from "@/features/calendar";

export default function DividendsPage() {
  return (
    <main className="space-y-8 p-6">
      <section>
        <h1 className="mb-4 text-2xl font-semibold">Dividends, rights &amp; book closures</h1>
        <DividendsBoard />
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Announcements</h2>
        <AnnouncementsList />
      </section>
    </main>
  );
}
