"use client";

import { Suspense, useState } from "react";
import { SpotifyTrack } from "@/lib/types";
import VibeInput from "@/components/VibeInput";
import TrackCard from "@/components/TrackCard";
import SubmissionForm from "@/components/SubmissionForm";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface VibeSuggestion {
  track: SpotifyTrack;
  reason: string;
}

function VibeContent() {
  const searchParams = useSearchParams();
  const eventSlug = searchParams.get("event") || "";
  const [suggestions, setSuggestions] = useState<VibeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [vibePrompt, setVibePrompt] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [submittedTrack, setSubmittedTrack] = useState<SpotifyTrack | null>(null);

  async function handleVibe(prompt: string) {
    setVibePrompt(prompt);
    setLoading(true);
    try {
      // Fetch event ID
      if (!eventId && eventSlug) {
        const eventRes = await fetch(`/api/event/${eventSlug}`);
        const eventData = await eventRes.json();
        if (eventData.event?.id) {
          setEventId(eventData.event.id);
        }
      }

      const res = await fetch("/api/vibe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, playlist_event_id: eventId }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      setSuggestions([]);
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
            Perfect pick!
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
      <div className="px-4 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href={`/event/${eventSlug}`}
            className="text-zinc-400 hover:text-white text-sm"
          >
            ← Back
          </Link>
          <h1 className="text-lg font-bold text-white">Describe a vibe</h1>
        </div>
        <VibeInput onSubmit={handleVibe} loading={loading} />
      </div>

      <div className="flex-1 px-4 py-4 space-y-3">
        {suggestions.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-zinc-500 mb-2">Tell us a mood, a moment, a feeling.</p>
            <p className="text-zinc-600 text-sm italic">
              &ldquo;something for an emotional 2am bus ride home&rdquo;
            </p>
          </div>
        )}
        {suggestions.map((s) => (
          <div key={s.track.id}>
            <TrackCard
              track={s.track}
              action={{
                label: "Pick this one",
                onClick: () => setSelectedTrack(s.track),
              }}
            />
            <p className="text-zinc-500 text-xs mt-1 ml-16 italic">
              {s.reason}
            </p>
          </div>
        ))}
      </div>

      {selectedTrack && eventId && (
        <SubmissionForm
          track={selectedTrack}
          eventId={eventId}
          source="vibe"
          vibePrompt={vibePrompt}
          onSuccess={(t) => { setSubmittedTrack(t); setSelectedTrack(null); }}
          onCancel={() => setSelectedTrack(null)}
        />
      )}
    </div>
  );
}

export default function VibePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-zinc-400">Loading...</div>
        </div>
      }
    >
      <VibeContent />
    </Suspense>
  );
}
