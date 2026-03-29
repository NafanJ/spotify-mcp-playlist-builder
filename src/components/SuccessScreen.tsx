"use client";

import { useEffect, useState } from "react";
import type { SpotifyTrack, PlaylistEvent } from "@/lib/types";
import TrackCard from "./TrackCard";

interface SuccessScreenProps {
  eventSlug: string;
  submittedTrack: SpotifyTrack;
  heading?: string;
  onAddAnother?: () => void;
}

export default function SuccessScreen({
  eventSlug,
  submittedTrack,
  heading = "Your song has been added!",
  onAddAnother,
}: SuccessScreenProps) {
  const [event, setEvent] = useState<PlaylistEvent | null>(null);

  useEffect(() => {
    fetch(`/api/event/${eventSlug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.event) setEvent(data.event);
      })
      .catch(() => {});
  }, [eventSlug]);

  const spotifyUrl = event?.spotify_playlist_id
    ? `https://open.spotify.com/playlist/${event.spotify_playlist_id}`
    : null;

  return (
    <div className="min-h-screen flex flex-col px-4 py-8 max-w-md mx-auto w-full">
      {/* Success header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-[#1DB954]/20 flex items-center justify-center mb-4">
          <svg
            width={28}
            height={28}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1DB954"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">{heading}</h1>
      </div>

      {/* Submitted track */}
      <div className="mb-6">
        <TrackCard track={submittedTrack} compact />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {spotifyUrl && (
          <a
            href={spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#1DB954] py-3.5 text-sm font-bold text-black hover:bg-[#1ed760] transition-colors"
          >
            <SpotifyIcon />
            Check out the playlist
          </a>
        )}

        {onAddAnother && (
          <button
            onClick={onAddAnother}
            className="w-full rounded-xl bg-zinc-800 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
          >
            Add another song
          </button>
        )}
      </div>
    </div>
  );
}

function SpotifyIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}
