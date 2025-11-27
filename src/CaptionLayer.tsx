import React, { useMemo } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";
import { CaptionLayer as CaptionLayerType, WordTimestamp, STYLE_PRESETS } from "./types";
import {
  getEnterAnimation,
  combineAnimations,
} from "./animations";
import { TheBoldFont } from "./load-font";
import { fitText } from "@remotion/layout-utils";
import { createTikTokStyleCaptions, TikTokPage, Caption } from "@remotion/captions";

interface CaptionLayerProps {
  layer: CaptionLayerType;
  captions: WordTimestamp[];
}

// Time window for grouping words into pages
const CAPTION_WINDOW_MS = 1200;

export const CaptionLayer: React.FC<CaptionLayerProps> = ({
  layer,
  captions,
}) => {
  const { fps } = useVideoConfig();

  // Convert WordTimestamp to Caption format for @remotion/captions
  const formattedCaptions: Caption[] = useMemo(() => {
    return captions.map((word) => ({
      text: word.text,
      startMs: word.startMs,
      endMs: word.endMs,
      confidence: word.confidence,
      timestampMs: word.endMs,
    }));
  }, [captions]);

  // Create TikTok-style caption pages
  const { pages } = useMemo(() => {
    return createTikTokStyleCaptions({
      combineTokensWithinMilliseconds: CAPTION_WINDOW_MS,
      captions: formattedCaptions,
    });
  }, [formattedCaptions]);

  return (
    <AbsoluteFill>
      {pages.map((page, index) => {
        const nextPage = pages[index + 1] ?? null;
        const startFrame = Math.floor((page.startMs / 1000) * fps);
        const endFrame = Math.min(
          nextPage ? Math.floor((nextPage.startMs / 1000) * fps) : Infinity,
          startFrame + Math.ceil((CAPTION_WINDOW_MS / 1000) * fps)
        );
        const durationInFrames = endFrame - startFrame;

        if (durationInFrames <= 0) return null;

        return (
          <Sequence
            key={`caption-${index}`}
            from={startFrame}
            durationInFrames={durationInFrames}
          >
            <CaptionPage layer={layer} page={page} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// Individual caption page component
const CaptionPage: React.FC<{
  layer: CaptionLayerType;
  page: TikTokPage;
}> = ({ layer, page }) => {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const timeInMs = (frame / fps) * 1000;

  // Get preset styles
  const preset = layer.style.preset
    ? STYLE_PRESETS[layer.style.preset]
    : STYLE_PRESETS.tiktok;

  const mergedStyle = { ...preset, ...layer.style };

  // Animation
  const enterAnim = layer.animation?.enter
    ? getEnterAnimation(frame, fps, layer.animation.enter)
    : getEnterAnimation(frame, fps, { type: "bounceIn", duration: 300 });

  const animationStyle = combineAnimations(enterAnim);

  // Fit text
  const fittedText = fitText({
    fontFamily: mergedStyle.fontFamily || TheBoldFont,
    text: page.text,
    withinWidth: width * 0.9,
    textTransform: mergedStyle.textTransform || "uppercase",
  });

  const fontSize = Math.min(mergedStyle.fontSize || 48, fittedText.fontSize);

  // Colors
  const textColor = mergedStyle.color || "#FFFFFF";
  const highlightColor = mergedStyle.highlightColor || "#39E508";
  const strokeColor = mergedStyle.strokeColor || "#000000";
  const strokeWidth = mergedStyle.strokeWidth ?? 5;

  // Neon glow for neon preset
  const getNeonGlow = (color: string) => {
    if (mergedStyle.preset === "neon") {
      return `0 0 5px ${color}, 0 0 10px ${color}, 0 0 20px ${color}, 0 0 40px ${color}`;
    }
    return undefined;
  };

  // Text shadow
  const getTextShadow = () => {
    if (mergedStyle.preset === "neon") return undefined;
    return "2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.5)";
  };

  // Position styles
  const positionStyle: React.CSSProperties = {
    position: "absolute",
    left: `${layer.position.x}%`,
    top: `${layer.position.y}%`,
    transform: "translate(-50%, -50%)",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  return (
    <AbsoluteFill style={positionStyle}>
      <div
        style={{
          fontSize,
          fontFamily: mergedStyle.fontFamily || TheBoldFont,
          color: textColor,
          WebkitTextStroke:
            strokeWidth > 0 ? `${strokeWidth}px ${strokeColor}` : undefined,
          paintOrder: "stroke",
          textTransform: mergedStyle.textTransform || "uppercase",
          letterSpacing: mergedStyle.letterSpacing || 0,
          textShadow: getTextShadow(),
          textAlign: "center",
          lineHeight: 1.3,
          maxWidth: "90%",
          ...animationStyle,
        }}
      >
        {layer.karaoke ? (
          // Karaoke mode - highlight active word
          <span>
            {page.tokens.map((token, idx) => {
              const tokenStart = token.fromMs - page.startMs;
              const tokenEnd = token.toMs - page.startMs;
              const isActive = tokenStart <= timeInMs && tokenEnd > timeInMs;

              // Word progress for micro-animations
              const wordProgress = isActive
                ? Math.min(1, (timeInMs - tokenStart) / (tokenEnd - tokenStart))
                : 0;

              // Active word gets slight scale
              const wordScale = isActive ? 1 + wordProgress * 0.08 - wordProgress * 0.08 : 1;

              return (
                <span
                  key={`${token.fromMs}-${idx}`}
                  style={{
                    display: "inline",
                    whiteSpace: "pre",
                    color: isActive ? highlightColor : textColor,
                    transform: `scale(${wordScale})`,
                    textShadow: isActive ? getNeonGlow(highlightColor) : getTextShadow(),
                    filter: isActive ? "brightness(1.2)" : undefined,
                    transition: "color 0.05s ease-out",
                  }}
                >
                  {token.text}
                </span>
              );
            })}
          </span>
        ) : (
          // Non-karaoke mode - show all text
          page.text
        )}
      </div>
    </AbsoluteFill>
  );
};

export default CaptionLayer;
