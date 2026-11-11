import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadHindSiliguri } from "@remotion/google-fonts/HindSiliguri";
import { ICONS } from "./LogoPop";

// Bespoke motion graphics for the "pen and paper" talking-head video. All vector, all code.
// Panel geometry: left 40, top 60, 1000x400 -> bottom edge y=460 stays above the speaker's eyes (~y 580).
const { fontFamily: HIND } = loadHindSiliguri("normal", { weights: ["600", "700"], subsets: ["bengali", "latin"] });
const W = 1000, H = 400, YEL = "#FFD23F", CREAM = "#FBF1D9", INK = "#1B1B26";

const useT = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = Math.min(1, spring({ frame, fps, config: { damping: 15, stiffness: 140, mass: 0.8 } }));
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const p = frame / durationInFrames; // 0..1 progress
  return { frame, fps, durationInFrames, enter, exit, vis: enter * exit, p };
};
const ramp = (x: number, a: number, b: number) => interpolate(x, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const Panel: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => {
  const { enter, vis } = useT();
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 40, top: 60, width: W, height: H, borderRadius: 30, overflow: "hidden", opacity: vis,
        transform: `translateY(${(1 - enter) * -60}px) scale(${0.94 + 0.06 * enter})`,
        background: "linear-gradient(160deg,#171a2b 0%,#0e0f19 100%)", border: "1px solid rgba(255,255,255,.16)", boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}>
        {title ? <div style={{ position: "absolute", left: 0, right: 0, top: 14, textAlign: "center", color: "rgba(255,255,255,.7)", fontFamily: HIND, fontWeight: 600, fontSize: 30, letterSpacing: 1 }}>{title}</div> : null}
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>{children}</svg>
      </div>
    </AbsoluteFill>
  );
};
const T: React.FC<React.SVGProps<SVGTextElement>> = ({ children, ...r }) => (
  <text fontFamily={HIND} fontWeight={700} textAnchor="middle" {...r}>{children}</text>
);

// 1) keyboard vs pen -------------------------------------------------------
const KeyboardVsPen: React.FC = () => {
  const { frame, p } = useT();
  const dimLeft = 1 - 0.65 * ramp(p, 0.35, 0.6);
  const glowRight = ramp(p, 0.4, 0.7);
  const rows = [8, 7, 6];
  const keys: React.ReactNode[] = [];
  rows.forEach((n, r) => {
    for (let c = 0; c < n; c++) {
      const hit = Math.sin(frame * 0.9 + r * 2.1 + c * 1.7) > 0.82 && p < 0.55;
      keys.push(<rect key={`${r}-${c}`} x={50 + c * 55 + r * 14} y={140 + r * 62} width={46} height={50} rx={9} fill={hit ? YEL : "#2c3046"} />);
    }
  });
  const lines = [0, 1, 2, 3, 4];
  return (
    <Panel title="কিবোর্ড  vs  খাতা-কলম">
      <g opacity={dimLeft}>
        {keys}
        <T x={250} y={350} fontSize={34} fill="#9aa3c7">টাইপিং — হাত ব্যথা</T>
      </g>
      <text x={500} y={250} textAnchor="middle" fontFamily={HIND} fontWeight={700} fontSize={44} fill="#fff" opacity={0.8}>vs</text>
      <g transform="translate(560,100)">
        <rect width={380} height={240} rx={18} fill={CREAM} style={{ filter: `drop-shadow(0 0 ${12 + glowRight * 28}px rgba(255,210,63,${0.2 + glowRight * 0.6}))` }} />
        {lines.map((i) => {
          const w = 320 * ramp(p, 0.12 + i * 0.07, 0.3 + i * 0.07);
          return <rect key={i} x={30} y={50 + i * 36} width={w} height={5} rx={2.5} fill="#7b6d52" />;
        })}
        <g transform={`translate(${30 + 320 * ramp(p, 0.12, 0.62)},${34 + 36 * 4 * ramp(p, 0.12, 0.62)}) rotate(35)`}>
          <rect x={-6} y={-70} width={14} height={70} rx={4} fill="#222" />
          <rect x={-6} y={-70} width={14} height={14} rx={3} fill={YEL} />
          <polygon points="-6,0 8,0 1,16" fill="#c9a227" />
        </g>
      </g>
      <T x={750} y={375} fontSize={34} fill={YEL} opacity={glowRight}>ব্রেইন ডাম্প ✓</T>
    </Panel>
  );
};

