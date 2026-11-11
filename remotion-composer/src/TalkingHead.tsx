import {
  AbsoluteFill,
  OffthreadVideo,
  interpolateColors,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CaptionOverlay, WordCaption } from "./components/CaptionOverlay";
import { resolveAsset } from "./lib/resolveAsset";
import { TextCard } from "./components/TextCard";
import { StatCard } from "./components/StatCard";
import { CalloutBox } from "./components/CalloutBox";
import { ComparisonCard } from "./components/ComparisonCard";
import { BarChart } from "./components/charts/BarChart";
import { LineChart } from "./components/charts/LineChart";
import { PieChart } from "./components/charts/PieChart";
import { KPIGrid } from "./components/charts/KPIGrid";
import { HeroTitle } from "./components/HeroTitle";
import { SectionTitle } from "./components/SectionTitle";
import { StatReveal } from "./components/StatReveal";
import { LogoPop } from "./components/LogoPop";
import { RepoCard } from "./components/RepoCard";
import { ImageCard } from "./components/ImageCard";
import { MotionGraphic } from "./components/MotionGraphic";
import { ScreenPanel, SPLIT_TOP } from "./components/ScreenPanel";
import { GlassCard } from "./components/GlassCard";
import { BehindWord } from "./components/BehindWord";
import { loadFont as loadHindSiliguri } from "@remotion/google-fonts/HindSiliguri";

const { fontFamily: HIND_SILIGURI } = loadHindSiliguri("normal", { weights: ["600", "700"], subsets: ["bengali", "latin"] });

// ---------------------------------------------------------------------------
// Overlay types for talking-head video
// ---------------------------------------------------------------------------

export interface TalkingHeadOverlay {
  id?: string;
  type: string;
  in_seconds: number;
  out_seconds: number;
  position?:
    | "lower_third"
    | "upper_third"
    | "top_banner"
    | "left_panel"
    | "right_panel"
    | "full_overlay";
  // Component-specific props (same as Explainer Cut)
  text?: string;
  stat?: string;
  subtitle?: string;
  callout_type?: "info" | "warning" | "tip" | "quote";
  title?: string;
  leftLabel?: string;
  rightLabel?: string;
  leftValue?: string;
  rightValue?: string;
  logos?: string[];
  image?: string;
  url?: string;
  kind?: string;
  y?: number;
  items?: string[];
  focus?: { x: number; y: number; scale?: number };
  fit?: "cover" | "contain";
  chartData?: any[];
  chartSeries?: any[];
  chartColors?: string[];
  chartAnimation?: string;
  donut?: boolean;
  centerLabel?: string;
  centerValue?: string;
  showGrid?: boolean;
  showValues?: boolean;
  showLegend?: boolean;
  showMarkers?: boolean;
  columns?: 2 | 3 | 4;
  // Styling
  backgroundColor?: string;
  color?: string;
  accentColor?: string;
  fontSize?: number;
}

// ---------------------------------------------------------------------------
// Position presets for 9:16 (1080x1920) frame
// ---------------------------------------------------------------------------

const POSITION_STYLES: Record<string, React.CSSProperties> = {
  lower_third: {
    position: "absolute",
    bottom: 320, // Above caption area (~1600px)
    left: 40,
    right: 40,
    height: 480,
  },
  upper_third: {
    position: "absolute",
    top: 80,
    left: 40,
    right: 40,
    height: 480,
  },
  top_banner: {
    position: "absolute",
    top: 50,
    left: 40,
    right: 40,
    height: 340,
  },
  left_panel: {
    position: "absolute",
    top: 200,
    left: 40,
    width: 480,
    bottom: 400,
  },
  right_panel: {
    position: "absolute",
    top: 200,
    right: 40,
    width: 480,
    bottom: 400,
  },
  full_overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
};

// ---------------------------------------------------------------------------
// Overlay component dispatcher — maps overlay type to Remotion component
// ---------------------------------------------------------------------------

