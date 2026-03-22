import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCode, getSpotifyProfile } from "@/lib/spotify";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("Spotify OAuth error:", error);
      return NextResponse.redirect(
        new URL("/admin/dashboard?error=spotify_denied", request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/admin/dashboard?error=missing_params", request.url)
      );
    }

    const supabase = await createClient();

    // Verify the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(
        new URL("/admin/dashboard?error=unauthorized", request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCode(code);

    // Get the Spotify user profile
    const profile = await getSpotifyProfile(tokens.access_token);

    // Upsert into admin_spotify_connections
    const { error: upsertError } = await supabase
      .from("admin_spotify_connections")
      .upsert(
        {
          user_id: user.id,
          spotify_user_id: profile.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(
            Date.now() + tokens.expires_in * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Error saving Spotify connection:", upsertError);
      return NextResponse.redirect(
        new URL("/admin/dashboard?error=save_failed", request.url)
      );
    }

    return NextResponse.redirect(
      new URL("/admin/dashboard?spotify=connected", request.url)
    );
  } catch (error) {
    console.error("Error handling Spotify callback:", error);
    return NextResponse.redirect(
      new URL("/admin/dashboard?error=callback_failed", request.url)
    );
  }
}
