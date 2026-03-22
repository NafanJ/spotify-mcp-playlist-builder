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
  const [submitted, setSubmitted] = useState(false);

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

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-4">✨</div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Perfect pick! It&apos;s in the queue.
        </h1>
        <p className="text-zinc-400 mb-8">
          It&apos;ll show up once it&apos;s approved.
        </p>
        <Link
          href={`/event/${eventSlug}`}
          className="text-[#1DB954] font-semibold hover:underline"
        >
          Back to the playlist
        </Link>
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
          onSuccess={() => setSubmitted(true)}
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
