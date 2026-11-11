import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

// Top-half "screen" panel for the split-screen demo layout.
// Speaker is clipped to the bottom region by TalkingHead (see SPLIT_TOP); this panel fills the rest.
export const SPLIT_TOP = 1020; // y (px, 1080x1920 frame) where the speaker region starts

export interface ScreenPanelProps {
  src: string; // path relative to public/ (png/jpg/mp4/mov/webm)
  fit?: "cover" | "contain";
  // zoom into a region of interest: x/y 0..1 (origin), scale >= 1 reached by ~70% of the clip
  focus?: { x: number; y: number; scale?: number };
  label?: string; // small URL/app chip, e.g. "localhost:3010"
}

const isVideo = (s: string) => /\.(mp4|mov|webm|m4v)$/i.test(s);

export const ScreenPanel: React.FC<ScreenPanelProps> = ({ src, fit = "cover", focus, label }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = Math.min(1, spring({ frame, fps, config: { damping: 18, stiffness: 150, mass: 0.8 } }));
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = focus
    ? interpolate(frame, [0, durationInFrames * 0.7], [1, focus.scale ?? 1.6], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })
    : interpolate(frame, [0, durationInFrames], [1, 1.06]);
  const origin = focus ? `${focus.x * 100}% ${focus.y * 100}%` : "50% 50%";
  const mediaStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: fit, transform: `scale(${scale})`, transformOrigin: origin };
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 28, top: 36, width: 1024, height: SPLIT_TOP - 36 - 24, borderRadius: 28, overflow: "hidden",
        background: "#0b0b10", border: "3px solid rgba(255,255,255,.18)", boxShadow: "0 18px 50px rgba(0,0,0,.55)",
        opacity: enter * exit, transform: `translateY(${(1 - enter) * -50}px) scale(${0.96 + 0.04 * enter})` }}>
        {isVideo(src)
          ? <OffthreadVideo src={staticFile(src)} volume={0} style={mediaStyle} />
          : <Img src={staticFile(src)} style={mediaStyle} />}
        {label ? (
          <div style={{ position: "absolute", left: 22, top: 20, padding: "8px 20px", borderRadius: 40, background: "rgba(10,10,14,.72)",
            border: "1.5px solid rgba(255,255,255,.25)", color: "#fff", fontSize: 30, fontWeight: 600, fontFamily: "'Hind Siliguri', 'Inter', sans-serif" }}>{label}</div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
