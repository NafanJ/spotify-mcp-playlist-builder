import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refreshAdminToken, addTrackToPlaylist } from "@/lib/spotify";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const fingerprint = request.headers.get("x-fingerprint");

    const {
      playlist_event_id,
      spotify_track_id,
      spotify_uri,
      track_name,
      artist_name,
      album_name,
      artwork_url,
      preview_url,
      submitted_by_name,
      note,
      source,
      vibe_prompt,
    } = body;

    if (!playlist_event_id || !spotify_track_id || !spotify_uri || !track_name || !artist_name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check event exists and is open
    const { data: event, error: eventError } = await supabase
      .from("playlist_events")
      .select("*")
      .eq("id", playlist_event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (!event.is_open) {
      return NextResponse.json(
        { error: "Submissions are closed for this event" },
        { status: 403 }
      );
    }

    // Duplicate track check
    const { data: existingTrack } = await supabase
      .from("submissions")
      .select("id")
      .eq("playlist_event_id", playlist_event_id)
      .eq("spotify_track_id", spotify_track_id)
      .limit(1)
      .single();

    if (existingTrack) {
      return NextResponse.json(
        { error: "This track has already been submitted for this event" },
        { status: 409 }
      );
    }

    // Insert as approved immediately
    const { data: submission, error: insertError } = await supabase
      .from("submissions")
      .insert({
        playlist_event_id,
        spotify_track_id,
        spotify_uri,
        track_name,
        artist_name,
        album_name: album_name || null,
        artwork_url: artwork_url || null,
        preview_url: preview_url || null,
        submitted_by_name: submitted_by_name || null,
        submitted_by_fingerprint: fingerprint || null,
        note: note || null,
        source: source || "search",
        vibe_prompt: vibe_prompt || null,
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting submission:", insertError);
      return NextResponse.json(
        { error: "Failed to create submission" },
        { status: 500 }
      );
    }

    // Add to Spotify playlist in the background (don't block the response)
    if (event.spotify_playlist_id) {
      addToSpotify(supabase, playlist_event_id, event.spotify_playlist_id, spotify_uri).catch(
        (err) => console.error("[submissions] Spotify add failed:", err)
      );
    }

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function addToSpotify(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  playlistId: string,
  spotifyUri: string
) {
  const { data: rows, error } = await supabase.rpc("get_event_spotify_connection", {
    p_event_id: eventId,
  });

  if (error || !rows || rows.length === 0) {
    console.warn("[submissions] No Spotify connection found for event", eventId);
    return;
  }

  const conn = rows[0];
  let accessToken: string = conn.access_token;

  if (Date.now() >= new Date(conn.expires_at).getTime()) {
    const refreshed = await refreshAdminToken(conn.refresh_token);
    accessToken = refreshed.access_token;
    await supabase.rpc("update_event_spotify_token", {
      p_user_id: conn.user_id,
      p_access_token: refreshed.access_token,
      p_refresh_token: refreshed.refresh_token || conn.refresh_token,
      p_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    });
  }

  await addTrackToPlaylist(accessToken, playlistId, spotifyUri);
}
