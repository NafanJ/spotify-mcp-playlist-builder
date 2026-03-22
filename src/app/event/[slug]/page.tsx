import { createClient } from "@/lib/supabase/server";
import { PlaylistEvent, Submission } from "@/lib/types";
import EventHeader from "@/components/EventHeader";
import RecentTracks from "@/components/RecentTracks";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("playlist_events")
    .select("*")
    .eq("slug", slug)
    .single<PlaylistEvent>();

  if (!event) {
    notFound();
  }

  const { data: recentTracks } = await supabase
    .from("submissions")
    .select("*")
    .eq("playlist_event_id", event.id)
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(20)
    .returns<Submission[]>();

  return (
    <div className="min-h-screen flex flex-col">
      <EventHeader event={event} />

      {event.is_open ? (
        <div className="px-4 py-6 space-y-3">
          <Link
            href={`/search?event=${event.slug}`}
            className="block w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-center py-4 rounded-xl text-lg transition-colors"
          >
            Search a song
          </Link>
          <Link
            href={`/vibe?event=${event.slug}`}
            className="block w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-center py-4 rounded-xl text-lg transition-colors border border-zinc-700"
          >
            Describe a vibe
          </Link>
          <p className="text-zinc-500 text-sm text-center pt-2">
            One song per person &middot; Keep it on theme
          </p>
        </div>
      ) : (
        <div className="px-4 py-8 text-center">
          <p className="text-zinc-400 text-lg">Submissions are closed</p>
        </div>
      )}

      {recentTracks && recentTracks.length > 0 && (
        <div className="px-4 pb-8">
          <RecentTracks submissions={recentTracks} />
        </div>
      )}
    </div>
  );
}
