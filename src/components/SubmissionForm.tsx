"use client";

import { useState } from "react";
import type { SpotifyTrack } from "@/lib/types";
import TrackCard from "./TrackCard";

interface SubmissionFormProps {
  track: SpotifyTrack;
  eventId: string;
  source: "search" | "vibe";
  vibePrompt?: string;
  onSuccess: () => void;
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

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
        throw new Error(body?.error ?? "Failed to submit song");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
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
