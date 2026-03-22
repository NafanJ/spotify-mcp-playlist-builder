import { NextResponse } from "next/server";
import { searchTracks } from "@/lib/spotify";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length < 1) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required and must be at least 1 character" },
        { status: 400 }
      );
    }

    const result = await searchTracks(q.trim());

    return NextResponse.json({ tracks: result.tracks.items });
  } catch (error) {
    console.error("Error searching tracks:", error);
    return NextResponse.json(
      { error: "Failed to search tracks" },
      { status: 500 }
    );
  }
}
