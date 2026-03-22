import { NextResponse } from "next/server";
import { searchTracks } from "@/lib/spotify";
import { createClient } from "@/lib/supabase/server";

interface VibeResponse {
  search_queries: string[];
  explanation: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, playlist_event_id } = body;

    if (!prompt || prompt.trim().length < 1) {
      return NextResponse.json(
        { error: "A vibe prompt is required" },
        { status: 400 }
      );
    }

    if (!playlist_event_id) {
      return NextResponse.json(
        { error: "playlist_event_id is required" },
        { status: 400 }
      );
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      );
    }

    // Call the Anthropic API to interpret the vibe prompt
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: `You are a music recommendation assistant. Given a vibe or mood description, generate 3-5 Spotify search queries that would find tracks matching that vibe. Return your response as JSON with this exact structure:
{
  "search_queries": ["query1", "query2", "query3"],
  "explanation": "Brief explanation of how you interpreted the vibe"
}
Each search query should be specific enough to find relevant tracks - include genre terms, artist names, mood descriptors, or song characteristics. Do not include any text outside the JSON object.`,
        messages: [
          {
            role: "user",
            content: `Find songs that match this vibe: "${prompt.trim()}"`,
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      console.error("Anthropic API error:", anthropicRes.status);
      return NextResponse.json(
        { error: "Failed to interpret vibe prompt" },
        { status: 502 }
      );
    }

    const anthropicData = await anthropicRes.json();
    const textContent = anthropicData.content?.find(
      (block: { type: string }) => block.type === "text"
    );

    if (!textContent) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 502 }
      );
    }

    let vibeResult: VibeResponse;
    try {
      vibeResult = JSON.parse(textContent.text);
    } catch {
      console.error("Failed to parse AI response:", textContent.text);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 502 }
      );
    }

    // Run all search queries in parallel
    const searchPromises = vibeResult.search_queries.map((query) =>
      searchTracks(query, 5)
    );
    const searchResults = await Promise.all(searchPromises);

    // Collect all tracks and deduplicate by track ID
    const seenIds = new Set<string>();
    const allTracks: Array<{
      track: (typeof searchResults)[0]["tracks"]["items"][0];
      query: string;
    }> = [];

    searchResults.forEach((result, index) => {
      for (const track of result.tracks.items) {
        if (!seenIds.has(track.id)) {
          seenIds.add(track.id);
          allTracks.push({
            track,
            query: vibeResult.search_queries[index],
          });
        }
      }
    });

    // Take top 5 tracks
    const topTracks = allTracks.slice(0, 5).map(({ track, query }) => ({
      id: track.id,
      uri: track.uri,
      name: track.name,
      artists: track.artists,
      album: track.album,
      preview_url: track.preview_url,
      external_urls: track.external_urls,
      reason: `Matched from "${query}" search`,
    }));

    // Log to vibe_requests table
    try {
      const supabase = await createClient();
      await supabase.from("vibe_requests").insert({
        playlist_event_id,
        prompt: prompt.trim(),
      });
    } catch (logError) {
      // Non-critical: don't fail the request if logging fails
      console.error("Failed to log vibe request:", logError);
    }

    return NextResponse.json({
      explanation: vibeResult.explanation,
      suggestions: topTracks.map((t) => ({
        track: {
          id: t.id,
          uri: t.uri,
          name: t.name,
          artists: t.artists,
          album: t.album,
          preview_url: t.preview_url,
          external_urls: t.external_urls,
        },
        reason: t.reason,
      })),
    });
  } catch (error) {
    console.error("Error processing vibe request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
