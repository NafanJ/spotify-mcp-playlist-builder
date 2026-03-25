"use client";

import { Suspense, useState } from "react";
import { SpotifyTrack } from "@/lib/types";
import SearchInput from "@/components/SearchInput";
import TrackCard from "@/components/TrackCard";
import SubmissionForm from "@/components/SubmissionForm";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function SearchContent() {
  const searchParams = useSearchParams();
  const eventSlug = searchParams.get("event") || "";
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [submittedTrack, setSubmittedTrack] = useState<SpotifyTrack | null>(null);

  async function handleSearch(query: string) {
    if (!query.trim()) {
      setTracks([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setTracks(data.tracks || []);

      if (!eventId && eventSlug) {
        const eventRes = await fetch(`/api/event/${eventSlug}`);
        const eventData = await eventRes.json();
        if (eventData.event?.id) {
          setEventId(eventData.event.id);
        }
      }
    } catch {
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }

  if (submittedTrack) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-[#1DB954]/20 flex items-center justify-center mx-auto mb-4">
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#1DB954" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            You&apos;re in the queue!
          </h1>
          <p className="text-zinc-400 text-sm mb-6">
            Your song will appear once it&apos;s approved.
          </p>
          <div className="mb-8">
            <TrackCard track={submittedTrack} compact />
          </div>
          <Link
            href={`/event/${eventSlug}`}
            className="inline-block w-full rounded-xl bg-zinc-800 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
          >
            Back to the playlist
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800 px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href={`/event/${eventSlug}`}
            className="text-zinc-400 hover:text-white text-sm"
          >
            ← Back
          </Link>
          <h1 className="text-lg font-bold text-white">Search a song</h1>
        </div>
        <SearchInput
          onSearch={handleSearch}
          loading={loading}
          placeholder="Search by title, artist, or album..."
        />
      </div>

      <div className="flex-1 px-4 py-4 space-y-2">
        {tracks.length === 0 && !loading && (
          <p className="text-zinc-500 text-center py-12">
            Start typing to search Spotify
          </p>
        )}
        {tracks.map((track) => (
          <TrackCard
            key={track.id}
            track={track}
            action={{
              label: "Add",
              onClick: () => setSelectedTrack(track),
            }}
          />
        ))}
      </div>

      {selectedTrack && eventId && (
        <SubmissionForm
          track={selectedTrack}
          eventId={eventId}
          source="search"
          onSuccess={(t) => { setSubmittedTrack(t); setSelectedTrack(null); }}
          onCancel={() => setSelectedTrack(null)}
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-zinc-400">Loading...</div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
