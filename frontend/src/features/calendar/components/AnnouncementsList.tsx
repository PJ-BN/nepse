"use client";

import { useAnnouncements } from "../hooks/useCalendar";

export function AnnouncementsList() {
  const { data, error } = useAnnouncements();
  if (error) return <p className="text-sm text-red-600">Announcements unavailable: {error.message}</p>;
  if (!data?.length) return <p className="text-sm text-gray-500">No announcements yet.</p>;
  return (
    <ul className="max-h-[32rem] divide-y overflow-auto text-sm">
      {data.map((a) => (
        <li key={a.url} className="py-2">
          <span className="mr-2 tabular-nums text-gray-500">{a.published_on}</span>
          <a href={a.url} target="_blank" rel="noreferrer" className="hover:underline">{a.title}</a>
        </li>
      ))}
    </ul>
  );
}
