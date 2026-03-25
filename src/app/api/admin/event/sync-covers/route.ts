import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlaylistImages } from "@/lib/spotify";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: events } = await supabase
    .from("playlist_events")
    .select("id, spotify_playlist_id, cover_image_url")
    .eq("created_by", user.id)
    .not("spotify_playlist_id", "is", null);

  if (!events || events.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  let updated = 0;
  for (const event of events) {
    try {
      const images = await getPlaylistImages(event.spotify_playlist_id);
      const newUrl = images?.[0]?.url ?? null;
      if (newUrl && newUrl !== event.cover_image_url) {
        await supabase
          .from("playlist_events")
          .update({ cover_image_url: newUrl })
          .eq("id", event.id);
        updated++;
      }
    } catch {
      // Skip failures
    }
  }

  return NextResponse.json({ updated });
}
