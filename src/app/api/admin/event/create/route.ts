import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSpotifyPlaylist, refreshAdminToken } from "@/lib/spotify";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, slug, description, theme } = body;
    console.log("[create-event] Request body:", { title, slug, description, theme });

    if (!title || !slug) {
      return NextResponse.json(
        { error: "Title and slug are required" },
        { status: 400 }
      );
    }

    // Get admin's Spotify connection
    const { data: conn, error: connError } = await supabase
      .from("admin_spotify_connections")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (connError) {
      console.error("[create-event] Spotify connection lookup error:", connError);
    }

    if (!conn) {
      return NextResponse.json(
        { error: "Connect Spotify first" },
        { status: 400 }
      );
    }

    console.log("[create-event] Spotify connection found, user:", conn.spotify_user_id, "expires:", conn.expires_at);

    // Refresh token if needed
    let accessToken = conn.access_token;
    if (new Date(conn.expires_at) <= new Date()) {
      console.log("[create-event] Token expired, refreshing...");
      try {
        const refreshed = await refreshAdminToken(conn.refresh_token);
        accessToken = refreshed.access_token;
        await supabase
          .from("admin_spotify_connections")
          .update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token ?? conn.refresh_token,
            expires_at: new Date(
              Date.now() + refreshed.expires_in * 1000
            ).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", conn.id);
        console.log("[create-event] Token refreshed successfully");
      } catch (err) {
        console.error("[create-event] Token refresh failed:", err);
        return NextResponse.json(
          { error: "Spotify token refresh failed. Please reconnect Spotify." },
          { status: 500 }
        );
      }
    }

    // Create Spotify playlist
    console.log("[create-event] Creating Spotify playlist for user:", conn.spotify_user_id);
    let spotifyPlaylistId: string | null = null;
    let coverImageUrl: string | null = null;
    try {
      const playlist = await createSpotifyPlaylist(
        accessToken,
        conn.spotify_user_id,
        title,
        description || undefined
      );
      spotifyPlaylistId = playlist.id;
      console.log("[create-event] Spotify playlist created:", playlist.id);

      // Fetch playlist cover art
      try {
        const imgRes = await fetch(
          `https://api.spotify.com/v1/playlists/${playlist.id}/images`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (imgRes.ok) {
          const images = await imgRes.json();
          if (images.length > 0) {
            coverImageUrl = images[0].url;
          }
        }
      } catch {
        // Cover art is optional
      }
    } catch (err) {
      console.error("[create-event] Spotify playlist creation failed:", err);
      console.log("[create-event] Continuing without Spotify playlist — can be linked later");
    }

    // Create event in database
    const { data: event, error } = await supabase
      .from("playlist_events")
      .insert({
        title,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        description,
        theme,
        spotify_playlist_id: spotifyPlaylistId,
        cover_image_url: coverImageUrl,
        is_open: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[create-event] DB insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[create-event] Event created:", event.id);
    return NextResponse.json({ event });
  } catch (err) {
    console.error("[create-event] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
