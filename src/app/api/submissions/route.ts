import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Validate required fields
    if (!playlist_event_id || !spotify_track_id || !spotify_uri || !track_name || !artist_name) {
      return NextResponse.json(
        { error: "Missing required fields: playlist_event_id, spotify_track_id, spotify_uri, track_name, artist_name" },
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
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    if (!event.is_open) {
      return NextResponse.json(
        { error: "Submissions are closed for this event" },
        { status: 403 }
      );
    }

    // Check for duplicate track in same event (any status)
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

    // Insert the submission
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
        status: "pending",
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

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
