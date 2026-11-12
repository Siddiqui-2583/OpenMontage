import React from "react";
import { AbsoluteFill, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig } from "remotion";
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


// ---- "Dead Internet Theory" set -------------------------------------------------------------------------------
const RED = "#FF5C5C", CYAN = "#5CE1E6", GRAY = "#9aa3c7", CARD = "#2c3046";
const Bot: React.FC<{ x: number; y: number; s?: number; c?: string }> = ({ x, y, s = 1, c = GRAY }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <line x1={0} y1={-26} x2={0} y2={-34} stroke={c} strokeWidth={3} /><circle cx={0} cy={-36} r={4} fill={RED} />
    <rect x={-22} y={-26} width={44} height={36} rx={9} fill={c} />
    <circle cx={-9} cy={-9} r={5} fill="#0e0f19" /><circle cx={9} cy={-9} r={5} fill="#0e0f19" />
    <rect x={-10} y={2} width={20} height={4} rx={2} fill="#0e0f19" />
  </g>
);
const Human: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`} style={{ filter: "drop-shadow(0 0 10px rgba(255,210,63,.8))" }}>
    <circle cx={0} cy={-18} r={13} fill={YEL} /><path d="M-24 14 Q0 -8 24 14 Z" fill={YEL} />
  </g>
);

// 6) bots vs humans: a stream of icons, almost all bots (conceptual, not a statistic)
const BotsVsHumans: React.FC = () => {
  const { frame, p } = useT();
  const lanes = [135, 220, 305];
  const items: React.ReactNode[] = [];
  lanes.forEach((y, l) => {
    for (let j = 0; j < 13; j++) {
      const x = ((j * 92 - frame * (2.6 + l * 0.7) + l * 37) % 1196 + 1196) % 1196 - 98;
      items.push((j + l * 3) % 11 === 4 ? <Human key={`${l}-${j}`} x={x} y={y} /> : <Bot key={`${l}-${j}`} x={x} y={y} s={0.9} />);
    }
  });
  return (
    <Panel title="ইন্টারনেটের ট্রাফিক">
      {items}
      <T x={500} y={378} fontSize={32} fill="#fff" opacity={ramp(p, 0.3, 0.5)}>বট বট বট… মানুষ কয়জন?</T>
    </Panel>
  );
};

// 7) simulation grid: identical feed cards pulled by strings from above
const SimulationGrid: React.FC = () => {
  const { frame, p } = useT();
  const cards: React.ReactNode[] = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) {
    const x = 75 + c * 150, y = 160 + r * 98, sway = Math.sin(frame * 0.1 + c * 0.9 + r) * 6 * ramp(p, 0.05, 0.3);
    cards.push(
      <g key={`${r}-${c}`}>
        <line x1={x + 55} y1={78} x2={x + 55 + sway} y2={y} stroke="#6b7399" strokeWidth={2} />
        <g transform={`translate(${sway},${Math.sin(frame * 0.1 + c) * 3})`}>
          <rect x={x} y={y} width={110} height={80} rx={12} fill={CARD} stroke="rgba(255,255,255,.18)" />
          <circle cx={x + 24} cy={y + 24} r={11} fill={GRAY} /><rect x={x + 44} y={y + 16} width={52} height={7} rx={3} fill="#555d80" />
          <rect x={x + 44} y={y + 30} width={36} height={7} rx={3} fill="#555d80" /><rect x={x + 14} y={y + 52} width={82} height={10} rx={4} fill="#3b4163" />
        </g>
      </g>
    );
  }
  const hx = 500 + Math.sin(frame * 0.05) * 330;
  return (
    <Panel title="সিমুলেশন">
      {cards}
      <rect x={60} y={70} width={880} height={8} rx={4} fill="#6b7399" />
      <g transform={`translate(${hx},74)`}><circle r={20} fill="none" stroke={RED} strokeWidth={4} /><line x1={-28} y1={0} x2={28} y2={0} stroke={RED} strokeWidth={3} /><line x1={0} y1={-28} x2={0} y2={28} stroke={RED} strokeWidth={3} /></g>
      <T x={500} y={385} fontSize={30} fill="#fff" opacity={ramp(p, 0.4, 0.6)}>সবকিছু কন্ট্রোলড — আমরা ট্র্যাপড</T>
    </Panel>
  );
};

// 8) LLM = text generator: training-data tokens flow in, text flows out
const LlmTokens: React.FC = () => {
  const { frame, p } = useT();
  const words = ["the", "রাজা", "love", "গল্প", "code", "ভাষা"];
  const tokens = words.map((w, k) => {
    const u = ((frame * 2.2 + k * 52) % 312) / 312, x = 95 + u * 340, y = 160 + (k % 3) * 46;
    return <g key={k} opacity={Math.min(1, u * 5) * (1 - ramp(u, 0.8, 1))}><rect x={x - 34} y={y - 17} width={68} height={34} rx={17} fill={YEL} /><T x={x} y={y + 8} fontSize={22} fill={INK}>{w}</T></g>;
  });
  const out = [0, 1, 2].map((i) => <rect key={i} x={760} y={150 + i * 44} width={Math.max(0, 170 * ramp(((frame * 0.8 + i * 26) % 80) / 80, 0.05, 0.8))} height={14} rx={7} fill={CYAN} />);
  const glow = 14 + 10 * Math.sin(frame * 0.2);
  return (
    <Panel title="LLM কীভাবে লেখে?">
      <rect x={40} y={100} width={215} height={200} rx={22} fill="#1d2138" stroke="rgba(255,255,255,.2)" /><T x={147} y={142} fontSize={26} fill={GRAY}>ট্রেনিং ডেটা</T>
      {tokens}
      <circle cx={500} cy={205} r={74} fill="#23284a" stroke={YEL} strokeWidth={3} style={{ filter: `drop-shadow(0 0 ${glow}px rgba(255,210,63,.7))` }} /><T x={500} y={218} fontSize={40} fill="#fff">LLM</T>
      <rect x={745} y={100} width={215} height={200} rx={22} fill="#1d2138" stroke="rgba(255,255,255,.2)" /><T x={852} y={132} fontSize={26} fill={GRAY}>আউটপুট</T>{out}
      <T x={500} y={372} fontSize={32} fill="#fff" opacity={ramp(p, 0.4, 0.6)}>শুধুই একটা টেক্সট জেনারেটর</T>
    </Panel>
  );
};

// 9) everyone's content looks the same: varied cards morph into identical ones
const SameCards: React.FC = () => {
  const { frame, p } = useT();
  const cols = ["#FFD23F", "#FF8FA3", "#5CE1E6", "#B28DFF", "#7CF29A", "#FFA94D", "#74C0FC", "#F783AC"];
  const t = ramp(p, 0.3, 0.7);
  const cards = cols.map((c, i) => {
    const col = i % 4, row = Math.floor(i / 4), cx = 160 + col * 225, cy = 150 + row * 125;
    const w = interpolate(t, [0, 1], [130 + ((i * 37) % 60), 170]), h = interpolate(t, [0, 1], [80 + ((i * 23) % 40), 100]);
    const rot = interpolate(t, [0, 1], [((i % 3) - 1) * 9, 0]) + Math.sin(frame * 0.1 + i) * 1.2 * (1 - t), rad = interpolate(t, [0, 1], [4 + (i % 4) * 8, 14]);
    return <g key={i} transform={`translate(${cx},${cy}) rotate(${rot})`}><rect x={-w / 2} y={-h / 2} width={w} height={h} rx={rad} fill={interpolateColors(t, [0, 1], [c, GRAY])} /><rect x={-w / 2 + 14} y={-h / 2 + 16} width={w * 0.5} height={8} rx={4} fill="rgba(0,0,0,.25)" /><rect x={-w / 2 + 14} y={-h / 2 + 34} width={w * 0.7} height={8} rx={4} fill="rgba(0,0,0,.18)" /></g>;
  });
  return (
    <Panel title="সবার কনটেন্ট">
      {cards}
      <T x={500} y={380} fontSize={34} fill="#fff" opacity={ramp(p, 0.65, 0.85)}>সবই কাছাকাছি — একই রকম</T>
    </Panel>
  );
};

// 10) token burn: the meter drains while identical app screens repeat
const TokenBurn: React.FC = () => {
  const { frame, p } = useT();
  const level = 1 - ramp(p, 0.1, 0.9), color = interpolateColors(level, [0, 0.5, 1], [RED, "#FFA94D", YEL]);
  const apps = [0, 1, 2, 3, 4].map((i) => {
    const s = Math.min(1, ramp(p, 0.12 + i * 0.13, 0.22 + i * 0.13)), x = 60 + i * 180;
    return <g key={i} transform={`translate(${x + 80},${250}) scale(${s})`} opacity={s}><rect x={-80} y={-60} width={160} height={120} rx={12} fill={CARD} stroke="rgba(255,255,255,.2)" />
      <circle cx={-62} cy={-44} r={4} fill={RED} /><circle cx={-48} cy={-44} r={4} fill={YEL} /><circle cx={-34} cy={-44} r={4} fill="#7CF29A" />
      <rect x={-64} y={-26} width={90} height={9} rx={4} fill="#555d80" /><rect x={-64} y={-8} width={128} height={9} rx={4} fill="#3b4163" /><rect x={-64} y={10} width={60} height={9} rx={4} fill="#3b4163" /></g>;
  });
  const flame = 1 + 0.12 * Math.sin(frame * 0.5);
  return (
    <Panel title="টোকেন নষ্ট">
      <text x={60} y={132} fontFamily={HIND} fontWeight={700} fontSize={26} fill={GRAY}>টোকেন</text>
      <rect x={160} y={110} width={780} height={30} rx={15} fill="#1d2138" stroke="rgba(255,255,255,.2)" /><rect x={160} y={110} width={Math.max(8, 780 * level)} height={30} rx={15} fill={color} />
      <g transform={`translate(${160 + Math.max(8, 780 * level)},125) scale(${flame})`} opacity={ramp(p, 0.1, 0.2)}><path d="M0 -22 C14 -6 12 8 0 16 C-12 8 -14 -6 0 -22 Z" fill={RED} /><path d="M0 -8 C7 0 6 8 0 12 C-6 8 -7 0 0 -8 Z" fill={YEL} /></g>
      {apps}
      <T x={500} y={385} fontSize={30} fill="#fff" opacity={ramp(p, 0.55, 0.75)}>একই জিনিস — বারবার</T>
    </Panel>
  );
};

// 11) brain fades while AI grows (no claims beyond the speech)
const BrainAi: React.FC = () => {
  const { frame, p } = useT();
  const fade = 1 - 0.75 * ramp(p, 0.25, 0.75), grow = 0.7 + 0.6 * ramp(p, 0.25, 0.75), pulse = 1 + 0.04 * Math.sin(frame * 0.3);
  const pins = [-36, -12, 12, 36];
  return (
    <Panel title="কে ভাবছে?">
      <g transform="translate(260,205)" opacity={fade}><circle r={64} fill={YEL} opacity={0.9} /><rect x={-26} y={56} width={52} height={22} rx={6} fill={GRAY} /><rect x={-18} y={80} width={36} height={10} rx={5} fill={GRAY} />
        <path d="M-22 -10 Q0 -34 22 -10 M0 -24 L0 20" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" /></g>
      <path d="M360 205 L640 205" stroke={GRAY} strokeWidth={5} strokeDasharray="14 12" strokeDashoffset={-frame * 2} /><polygon points="640,185 680,205 640,225" fill={GRAY} />
      <g transform={`translate(790,205) scale(${grow * pulse})`}><rect x={-52} y={-52} width={104} height={104} rx={16} fill="#23284a" stroke={CYAN} strokeWidth={4} style={{ filter: "drop-shadow(0 0 18px rgba(92,225,230,.7))" }} />
        {pins.map((q) => <g key={q}><rect x={q - 3} y={-68} width={6} height={16} fill={CYAN} /><rect x={q - 3} y={52} width={6} height={16} fill={CYAN} /><rect x={-68} y={q - 3} width={16} height={6} fill={CYAN} /><rect x={52} y={q - 3} width={16} height={6} fill={CYAN} /></g>)}
        <T x={0} y={14} fontSize={38} fill={CYAN}>AI</T></g>
      <T x={500} y={385} fontSize={30} fill="#fff" opacity={ramp(p, 0.5, 0.7)}>ভাবনা কমছে — স্লপ বাড়ছে</T>
    </Panel>
  );
};

// 12) the way out: human -> unique thing -> AI trains -> unique output
const UniqueLoop: React.FC = () => {
  const { frame, p } = useT();
  const N = [{ x: 500, y: 118, t: "মানুষ", c: YEL }, { x: 800, y: 290, t: "ইউনিক ডেটা", c: CYAN }, { x: 200, y: 290, t: "AI ট্রেন", c: "#B28DFF" }];
  const u = ((frame * 0.011) % 1) * 3, i = Math.floor(u), f = u - i, a = N[i % 3], b = N[(i + 1) % 3];
  const dx = a.x + (b.x - a.x) * f, dy = a.y + (b.y - a.y) * f;
  return (
    <Panel title="ওয়ে আউট">
      {N.map((n, k) => { const m = N[(k + 1) % 3]; return <g key={k}><line x1={n.x} y1={n.y} x2={m.x} y2={m.y} stroke="#4a5178" strokeWidth={4} strokeDasharray="10 10" strokeDashoffset={-frame} /></g>; })}
      {N.map((n, k) => <g key={k} opacity={0.35 + 0.65 * ramp(p, k * 0.12, k * 0.12 + 0.2)}><rect x={n.x - 105} y={n.y - 30} width={210} height={60} rx={30} fill="#1d2138" stroke={n.c} strokeWidth={3} /><T x={n.x} y={n.y + 10} fontSize={30} fill={n.c}>{n.t}</T></g>)}
      <circle cx={dx} cy={dy} r={11} fill="#fff" style={{ filter: "drop-shadow(0 0 12px #fff)" }} />
      <T x={500} y={218} fontSize={26} fill={GRAY} opacity={ramp(p, 0.5, 0.7)}>ইউনিক → ইউনিক</T>
    </Panel>
  );
};

export const MotionGraphic: React.FC<{ kind: string }> = ({ kind }) => {
  switch (kind) {
    case "keyboard_vs_pen": return <KeyboardVsPen />;
    case "brain_activation": return <BrainActivation />;
    case "tools_vs_notebook": return <ToolsVsNotebook />;
    case "idea_flow": return <IdeaFlow />;
    case "magic_sparkle": return <MagicSparkle />;
    case "bots_vs_humans": return <BotsVsHumans />;
    case "simulation_grid": return <SimulationGrid />;
    case "llm_tokens": return <LlmTokens />;
    case "same_cards": return <SameCards />;
    case "token_burn": return <TokenBurn />;
    case "brain_ai": return <BrainAi />;
    case "unique_loop": return <UniqueLoop />;
    default: return null;
  }
};
