import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// Frosted "glass" card in the top area (the speaker is docked below it by TalkingHead).
// Variants: title/text only, or a checklist (items tick in one by one).
export interface GlassCardProps {
  title?: string;
  text?: string;
  items?: string[];
  accent?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ title, text, items, accent = "#FFD23F" }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = Math.min(1, spring({ frame, fps, config: { damping: 16, stiffness: 140, mass: 0.8 } }));
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const font = "'Hind Siliguri', 'Inter', sans-serif";
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 90, top: 56, width: 900, minHeight: 200, maxHeight: 380, padding: "34px 44px", boxSizing: "border-box",
        borderRadius: 40, background: "rgba(18,18,26,.62)", backdropFilter: "blur(28px) saturate(150%)", WebkitBackdropFilter: "blur(28px) saturate(150%)",
        border: "1.5px solid rgba(255,255,255,.38)", boxShadow: "0 20px 60px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.35)",
        color: "#fff", fontFamily: font, opacity: enter * exit, transform: `translateY(${(1 - enter) * -50}px) scale(${0.95 + 0.05 * enter})` }}>
        {title ? <div style={{ fontSize: 30, letterSpacing: 4, textTransform: "uppercase", color: accent, fontWeight: 700, marginBottom: 14 }}>{title}</div> : null}
        {text ? <div style={{ fontSize: 58, lineHeight: 1.2, fontWeight: 700 }}>{text}</div> : null}
        {items?.map((it, i) => {
          const t = interpolate(frame, [10 + i * 9, 18 + i * 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, fontSize: 44, fontWeight: 600, marginTop: i ? 14 : 0, opacity: 0.35 + 0.65 * t }}>
              <svg width="46" height="46" viewBox="0 0 46 46"><circle cx="23" cy="23" r="20" fill={t > 0.5 ? accent : "none"} stroke={accent} strokeWidth="3" />
                <path d="M13 24 L20 31 L33 16" fill="none" stroke="#111" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="40" strokeDashoffset={40 * (1 - t)} /></svg>
              <span>{it}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
