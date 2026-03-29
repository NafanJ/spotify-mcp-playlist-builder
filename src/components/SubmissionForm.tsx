"use client";

import { useState } from "react";
import type { SpotifyTrack } from "@/lib/types";
import TrackCard from "./TrackCard";

interface SubmissionFormProps {
  track: SpotifyTrack;
  eventId: string;
  source: "search" | "vibe";
  vibePrompt?: string;
  onSuccess: (track: SpotifyTrack) => void;
  onCancel: () => void;
}

function getFingerprint(): string {
  const key = "playlist-builder-fp";
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(key, fp);
  }
  return fp;
}

const FRIENDLY_ERRORS: Record<string, { title: string; message: string }> = {
  duplicate: {
    title: "Already submitted",
    message: "This track has already been suggested for this playlist. Try a different song!",
  },
  "already-submitted": {
    title: "One song per person",
    message: "You've already submitted a song for this event.",
  },
  closed: {
    title: "Submissions closed",
    message: "This playlist is no longer accepting suggestions.",
  },
};

function classifyError(status: number, message: string): { title: string; message: string } | null {
  if (status === 409 && message.includes("track")) return FRIENDLY_ERRORS.duplicate;
  if (status === 409 && message.includes("already submitted")) return FRIENDLY_ERRORS["already-submitted"];
  if (status === 403) return FRIENDLY_ERRORS.closed;
  return null;
}

export default function SubmissionForm({
  track,
  eventId,
  source,
  vibePrompt,
  onSuccess,
  onCancel,
}: SubmissionFormProps) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [friendlyError, setFriendlyError] = useState<{ title: string; message: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    setFriendlyError(null);

    try {
      const fingerprint = getFingerprint();

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fingerprint": fingerprint,
        },
        body: JSON.stringify({
          playlist_event_id: eventId,
          spotify_track_id: track.id,
          spotify_uri: track.uri,
          track_name: track.name,
          artist_name: track.artists.map((a) => a.name).join(", "),
          album_name: track.album.name,
          artwork_url: track.album.images[0]?.url ?? null,
          preview_url: track.preview_url,
          submitted_by_name: name.trim() || null,
          note: note.trim() || null,
          source,
          vibe_prompt: vibePrompt ?? null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg = body?.error ?? "Failed to submit song";
        const friendly = classifyError(res.status, msg);
        if (friendly) {
          setFriendlyError(friendly);
        } else {
          setError(msg);
        }
        return;
      }

      setConfirmed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  // Confirmation state
  if (confirmed) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
        <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-zinc-950 p-6 sm:rounded-3xl">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-[#1DB954]/20 flex items-center justify-center mb-4">
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#1DB954" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">
              Added to the playlist!
            </h2>
            <p className="text-zinc-400 text-sm">
              Your song is in.
            </p>
          </div>

          <TrackCard track={track} compact />

          {note.trim() && (
            <p className="text-zinc-500 text-xs mt-2 ml-16 italic">
              &ldquo;{note.trim()}&rdquo;
            </p>
          )}

          <button
            onClick={() => onSuccess(track)}
            className="mt-6 w-full rounded-xl bg-zinc-800 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // Friendly error state (duplicate / already submitted / closed)
  if (friendlyError) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
        <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-zinc-950 p-6 sm:rounded-3xl">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">
              {friendlyError.title}
            </h2>
            <p className="text-zinc-400 text-sm">
              {friendlyError.message}
            </p>
          </div>

          <TrackCard track={track} compact />

          <button
            onClick={onCancel}
            className="mt-6 w-full rounded-xl bg-zinc-800 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
          >
            Pick a different song
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-zinc-950 p-6 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-50">Add this song</h2>
          <button
            onClick={onCancel}
            className="rounded-full p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Cancel"
          >
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <TrackCard track={track} compact />

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-50 placeholder-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-2 focus:ring-[#1DB954]/50"
          />

          <div className="relative">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              placeholder="Why this song? (optional)"
              rows={2}
              maxLength={200}
              className="w-full resize-none rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-50 placeholder-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-2 focus:ring-[#1DB954]/50"
            />
            <span className="absolute bottom-2 right-3 text-xs text-zinc-600">
              {note.length}/200
            </span>
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 flex items-center justify-center rounded-xl bg-[#1DB954] py-3.5 text-sm font-bold text-black transition-colors hover:bg-[#1ed760] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit song"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl py-3 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