const OverlayContent: React.FC<{ overlay: TalkingHeadOverlay }> = ({
  overlay,
}) => {
  const bgColor = overlay.backgroundColor || "#0F172A";

  if (overlay.type === "text_card" && overlay.text) {
    return (
      <TextCard
        text={overlay.text}
        fontSize={overlay.fontSize}
        color={overlay.color}
        backgroundColor={bgColor}
      />
    );
  }
  if (overlay.type === "stat_card" && overlay.stat) {
    return (
      <StatCard
        stat={overlay.stat}
        subtitle={overlay.subtitle}
        accentColor={overlay.accentColor}
        backgroundColor={bgColor}
      />
    );
  }
  if (overlay.type === "callout" && overlay.text) {
    return (
      <CalloutBox
        text={overlay.text}
        type={overlay.callout_type}
        title={overlay.title}
        borderColor={overlay.accentColor}
        backgroundColor={overlay.backgroundColor}
        textColor={overlay.color}
        containerBackgroundColor={bgColor}
      />
    );
  }
  if (
    overlay.type === "comparison" &&
    overlay.leftLabel &&
    overlay.rightLabel
  ) {
    return (
      <ComparisonCard
        leftLabel={overlay.leftLabel}
        rightLabel={overlay.rightLabel}
        leftValue={overlay.leftValue || ""}
        rightValue={overlay.rightValue || ""}
        title={overlay.title}
        backgroundColor={bgColor}
        textColor={overlay.color}
      />
    );
  }
  if (overlay.type === "bar_chart" && overlay.chartData) {
    return (
      <BarChart
        data={overlay.chartData}
        title={overlay.title}
        colors={overlay.chartColors}
        animationStyle={(overlay.chartAnimation as any) || "grow-up"}
        showValues={overlay.showValues}
        backgroundColor={bgColor}
      />
    );
  }
  if (overlay.type === "line_chart" && overlay.chartSeries) {
    return (
      <LineChart
        series={overlay.chartSeries}
        title={overlay.title}
        colors={overlay.chartColors}
        animationStyle={(overlay.chartAnimation as any) || "draw"}
        showGrid={overlay.showGrid}
        showMarkers={overlay.showMarkers}
        showLegend={overlay.showLegend}
        backgroundColor={bgColor}
      />
    );
  }
  if (overlay.type === "pie_chart" && overlay.chartData) {
    return (
      <PieChart
        data={overlay.chartData}
        title={overlay.title}
        colors={overlay.chartColors}
        animationStyle={(overlay.chartAnimation as any) || "expand"}
        donut={overlay.donut}
        centerLabel={overlay.centerLabel}
        centerValue={overlay.centerValue}
        showLegend={overlay.showLegend}
        backgroundColor={bgColor}
      />
    );
  }
  if (overlay.type === "kpi_grid" && overlay.chartData) {
    return (
      <KPIGrid
        metrics={overlay.chartData}
        title={overlay.title}
        columns={overlay.columns}
        colors={overlay.chartColors}
        animationStyle={(overlay.chartAnimation as any) || "count-up"}
        backgroundColor={bgColor}
      />
    );
  }
  if (overlay.type === "motion_graphic" && overlay.kind) {
    return <MotionGraphic kind={overlay.kind} />;
  }
  if (overlay.type === "screen_split" && overlay.image) {
    return <ScreenPanel src={overlay.image} fit={overlay.fit} focus={overlay.focus} label={overlay.text} />;
  }
  if (overlay.type === "glass_card" && (overlay.text || overlay.items?.length)) {
    return <GlassCard title={overlay.title} text={overlay.text} items={overlay.items} accent={overlay.accentColor} />;
  }
  if (overlay.type === "dim") return null;
  if (overlay.type === "image_card" && overlay.image) {
    return <ImageCard image={overlay.image} caption={overlay.text} />;
  }
  if (overlay.type === "repo_card" && overlay.image && overlay.url) {
    return <RepoCard image={overlay.image} url={overlay.url} />;
  }
  if (overlay.type === "logo_pop" && (overlay.logos?.length || overlay.text)) {
    return (
      <LogoPop
        logos={overlay.logos ?? []}
        label={overlay.text}
        sublabel={overlay.subtitle}
      />
    );
  }
  if (overlay.type === "hero_title" && overlay.text) {
    return <HeroTitle title={overlay.text} subtitle={overlay.subtitle} />;
  }
  if (overlay.type === "section_title" && overlay.text) {
    return (
      <SectionTitle
        title={overlay.text}
        subtitle={overlay.subtitle}
        accentColor={overlay.accentColor}
        position="top-left"
      />
    );
  }
  if (overlay.type === "stat_reveal" && overlay.text) {
    return (
      <StatReveal
        stat={overlay.text}
        label={overlay.subtitle}
        accentColor={overlay.accentColor}
        position="bottom-right"
      />
    );
  }
  return null;
};