// 2) brain activation ritual -------------------------------------------------
const Gear: React.FC<{ cx: number; cy: number; r: number; rot: number; color: string }> = ({ cx, cy, r, rot, color }) => (
  <g transform={`translate(${cx},${cy}) rotate(${rot})`}>
    {Array.from({ length: 8 }).map((_, i) => (
      <rect key={i} x={-r * 0.14} y={-r * 1.18} width={r * 0.28} height={r * 0.4} rx={3} fill={color} transform={`rotate(${i * 45})`} />
    ))}
    <circle r={r} fill={color} /><circle r={r * 0.45} fill="#0e0f19" />
  </g>
);
const BrainActivation: React.FC = () => {
  const { frame, p } = useT();
  const draw = ramp(p, 0.02, 0.4);
  const on = ramp(p, 0.3, 0.55);
  const pulse = 1 + 0.04 * Math.sin(frame / 4) * on;
  const outline = "M500 80 C430 55 350 90 358 150 C310 168 312 238 360 252 C356 305 430 332 480 302 L500 296 L520 302 C570 332 644 305 640 252 C688 238 690 168 642 150 C650 90 570 55 500 80 Z";
  const folds = ["M500 80 V296", "M420 130 C450 150 450 190 420 205", "M580 130 C550 150 550 190 580 205", "M400 250 C430 235 455 250 470 270", "M600 250 C570 235 545 250 530 270"];
  return (
    <Panel>
      <defs><radialGradient id="g1"><stop offset="0%" stopColor={YEL} stopOpacity={0.85} /><stop offset="100%" stopColor={YEL} stopOpacity={0} /></radialGradient></defs>
      <circle cx={500} cy={190} r={170 * pulse} fill="url(#g1)" opacity={on * 0.9} />
      <Gear cx={190} cy={205} r={52} rot={frame * 3} color="#3a4068" />
      <Gear cx={810} cy={205} r={52} rot={-frame * 3} color="#3a4068" />
      <g transform={`translate(500,180) scale(${0.9 * pulse}) translate(-500,-190)`}>
        <path d={outline} fill={`rgba(255,210,63,${0.16 * on})`} stroke={on > 0.5 ? YEL : "#cfd6ff"} strokeWidth={7} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        {folds.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={on > 0.5 ? YEL : "#cfd6ff"} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ramp(p, 0.15 + i * 0.05, 0.45 + i * 0.05)} />
        ))}
      </g>
      <T x={500} y={384} fontSize={34} fill="#fff" opacity={ramp(p, 0.35, 0.55)}>অ্যাক্টিভেশন রিচুয়াল  <tspan fill={YEL}>ON</tspan></T>
    </Panel>
  );
};

