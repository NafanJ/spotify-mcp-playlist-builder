import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refreshAdminToken } from "@/lib/spotify";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get admin's Spotify token
  const { data: conn } = await supabase
    .from("admin_spotify_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!conn) {
    return NextResponse.json({ updated: 0 });
  }

  let accessToken = conn.access_token;
  if (new Date(conn.expires_at) <= new Date()) {
    try {
      const refreshed = await refreshAdminToken(conn.refresh_token);
      accessToken = refreshed.access_token;
      await supabase
        .from("admin_spotify_connections")
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token ?? conn.refresh_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conn.id);
    } catch {
      return NextResponse.json({ updated: 0 });
    }
  }

  // Get all events with Spotify playlists
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
      const res = await fetch(
        `https://api.spotify.com/v1/playlists/${event.spotify_playlist_id}/images`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) continue;
      const images = await res.json();
      const newUrl = images?.[0]?.url ?? null;
      if (newUrl !== event.cover_image_url) {
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
