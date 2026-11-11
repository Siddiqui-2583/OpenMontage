import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

// Plain image card (photo / illustration) for the top banner, above the speaker's eyes.
export interface ImageCardProps {
  image: string; // path relative to public/
  caption?: string;
  focusY?: number; // 0..1 vertical focus of the cover crop
}

export const ImageCard: React.FC<ImageCardProps> = ({ image, caption, focusY = 0.5 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = Math.min(1, spring({ frame, fps, config: { damping: 15, stiffness: 140, mass: 0.8 } }));
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vis = enter * exit;
  const zoom = interpolate(frame, [0, durationInFrames], [1.02, 1.12]);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 150, top: 30, width: 780, height: 520, borderRadius: 30, overflow: "hidden", opacity: vis,
        transform: `translateY(${(1 - enter) * -60}px) scale(${0.94 + 0.06 * enter})`,
        boxShadow: "0 20px 60px rgba(0,0,0,.35)", border: "4px solid #fff", background: "#222" }}>
        {/* contain: whole image visible, never cropped (box matches 3:2 art) */}
        <Img src={staticFile(image)} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: `50% ${focusY * 100}%` }} />
        {caption ? (
          <div style={{ position: "absolute", left: 24, bottom: 20, background: "rgba(0,0,0,.65)", color: "#fff", fontSize: 34, fontWeight: 700, padding: "8px 22px", borderRadius: 40, fontFamily: "'Hind Siliguri', sans-serif" }}>{caption}</div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
