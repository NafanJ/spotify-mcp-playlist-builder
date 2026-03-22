import type { Submission } from "@/lib/types";
import TrackCard from "./TrackCard";

interface RecentTracksProps {
  submissions: Submission[];
}

export default function RecentTracks({ submissions }: RecentTracksProps) {
  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <div className="text-zinc-700">
          <svg
            width={48}
            height={48}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <p className="text-sm text-zinc-500">No songs added yet</p>
        <p className="text-xs text-zinc-600">Be the first to add one!</p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Recently added
      </h2>
      <div className="flex flex-col gap-2">
        {submissions.map((submission) => (
          <TrackCard key={submission.id} track={submission} compact />
        ))}
      </div>
    </section>
  );
}
