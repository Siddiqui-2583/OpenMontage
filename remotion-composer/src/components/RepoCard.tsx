import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

// GitHub repo screenshot card for 9:16 talking-head: dims the speaker, springs a rounded
// card into the upper area (above the eyes) with a slow push-in, and a repo URL pill below.
export interface RepoCardProps {
  image: string; // path relative to public/
  url: string; // e.g. github.com/obra/superpowers
  // crop of the (3420x1902) screenshot, as fractions of its width/height
  cropX?: number;
  cropY?: number;
}

export const RepoCard: React.FC<RepoCardProps> = ({ image, url, cropX = 0.137, cropY = 0.004 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 15, stiffness: 140, mass: 0.8 } });
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vis = Math.min(enter, 1) * exit;
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.1]);
  const CARD_W = 1000, CARD_H = 520, BG_W = 1389;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(0,0,0,0.42)", opacity: exit * Math.min(1, enter * 1.5) }} />
      <div style={{ position: "absolute", left: 40, top: 110, width: CARD_W, height: CARD_H, borderRadius: 26, overflow: "hidden", opacity: vis,
        transform: `translateY(${(1 - Math.min(enter, 1)) * -60}px) scale(${0.94 + 0.06 * Math.min(enter, 1)})`,
        boxShadow: "0 20px 60px rgba(0,0,0,.6)", border: "1px solid rgba(255,255,255,.14)", background: "#0d1117" }}>
        <div style={{ width: "100%", height: "100%", transform: `scale(${zoom})`, transformOrigin: "20% 12%" }}>
          <Img src={staticFile(image)} style={{ position: "absolute", width: BG_W, left: -cropX * BG_W, top: -cropY * BG_W, maxWidth: "none" }} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 655, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: vis, transform: `translateY(${(1 - Math.min(enter, 1)) * 24}px)` }}>
        <span style={{ fontFamily: "'JetBrains Mono', Menlo, monospace", fontWeight: 600, fontSize: 38, color: "#fff", background: "#111", border: "3px solid #3fb950", borderRadius: 40, padding: "12px 32px" }}>{url}</span>
      </div>
    </AbsoluteFill>
  );
};
