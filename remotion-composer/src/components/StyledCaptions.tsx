import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import "../vendor/captions.js"; // sets window.CaptionStyles (claude-caption-styles, MIT)
import type { WordCaption } from "./CaptionOverlay";

// Animated caption styles (editorial-highlight, pop-sticker, paper-plane, smoke-exit, explosive-breakup, rolodex-flip,
// retro-typer) driven frame-by-frame: the engine is deterministic, we just call seek(t) every frame.
declare global {
  interface Window { CaptionStyles: any }
}

export interface StyledCaptionsProps {
  words: WordCaption[];
  style: string;
  highlight?: string;
  y?: number; // % from top of the frame where the caption sits (default 78)
  size?: number; // scale, 1 = default
  maxWords?: number;
}

export const StyledCaptions: React.FC<StyledCaptionsProps> = ({ words, style, highlight = "#FFD23F", y = 78, size = 1, maxWords = 3 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLDivElement>(null);
  const api = useRef<any>(null);
  const [handle] = useState(() => delayRender("caption styles: fonts"));

  const seekTo = (a: any, t: number) => {
    const p = a.phrases.find((q: any) => t >= q.s && t < q.e);
    const start = p ? Math.max(0, p.s - 0.05) : t;
    for (let u = start; u < t; u += 1 / 15) a.seek(u); // replay the line up to now (random-access safe)
    a.seek(t);
  };

  useEffect(() => {
    const CS = window.CaptionStyles;
    if (!ref.current || !CS) { continueRender(handle); return; }
    const mapped = words.map((w) => ({ w: w.word, s: w.startMs / 1000, e: w.endMs / 1000, br: false })); // ignore our long-line page breaks: the engine breaks lines by maxWords/maxChars/pauses
    // one key word per line (longest word) gets the highlight colour
    for (const p of CS.phrases(mapped, { maxWords, maxChars: 22 })) {
      const best = [...p.w].sort((a: any, b: any) => b.t.length - a.t.length)[0];
      const m = mapped.find((x) => x.s === best.s && x.w === best.t);
      if (m) (m as any).k = true;
    }
    api.current = CS.create(ref.current, { style, highlight, y, size, words: mapped, lines: { maxWords, maxChars: 22 } });
    seekTo(api.current, frame / fps); // the seek effect below runs before this one on first render
    const fonts = Promise.race([CS.fontsReady ? CS.fontsReady() : Promise.resolve(), new Promise((r) => setTimeout(r, 8000))]);
    fonts.finally(() => continueRender(handle));
    return () => { try { api.current?.destroy(); } catch { /* ignore */ } };
  }, [words, style, highlight, y, size, maxWords, handle]);

  useLayoutEffect(() => {
    if (api.current) seekTo(api.current, frame / fps);
  }, [frame, fps, words, style, highlight, y, size, maxWords]);

  return <AbsoluteFill><div ref={ref} style={{ position: "absolute", inset: 0 }} /></AbsoluteFill>;
};
