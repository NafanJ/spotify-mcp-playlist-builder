import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refreshAdminToken, addTrackToPlaylist } from "@/lib/spotify";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify admin authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch the submission
    const { data: submission, error: subError } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", id)
      .single();

    if (subError || !submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    if (submission.status !== "pending") {
      return NextResponse.json(
        { error: `Submission is already ${submission.status}` },
        { status: 400 }
      );
    }

    // Fetch the playlist event to get spotify_playlist_id
    const { data: event, error: eventError } = await supabase
      .from("playlist_events")
      .select("*")
      .eq("id", submission.playlist_event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Playlist event not found" },
        { status: 404 }
      );
    }

    if (!event.spotify_playlist_id) {
      return NextResponse.json(
        { error: "No Spotify playlist linked to this event" },
        { status: 400 }
      );
    }

    // Fetch admin's Spotify connection
    const { data: connection, error: connError } = await supabase
      .from("admin_spotify_connections")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: "No Spotify connection found. Please connect your Spotify account." },
        { status: 400 }
      );
    }

    // Refresh the Spotify token if expired
    let accessToken = connection.access_token;
    const expiresAt = new Date(connection.expires_at).getTime();

    if (Date.now() >= expiresAt) {
      const refreshed = await refreshAdminToken(connection.refresh_token);
      accessToken = refreshed.access_token;

      // Update the refreshed token back in the database
      await supabase
        .from("admin_spotify_connections")
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token || connection.refresh_token,
          expires_at: new Date(
            Date.now() + refreshed.expires_in * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    // Add the track to the Spotify playlist
    await addTrackToPlaylist(
      accessToken,
      event.spotify_playlist_id,
      submission.spotify_uri
    );

    // Update submission status to approved
    const { data: updated, error: updateError } = await supabase
      .from("submissions")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating submission:", updateError);
      return NextResponse.json(
        { error: "Track was added to playlist but failed to update submission status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ submission: updated });
  } catch (error) {
    console.error("Error approving submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
