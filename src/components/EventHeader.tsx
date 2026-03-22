import Image from "next/image";
import type { PlaylistEvent } from "@/lib/types";

interface EventHeaderProps {
  event: PlaylistEvent;
}

export default function EventHeader({ event }: EventHeaderProps) {
  return (
    <header className="relative flex flex-col gap-4">
      {/* Cover image or gradient fallback */}
      <div className="relative aspect-[2/1] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950">
        {event.cover_image_url ? (
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 448px) 100vw, 448px"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              width={64}
              height={64}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-700"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />

        {/* Status badge */}
        <div className="absolute right-3 top-3">
          {event.is_open ? (
            <span className="flex items-center gap-1.5 rounded-full bg-[#1DB954]/20 px-3 py-1 text-xs font-semibold text-[#1DB954] backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1DB954] animate-pulse" />
              Open
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-zinc-800/80 px-3 py-1 text-xs font-semibold text-zinc-400 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
              Closed
            </span>
          )}
        </div>
      </div>

      {/* Title and description */}
      <div className="flex flex-col gap-2 px-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-50">
          {event.title}
        </h1>

        {event.description && (
          <p className="text-sm leading-relaxed text-zinc-400">
            {event.description}
          </p>
        )}

        {event.theme && (
          <span className="inline-flex w-fit items-center rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">
            {event.theme}
          </span>
        )}
      </div>
    </header>
  );
}
