import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// Big word that sits BEHIND the speaker (TalkingHead draws the person cut-out on top of it).
// Coordinates are in video space (1080x1920), so it follows the same dock/split transform as the speaker.
export interface BehindWordProps {
  text: string;
  y?: number; // top of the word, px from top of frame
  color?: string;
  size?: number; // font px; default fits the word to ~92% of the width
  shadow?: boolean;
}

export const BehindWord: React.FC<BehindWordProps> = ({ text, y = 110, color = "#16264a", size, shadow = true }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const chars = Array.from(text).length;
  const fit = Math.min(400, Math.round((1080 * 0.92) / Math.max(1, chars * 0.64)));
  const fontSize = size ?? fit;
  const drop = spring({ frame, fps, config: { damping: 11, stiffness: 120, mass: 0.8 } });
  const out = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", fontFamily: "'Hind Siliguri', 'Inter', sans-serif",
        fontWeight: 700, fontSize, lineHeight: 1.05, color, whiteSpace: "nowrap",
        transform: `translateY(${(1 - drop) * -(fontSize + y)}px)`,
        textShadow: shadow ? "0 10px 30px rgba(0,0,0,.25)" : undefined }}>{text}</div>
    </AbsoluteFill>
  );
};
