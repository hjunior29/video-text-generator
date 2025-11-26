import React from "react";
import {
  AbsoluteFill,
  getInputProps,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TheBoldFont } from "../load-font";
import { fitText } from "@remotion/layout-utils";
import { makeTransform, scale, translateY, translateX } from "@remotion/animation-utils";
import { TikTokPage } from "@remotion/captions";

// Style presets
const stylePresets = {
  tiktok: {
    fontFamily: TheBoldFont,
    textTransform: "uppercase" as const,
    letterSpacing: 2,
    shadowIntensity: 1,
  },
  capcut: {
    fontFamily: TheBoldFont,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    shadowIntensity: 1.5,
  },
  minimal: {
    fontFamily: TheBoldFont,
    textTransform: "none" as const,
    letterSpacing: 0,
    shadowIntensity: 0.5,
  },
  bold: {
    fontFamily: TheBoldFont,
    textTransform: "uppercase" as const,
    letterSpacing: 3,
    shadowIntensity: 2,
  },
  neon: {
    fontFamily: TheBoldFont,
    textTransform: "uppercase" as const,
    letterSpacing: 4,
    shadowIntensity: 0,
  },
  gradient: {
    fontFamily: TheBoldFont,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    shadowIntensity: 1,
  },
};

type AnimationStyle = "bounce" | "slide" | "fade" | "pop" | "wave" | "none";
type StylePreset = keyof typeof stylePresets;
type BackgroundStyle = "none" | "blur" | "solid" | "gradient";

