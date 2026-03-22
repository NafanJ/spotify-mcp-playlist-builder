import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const { event_id, is_open } = body;

    if (!event_id || typeof is_open !== "boolean") {
      return NextResponse.json(
        { error: "event_id and is_open (boolean) are required" },
        { status: 400 }
      );
    }

    // Update the playlist event
    const { data: event, error: updateError } = await supabase
      .from("playlist_events")
      .update({ is_open })
      .eq("id", event_id)
      .select()
      .single();

    if (updateError || !event) {
      return NextResponse.json(
        { error: "Failed to update event" },
        { status: 500 }
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Error toggling event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
