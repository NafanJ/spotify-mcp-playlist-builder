import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import QRCode from "qrcode";

export const runtime = "nodejs";

const W = 1080;
const H = 1920;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("playlist_events")
    .select("title, theme, description, cover_image_url")
    .eq("slug", slug)
    .single();

  if (!event) {
    return new Response("Event not found", { status: 404 });
  }

  const { origin } = new URL(request.url);
  const eventUrl = `${origin}/event/${slug}`;

  const qrDataUrl = await QRCode.toDataURL(eventUrl, {
    width: 360,
    margin: 2,
    color: { dark: "#09090b", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          background: "#09090b",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "120px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top: music icon + pill */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "#1DB954",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Simple music note via text */}
            <span style={{ fontSize: 48, color: "#000" }}>♪</span>
          </div>
          <span
            style={{
              fontSize: 28,
              color: "#1DB954",
              letterSpacing: 6,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Add a song
          </span>
        </div>

        {/* Middle: event info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 32,
            textAlign: "center",
          }}
        >
          {event.theme && (
            <span
              style={{
                fontSize: 32,
                color: "#71717a",
                fontWeight: 500,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {event.theme}
            </span>
          )}
          <span
            style={{
              fontSize: 96,
              color: "#ffffff",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -2,
            }}
          >
            {event.title}
          </span>
          {event.description && (
            <span
              style={{
                fontSize: 36,
                color: "#a1a1aa",
                fontWeight: 400,
                maxWidth: 800,
                lineHeight: 1.4,
              }}
            >
              {event.description}
            </span>
          )}
        </div>

        {/* Bottom: QR code + URL */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 24,
              padding: 20,
              display: "flex",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} width={320} height={320} alt="QR code" />
          </div>
          <span
            style={{
              fontSize: 28,
              color: "#52525b",
              fontWeight: 500,
              letterSpacing: 1,
            }}
          >
            {eventUrl.replace(/^https?:\/\//, "")}
          </span>
        </div>
      </div>
    ),
    { width: W, height: H }
  );
}
