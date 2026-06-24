import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Viki Vendégház – Szilvásvárad";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#2A3228",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Háttér gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(232,168,130,0.25) 0%, transparent 70%)",
          }}
        />

        {/* Logó / ikon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 16,
            background: "#E8A882",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
            fontWeight: 700,
            color: "#2A3228",
            marginBottom: 32,
          }}
        >
          V
        </div>

        {/* Cím */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-1px",
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          Viki Vendégház
        </div>

        {/* Alcím */}
        <div
          style={{
            fontSize: 28,
            color: "#E8A882",
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          Szilvásvárad · Szalajka-völgy
        </div>

        {/* Feature badge-ek */}
        <div
          style={{
            display: "flex",
            gap: 16,
          }}
        >
          {["Sóbarlang", "Finn szauna", "Kültéri medence", "Max. 12 fő"].map((label) => (
            <div
              key={label}
              style={{
                padding: "8px 20px",
                borderRadius: 100,
                border: "1px solid rgba(232,168,130,0.4)",
                color: "rgba(255,255,255,0.7)",
                fontSize: 18,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            color: "rgba(255,255,255,0.3)",
            fontSize: 18,
            letterSpacing: "0.05em",
          }}
        >
          vikivendeghaz.hu
        </div>
      </div>
    ),
    { ...size }
  );
}
