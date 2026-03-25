import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify event belongs to this admin
  const { data: event } = await supabase
    .from("playlist_events")
    .select("id")
    .eq("id", id)
    .eq("created_by", user.id)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Delete submissions first (foreign key)
  await supabase.from("submissions").delete().eq("playlist_event_id", id);
  await supabase.from("vibe_requests").delete().eq("playlist_event_id", id);

  // Delete event
  const { error } = await supabase
    .from("playlist_events")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