// 3) tools vs notebook ---------------------------------------------------------
const ToolsVsNotebook: React.FC = () => {
  const { p } = useT();
  const tools: { id: string; label: string }[] = [
    { id: "trello", label: "Trello" }, { id: "googledocs", label: "Google Docs" }, { id: "notepad", label: "Notepad" },
  ];
  return (
    <Panel>
      {tools.map((t, i) => {
        const y = 50 + i * 105;
        const x = ramp(p, 0.02 + i * 0.08, 0.14 + i * 0.08);
        const cross = ramp(p, 0.3 + i * 0.1, 0.4 + i * 0.1);
        const ic = ICONS[t.id];
        return (
          <g key={t.id} opacity={x} transform={`translate(${(1 - x) * -60},0)`}>
            <rect x={40} y={y} width={400} height={86} rx={20} fill="#222639" />
            {ic ? <svg x={62} y={y + 18} width={50} height={50} viewBox="0 0 24 24"><path d={ic.path} fill={ic.color} /></svg>
              : <g transform={`translate(62,${y + 18})`}><rect width={44} height={50} rx={6} fill="#cfd6ff" /><rect x={8} y={12} width={28} height={4} fill="#222639" /><rect x={8} y={22} width={28} height={4} fill="#222639" /><rect x={8} y={32} width={18} height={4} fill="#222639" /></g>}
            <T x={270} y={y + 56} fontSize={38} fill="#e8ebff">{t.label}</T>
            <line x1={40} y1={y + 43} x2={40 + 400 * cross} y2={y + 43} stroke="#ff4d5e" strokeWidth={8} strokeLinecap="round" />
          </g>
        );
      })}
      {(() => {
        const s = ramp(p, 0.5, 0.65), glow = 14 + 26 * ramp(p, 0.55, 0.8);
        return (
          <g transform={`translate(${500 + (1 - s) * 80},60) `} opacity={s}>
            <rect width={460} height={290} rx={24} fill={CREAM} style={{ filter: `drop-shadow(0 0 ${glow}px rgba(255,210,63,.75))` }} />
            {[0, 1, 2, 3].map((i) => <rect key={i} x={36} y={70 + i * 42} width={ramp(p, 0.62 + i * 0.05, 0.8 + i * 0.05) * 388} height={5} rx={2.5} fill="#7b6d52" />)}
            <T x={230} y={50} fontSize={44} fill={INK}>খাতা-কলম</T>
            <circle cx={410} cy={246} r={28} fill="#2fbf71" /><path d="M396 246 l10 11 l20 -22" stroke="#fff" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })()}
    </Panel>
  );
};

// 4) AI vs your head -> plan -> execute -------------------------------------------
const IdeaFlow: React.FC = () => {
  const { frame, p } = useT();
  const nodes = [
    { x: 150, label: "আপনার মাথা", sub: "আইডিয়া", c: YEL },
    { x: 500, label: "প্ল্যান", sub: "খাতা-কলম", c: "#7fd1ff" },
    { x: 850, label: "এক্সিকিউট", sub: "বাস্তবে", c: "#5be39a" },
  ];
  return (
    <Panel>
      {[0, 1].map((i) => {
        const a = ramp(p, 0.15 + i * 0.22, 0.3 + i * 0.22);
        return (<g key={i}>
          <line x1={nodes[i].x + 95} y1={210} x2={nodes[i + 1].x - 95} y2={210} stroke="#3a4068" strokeWidth={6} strokeDasharray="12 10" />
          <line x1={nodes[i].x + 95} y1={210} x2={nodes[i].x + 95 + (nodes[i + 1].x - nodes[i].x - 190) * a} y2={210} stroke="#fff" strokeWidth={6} strokeLinecap="round" />
        </g>);
      })}
      {nodes.map((n, i) => {
        const s = Math.min(1, ramp(p, i * 0.2, i * 0.2 + 0.12) * 1.1);
        const hot = Math.abs(p - (0.18 + i * 0.22)) < 0.1;
        const pul = hot ? 1 + 0.06 * Math.sin(frame / 2.5) : 1;
        return (
          <g key={i} transform={`translate(${n.x},210) scale(${s * pul})`}>
            <circle r={78} fill="#1f2338" stroke={n.c} strokeWidth={hot ? 9 : 5} style={{ filter: hot ? `drop-shadow(0 0 20px ${n.c})` : "none" }} />
            {i === 0 && <g><circle cy={-12} r={26} fill={n.c} /><rect x={-12} y={12} width={24} height={14} rx={4} fill={n.c} /></g>}
            {i === 1 && <g>{[-22, 0, 22].map((y) => <rect key={y} x={-30} y={y - 4} width={60} height={8} rx={4} fill={n.c} />)}</g>}
            {i === 2 && <g><path d="M-22 26 V-26 L28 -8 L-22 10" fill={n.c} /></g>}
            <T y={118} fontSize={36} fill="#fff">{n.label}</T>
          </g>
        );
      })}
      <g opacity={ramp(p, 0.55, 0.75)}>
        <rect x={330} y={36} width={340} height={46} rx={23} fill="none" stroke="#7a82a8" strokeWidth={3} strokeDasharray="8 7" />
        <T x={500} y={70} fontSize={28} fill="#aeb6dd">AI: ডায়াগ্রাম আঁকে, ভাবে না</T>
      </g>
    </Panel>
  );
};

// 5) sparkle CTA (no panel — bold text with stroke so it reads on the white background) --------
const Star: React.FC<{ x: number; y: number; r: number; d: number }> = ({ x, y, r, d }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - d, fps, config: { damping: 8, stiffness: 150, mass: 0.5 } });
  const tw = 1 + 0.15 * Math.sin((frame - d) / 4);
  return <path transform={`translate(${x},${y}) scale(${Math.max(0, s) * tw}) rotate(${(frame - d) * 2})`} d={`M0 ${-r} Q4 -4 ${r} 0 Q4 4 0 ${r} Q-4 4 ${-r} 0 Q-4 -4 0 ${-r}Z`} fill={YEL} stroke="#1b1b26" strokeWidth={3} />;
};
const MagicSparkle: React.FC = () => {
  const { enter, exit } = useT();
  const stars = [[150, 120, 38, 2], [880, 90, 30, 6], [60, 230, 24, 10], [940, 250, 36, 4], [500, 40, 28, 8], [250, 300, 22, 12], [780, 310, 26, 14]];
  return (
    <AbsoluteFill style={{ opacity: exit }}>
      <svg viewBox="0 0 1080 420" width={1080} height={420} style={{ position: "absolute", left: 0, top: 10 }}>
        <g transform="translate(40,0)">{stars.map(([x, y, r, d], i) => <Star key={i} x={x} y={y} r={r} d={d} />)}</g>
        <text x={540} y={200} textAnchor="middle" fontFamily={HIND} fontWeight={700} fontSize={92} fill="#fff" stroke="#1b1b26" strokeWidth={16} paintOrder="stroke" transform={`scale(${enter})`} style={{ transformOrigin: "540px 170px" }}>
          The <tspan fill={YEL}>magic</tspan>
        </text>
        <text x={540} y={300} textAnchor="middle" fontFamily={HIND} fontWeight={700} fontSize={92} fill="#fff" stroke="#1b1b26" strokeWidth={16} paintOrder="stroke" transform={`scale(${enter})`} style={{ transformOrigin: "540px 270px" }}>
          will happen
        </text>
      </svg>
    </AbsoluteFill>
  );
};

export const MotionGraphic: React.FC<{ kind: string }> = ({ kind }) => {
  switch (kind) {
    case "keyboard_vs_pen": return <KeyboardVsPen />;
    case "brain_activation": return <BrainActivation />;
    case "tools_vs_notebook": return <ToolsVsNotebook />;
    case "idea_flow": return <IdeaFlow />;
    case "magic_sparkle": return <MagicSparkle />;
    default: return null;
  }
};
