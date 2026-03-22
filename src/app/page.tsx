import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();

  // Find the most recent open event
  const { data: events } = await supabase
    .from("playlist_events")
    .select("slug")
    .eq("is_open", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (events && events.length > 0) {
    redirect(`/event/${events[0].slug}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-6">🎶</div>
      <h1 className="text-3xl font-bold text-white mb-3">Add a Song</h1>
      <p className="text-zinc-400 mb-8">
        No active playlist events right now. Check back soon!
      </p>
      <Link
        href="/admin/login"
        className="text-zinc-500 text-sm hover:text-zinc-400"
      >
        Admin →
      </Link>
    </div>
  );
}
