import { NextResponse } from "next/server";
import { getSpotifyAuthUrl } from "@/lib/spotify";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = crypto.randomUUID();
  const url = getSpotifyAuthUrl(state);
  return NextResponse.redirect(url);
}
