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
import { makeTransform, scale, translateY } from "@remotion/animation-utils";
import { TikTokPage } from "@remotion/captions";

const fontFamily = TheBoldFont;

// =============================================================================
// CLASSIC STYLE - Simple text with stroke, highlight changes color
// =============================================================================
const ClassicStyle: React.FC<{
  page: TikTokPage;
  timeInMs: number;
  fontSize: number;
  highlightColor: string;
  enterProgress: number;
}> = ({ page, timeInMs, fontSize, highlightColor, enterProgress }) => {
  return (
    <div
      style={{
        fontSize,
        color: "white",
        WebkitTextStroke: "5px black",
        paintOrder: "stroke",
        transform: makeTransform([
          scale(interpolate(enterProgress, [0, 1], [0.8, 1])),
          translateY(interpolate(enterProgress, [0, 1], [50, 0])),
        ]),
        fontFamily,
        textTransform: "uppercase",
      }}
    >
      <span>
        {page.tokens.map((t) => {
          const startRelativeToSequence = t.fromMs - page.startMs;
          const endRelativeToSequence = t.toMs - page.startMs;

          const active =
            startRelativeToSequence <= timeInMs &&
            endRelativeToSequence > timeInMs;

          return (
            <span
              key={t.fromMs}
              style={{
                display: "inline",
                whiteSpace: "pre",
                color: active ? highlightColor : "white",
              }}
            >
              {t.text}
            </span>
          );
        })}
      </span>
    </div>
  );
};

// =============================================================================
// BOXED STYLE - Words with background boxes (like TikTok/Instagram)
// Only the active word has a background box
// =============================================================================
const BoxedStyle: React.FC<{
  page: TikTokPage;
  timeInMs: number;
  fontSize: number;
  highlightColor: string;
  enterProgress: number;
}> = ({ page, timeInMs, fontSize, highlightColor, enterProgress }) => {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: "12px",
        transform: makeTransform([
          scale(interpolate(enterProgress, [0, 1], [0.8, 1])),
          translateY(interpolate(enterProgress, [0, 1], [50, 0])),
        ]),
      }}
    >
      {page.tokens.map((t) => {
        const startRelativeToSequence = t.fromMs - page.startMs;
        const endRelativeToSequence = t.toMs - page.startMs;

        const active =
          startRelativeToSequence <= timeInMs &&
          endRelativeToSequence > timeInMs;

        const displayText = t.text.trim();
        if (!displayText) return null;

        return (
          <span
            key={t.fromMs}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize,
              fontFamily,
              textTransform: "uppercase",
              fontWeight: "bold",
              lineHeight: 1.1,
              // Active word: colored background, black text
              // Inactive word: no background, white text with stroke
              color: active ? "#000000" : "white",
              backgroundColor: active ? highlightColor : "transparent",
              padding: active ? "8px 16px 12px 16px" : "0",
              borderRadius: active ? "8px" : "0",
              WebkitTextStroke: active ? "0px" : "4px black",
              paintOrder: "stroke",
            }}
          >
            {displayText}
          </span>
        );
      })}
    </div>
  );
};

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================
export const Page: React.FC<{
  readonly enterProgress: number;
  readonly page: TikTokPage;
}> = ({ enterProgress, page }) => {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const timeInMs = (frame / fps) * 1000;

  const inputProps = getInputProps();
  const CAPTION_STYLE = (inputProps.captionStyle as string) || "boxed";
  const DESIRED_FONT_SIZE = inputProps.captionSize as number;
  const HIGHLIGHT_COLOR = inputProps.highlightColor as string;
  const CAPTION_POSITION = (inputProps.captionPosition as number) || 150;

  const container: React.CSSProperties = {
    justifyContent: "center",
    alignItems: "center",
    top: undefined,
    bottom: CAPTION_POSITION,
    height: "auto",
    padding: "20px",
  };

  const fittedText = fitText({
    fontFamily,
    text: page.text,
    withinWidth: width * 0.9,
    textTransform: "uppercase",
  });

  const fontSize = Math.min(DESIRED_FONT_SIZE, fittedText.fontSize);

  return (
    <AbsoluteFill style={container}>
      {CAPTION_STYLE === "classic" ? (
        <ClassicStyle
          page={page}
          timeInMs={timeInMs}
          fontSize={fontSize}
          highlightColor={HIGHLIGHT_COLOR}
          enterProgress={enterProgress}
        />
      ) : (
        <BoxedStyle
          page={page}
          timeInMs={timeInMs}
          fontSize={fontSize}
          highlightColor={HIGHLIGHT_COLOR}
          enterProgress={enterProgress}
        />
      )}
    </AbsoluteFill>
  );
};
