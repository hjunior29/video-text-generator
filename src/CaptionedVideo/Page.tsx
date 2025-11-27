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

export const Page: React.FC<{
  readonly enterProgress: number;
  readonly page: TikTokPage;
}> = ({ enterProgress, page }) => {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const timeInMs = (frame / fps) * 1000;

  const inputProps = getInputProps();
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
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "8px",
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

          // Trim whitespace for display but keep original for spacing logic
          const displayText = t.text.trim();
          if (!displayText) return null;

          return (
            <span
              key={t.fromMs}
              style={{
                display: "inline-block",
                fontSize,
                fontFamily,
                textTransform: "uppercase",
                fontWeight: "bold",
                color: active ? "#000000" : "white",
                backgroundColor: active ? HIGHLIGHT_COLOR : "rgba(0, 0, 0, 0.7)",
                padding: "8px 16px",
                borderRadius: "8px",
                WebkitTextStroke: active ? "0px" : "2px black",
                paintOrder: "stroke",
              }}
            >
              {displayText}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
