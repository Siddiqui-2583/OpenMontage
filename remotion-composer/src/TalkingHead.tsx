import {
  AbsoluteFill,
  OffthreadVideo,
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
        boxShadow: isFullOverlay || overlay.type === "logo_pop" || overlay.type === "repo_card" || overlay.type === "motion_graphic" || overlay.type === "image_card"
          ? "none"
          : "0 8px 32px rgba(0, 0, 0, 0.4)",
      }}
    >
      {isFullOverlay && overlay.type !== "repo_card" && overlay.type !== "motion_graphic" && overlay.type !== "image_card" && (
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
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // "Dock": while an image_card / motion_graphic is up, slide the speaker down
  // so the graphic gets its own clear area above the head (nothing is cropped
  // or covered). 0 = normal framing, 1 = fully docked.
  const RAMP = 10;
  let dock = 0;
  for (const o of overlays ?? []) {
    if (o.type !== "image_card" && o.type !== "motion_graphic") continue;
    const a = Math.round(o.in_seconds * fps);
    const b = Math.round(o.out_seconds * fps);
    const d = interpolate(frame, [a, a + RAMP, b - RAMP, b], [0, 1, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    dock = Math.max(dock, d);
  }
  const eased = dock * dock * (3 - 2 * dock);
  const DOCK_SHIFT = 380;

  return (
    <AbsoluteFill style={{ backgroundColor: "#D8D6D8" }}>
      {/* Layer 1: Video background (shifted down while docked) */}
      <AbsoluteFill
        style={{
          transform: `translateY(${eased * DOCK_SHIFT}px)`,
          WebkitMaskImage: `linear-gradient(to bottom, transparent 0px, #000 ${Math.round(eased * 140)}px)`,
        }}
      >
        <OffthreadVideo
          src={resolveAsset(videoSrc)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      {/* Layer 2: Overlays (charts, stats, callouts, etc.) */}
      {overlays?.map((overlay, i) => {
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
        {...(captionBottomOffset !== undefined ? { bottomOffset: captionBottomOffset } : {})}
        {...(captionStrokeWidth !== undefined ? { strokeWidth: captionStrokeWidth } : {})}
        {...(captionWordSeparator !== undefined ? { wordSeparator: captionWordSeparator } : {})}
      />
    </AbsoluteFill>
  );
};
