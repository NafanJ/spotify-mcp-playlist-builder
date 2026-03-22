"use client";

import Image from "next/image";
import type { SpotifyTrack, Submission } from "@/lib/types";

type TrackLike = SpotifyTrack | Submission;

function isSpotifyTrack(track: TrackLike): track is SpotifyTrack {
  return "artists" in track && Array.isArray((track as SpotifyTrack).artists);
}

function getTrackDetails(track: TrackLike) {
  if (isSpotifyTrack(track)) {
    return {
      name: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      album: track.album.name,
      artwork: track.album.images[0]?.url ?? null,
    };
  }
  return {
    name: track.track_name,
    artist: track.artist_name,
    album: track.album_name,
    artwork: track.artwork_url,
  };
}

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  approved: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
};

interface TrackCardProps {
  track: TrackLike;
  action?: { label: string; onClick: () => void };
  showStatus?: boolean;
  compact?: boolean;
}

export default function TrackCard({
  track,
  action,
  showStatus,
  compact = false,
}: TrackCardProps) {
  const { name, artist, album, artwork } = getTrackDetails(track);
  const status = !isSpotifyTrack(track) ? track.status : null;

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-zinc-900 p-3">
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-800">
          {artwork ? (
            <Image
              src={artwork}
              alt={name}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-600">
              <MusicIcon />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-50">{name}</p>
          <p className="truncate text-xs text-zinc-400">{artist}</p>
        </div>

        {showStatus && status && (
          <span
            className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}
          >
            {status}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-zinc-900 p-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-800">
        {artwork ? (
          <Image
            src={artwork}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 448px) 100vw, 448px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-700">
            <MusicIcon size={64} />
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold text-zinc-50">{name}</h3>
          <p className="truncate text-sm text-zinc-400">{artist}</p>
          {album && (
            <p className="truncate text-xs text-zinc-500">{album}</p>
          )}
        </div>

        {showStatus && status && (
          <span
            className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}
          >
            {status}
          </span>
        )}
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 w-full rounded-xl bg-[#1DB954] py-3 text-sm font-bold text-black transition-colors hover:bg-[#1ed760] active:scale-[0.98]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function MusicIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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
  );
}