export const Page: React.FC<{
  readonly enterProgress: number;
  readonly page: TikTokPage;
  readonly animationStyle: AnimationStyle;
}> = ({ enterProgress, page, animationStyle }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const timeInMs = (frame / fps) * 1000;

  const inputProps = getInputProps();

  // Get props with defaults
  const stylePreset = (inputProps.stylePreset as StylePreset) || "tiktok";
  const FONT_SIZE = (inputProps.fontSize as number) || 48;
  const HIGHLIGHT_COLOR = (inputProps.highlightColor as string) || "#39E508";
  const TEXT_COLOR = (inputProps.textColor as string) || "#FFFFFF";
  const STROKE_COLOR = (inputProps.strokeColor as string) || "#000000";
  const STROKE_WIDTH = (inputProps.strokeWidth as number) || 5;
  const POSITION_Y = (inputProps.positionY as number) || 85;
  const BACKGROUND_STYLE = (inputProps.backgroundStyle as BackgroundStyle) || "none";
  const BACKGROUND_COLOR = (inputProps.backgroundColor as string) || "#000000";
  const BACKGROUND_OPACITY = (inputProps.backgroundOpacity as number) || 0.6;

  const preset = stylePresets[stylePreset];

  // Fit text to screen width
  const fittedText = fitText({
    fontFamily: preset.fontFamily,
    text: page.text,
    withinWidth: width * 0.9,
    textTransform: preset.textTransform,
  });

  const fontSize = Math.min(FONT_SIZE, fittedText.fontSize);

  // Animation transforms based on style
  const getTransform = () => {
    switch (animationStyle) {
      case "bounce":
        return makeTransform([
          scale(interpolate(enterProgress, [0, 1], [0.7, 1])),
          translateY(interpolate(enterProgress, [0, 1], [80, 0])),
        ]);

      case "slide":
        return makeTransform([
          translateY(interpolate(enterProgress, [0, 1], [100, 0])),
        ]);

      case "fade":
        return makeTransform([
          scale(1),
        ]);

      case "pop":
        const popScale = interpolate(enterProgress, [0, 0.5, 1], [0.3, 1.15, 1]);
        return makeTransform([
          scale(popScale),
        ]);

      case "wave":
        return makeTransform([
          scale(interpolate(enterProgress, [0, 1], [0.9, 1])),
          translateX(interpolate(enterProgress, [0, 1], [-30, 0])),
        ]);

      case "none":
      default:
        return "none";
    }
  };

  // Neon glow effect for neon preset
  const getNeonGlow = () => {
    if (stylePreset === "neon") {
      return `
        0 0 5px ${HIGHLIGHT_COLOR},
        0 0 10px ${HIGHLIGHT_COLOR},
        0 0 20px ${HIGHLIGHT_COLOR},
        0 0 40px ${HIGHLIGHT_COLOR}
      `;
    }
    return undefined;
  };

  // Text shadow based on preset
  const getTextShadow = () => {
    const intensity = preset.shadowIntensity;
    if (intensity === 0) return undefined;

    return `
      ${2 * intensity}px ${2 * intensity}px ${4 * intensity}px rgba(0,0,0,0.8),
      ${-1 * intensity}px ${-1 * intensity}px ${2 * intensity}px rgba(0,0,0,0.5)
    `;
  };

  // Background styles
  const getBackgroundStyle = (): React.CSSProperties => {
    switch (BACKGROUND_STYLE) {
      case "solid":
        return {
          backgroundColor: `${BACKGROUND_COLOR}${Math.round(BACKGROUND_OPACITY * 255).toString(16).padStart(2, "0")}`,
          padding: "10px 20px",
          borderRadius: 10,
        };

      case "gradient":
        return {
          background: `linear-gradient(180deg, transparent 0%, ${BACKGROUND_COLOR}${Math.round(BACKGROUND_OPACITY * 255).toString(16).padStart(2, "0")} 50%, transparent 100%)`,
          padding: "20px 30px",
        };

      case "blur":
        return {
          backdropFilter: "blur(10px)",
          backgroundColor: `${BACKGROUND_COLOR}${Math.round(BACKGROUND_OPACITY * 0.5 * 255).toString(16).padStart(2, "0")}`,
          padding: "10px 20px",
          borderRadius: 15,
        };

      case "none":
      default:
        return {};
    }
  };

  // Container positioning
  const containerStyle: React.CSSProperties = {
    justifyContent: "center",
    alignItems: "center",
    top: `${POSITION_Y}%`,
    transform: "translateY(-50%)",
    height: "auto",
    minHeight: 100,
    position: "absolute",
    width: "100%",
    left: 0,
    right: 0,
  };

  return (
    <AbsoluteFill style={containerStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          ...getBackgroundStyle(),
        }}
      >
        <div
          style={{
            fontSize,
            color: TEXT_COLOR,
            WebkitTextStroke: STROKE_WIDTH > 0 ? `${STROKE_WIDTH}px ${STROKE_COLOR}` : undefined,
            paintOrder: "stroke",
            transform: getTransform(),
            fontFamily: preset.fontFamily,
            textTransform: preset.textTransform,
            letterSpacing: preset.letterSpacing,
            textShadow: getTextShadow(),
            opacity: animationStyle === "fade" ? enterProgress : 1,
            textAlign: "center",
            lineHeight: 1.3,
            maxWidth: "90%",
          }}
        >
          {page.tokens.map((t, index) => {
            const startRelativeToSequence = t.fromMs - page.startMs;
            const endRelativeToSequence = t.toMs - page.startMs;

            const isActive =
              startRelativeToSequence <= timeInMs &&
              endRelativeToSequence > timeInMs;

            // Calculate progress within the word (0 to 1)
            const wordProgress = isActive
              ? interpolate(
                  timeInMs,
                  [startRelativeToSequence, endRelativeToSequence],
                  [0, 1],
                  { extrapolateRight: "clamp" }
                )
              : 0;

            // Active word gets slight scale boost for karaoke effect
            const wordScale = isActive
              ? interpolate(wordProgress, [0, 0.5, 1], [1, 1.08, 1])
              : 1;

            // Neon effect on active word
            const wordGlow = isActive && stylePreset === "neon" ? getNeonGlow() : undefined;

            return (
              <span
                key={`${t.fromMs}-${index}`}
                style={{
                  display: "inline",
                  whiteSpace: "pre",
                  color: isActive ? HIGHLIGHT_COLOR : TEXT_COLOR,
                  transform: `scale(${wordScale})`,
                  transition: "color 0.05s ease-out",
                  textShadow: wordGlow || getTextShadow(),
                  // Add slight brightness to active word
                  filter: isActive ? "brightness(1.2)" : undefined,
                }}
              >
                {t.text}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