// ---------------------------------------------------------------------------
// Positioned overlay wrapper — handles position + fade in/out
// ---------------------------------------------------------------------------

const PositionedOverlay: React.FC<{ overlay: TalkingHeadOverlay }> = ({
  overlay,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Fade in over 8 frames (~0.27s), fade out over 8 frames
  const fadeIn = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = fadeIn * fadeOut;

  const position = overlay.position || "lower_third";
  const posStyle = POSITION_STYLES[position] || POSITION_STYLES.lower_third;
  const isFullOverlay = position === "full_overlay";

  return (
    <div
      style={{
        ...posStyle,
        opacity,
        overflow: "hidden",
        borderRadius: isFullOverlay ? 0 : 16,
        boxShadow: isFullOverlay || overlay.type === "logo_pop" || overlay.type === "repo_card" || overlay.type === "motion_graphic" || overlay.type === "image_card" || overlay.type === "screen_split" || overlay.type === "glass_card"
          ? "none"
          : "0 8px 32px rgba(0, 0, 0, 0.4)",
      }}
    >
      {isFullOverlay && overlay.type !== "repo_card" && overlay.type !== "motion_graphic" && overlay.type !== "image_card" && overlay.type !== "screen_split" && overlay.type !== "glass_card" && overlay.type !== "dim" && (
        <AbsoluteFill style={{ background: "rgba(0, 0, 0, 0.7)" }} />
      )}
      <OverlayContent overlay={overlay} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main TalkingHead composition
// ---------------------------------------------------------------------------

export interface TalkingHeadProps {
  [key: string]: unknown;
  videoSrc: string;
  captions: WordCaption[];
  overlays?: TalkingHeadOverlay[];
  wordsPerPage?: number;
  fontSize?: number;
  highlightColor?: string;
  captionColor?: string;
  captionBackgroundColor?: string;
  captionFontFamily?: string;
  // Pass "" for CJK captions (no inter-word spacing); defaults to " ".
  captionWordSeparator?: string;
  captionBottomOffset?: number;
  captionStrokeWidth?: number;
  // Transparent WebM of the speaker (scripts/my_workflow/person_matte.py); needed for `behind_word` overlays.
  cutoutSrc?: string;
}

export const TalkingHead: React.FC<TalkingHeadProps> = ({
  videoSrc,
  captions,
  overlays,
  wordsPerPage = 4,
  fontSize = 52,
  highlightColor = "#22D3EE",
  captionColor = "#FFFFFF",
  captionBackgroundColor = "rgba(0, 0, 0, 0.65)",
  captionFontFamily,
  captionWordSeparator,
  captionBottomOffset,
  captionStrokeWidth,
  cutoutSrc,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Layout modes driven by overlays (all ramp in/out over RAMP frames):
  //  - dock  (image_card / motion_graphic / glass_card): speaker slides down, graphic sits above the head
  //  - split (screen_split): screen panel on top, speaker clipped into the bottom region
  //  - dim   (dim): speaker darkened so a caption/word reads
  const ramp = (types: string[], r: number) => {
    let v = 0;
    for (const o of overlays ?? []) {
      if (!types.includes(o.type)) continue;
      const a = Math.round(o.in_seconds * fps);
      const b = Math.round(o.out_seconds * fps);
      v = Math.max(v, interpolate(frame, [a, a + r, b - r, b], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    }
    return v * v * (3 - 2 * v);
  };
  const split = ramp(["screen_split"], 10);
  const dock = split > 0 ? 0 : ramp(["image_card", "motion_graphic", "glass_card"], 10);
  const dim = ramp(["dim"], 6);
  const DOCK_SHIFT = 380;
  const SPLIT_SHIFT = SPLIT_TOP - 150; // source y=150 (just above the head) lands at SPLIT_TOP
  const shift = dock * DOCK_SHIFT + split * SPLIT_SHIFT;
  const seamOffset = 1920 - (SPLIT_TOP + 40); // caption pill sits on the seam during split
  const capBottom = (captionBottomOffset ?? 80) * (1 - split) + seamOffset * split;

  return (
    <AbsoluteFill style={{ backgroundColor: interpolateColors(split, [0, 1], ["#D8D6D8", "#101014"]) }}>
      {/* Layer 1: Speaker video (shifted / clipped / dimmed by layout mode) */}
      <AbsoluteFill style={{ clipPath: split > 0 ? `inset(${split * SPLIT_TOP}px 0 0 0)` : undefined }}>
        <AbsoluteFill
          style={{
            transform: `translateY(${shift}px)`,
            filter: dim > 0 ? `brightness(${1 - 0.65 * dim})` : undefined,
            WebkitMaskImage: dock > 0 ? `linear-gradient(to bottom, transparent 0px, #000 ${Math.round(dock * 140)}px)` : undefined,
          }}
        >
          <OffthreadVideo
            src={resolveAsset(videoSrc)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          {/* Words behind the speaker + the person cut-out drawn over them */}
          {cutoutSrc && overlays?.filter((o) => o.type === "behind_word" && o.text).map((o, i) => {
            const from = Math.round(o.in_seconds * fps);
            const duration = Math.round((o.out_seconds - o.in_seconds) * fps);
            return (
              <Sequence key={o.id || `behind-${i}`} from={from} durationInFrames={duration} layout="none">
                <BehindWord text={o.text!} y={o.y} color={o.color} />
                <OffthreadVideo src={resolveAsset(cutoutSrc)} startFrom={from} transparent muted
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              </Sequence>
            );
          })}
        </AbsoluteFill>
      </AbsoluteFill>

      {/* Layer 2: Overlays (charts, stats, callouts, etc.) */}
      {overlays?.filter((o) => o.type !== "behind_word").map((overlay, i) => {
        const from = Math.round(overlay.in_seconds * fps);
        const duration = Math.round(
          (overlay.out_seconds - overlay.in_seconds) * fps
        );
        return (
          <Sequence
            key={overlay.id || `overlay-${i}`}
            from={from}
            durationInFrames={duration}
          >
            <PositionedOverlay overlay={overlay} />
          </Sequence>
        );
      })}

      {/* Layer 3: Captions (topmost — always visible above overlays) */}
      <CaptionOverlay
        words={captions}
        wordsPerPage={wordsPerPage}
        fontSize={fontSize}
        highlightColor={highlightColor}
        backgroundColor={captionBackgroundColor}
        color={captionColor}
        {...(captionFontFamily ? { fontFamily: captionFontFamily === "hind-siliguri" ? HIND_SILIGURI : captionFontFamily } : {})}
        bottomOffset={capBottom}
        {...(captionStrokeWidth !== undefined ? { strokeWidth: captionStrokeWidth } : {})}
        {...(captionWordSeparator !== undefined ? { wordSeparator: captionWordSeparator } : {})}
      />
    </AbsoluteFill>
  );
};
