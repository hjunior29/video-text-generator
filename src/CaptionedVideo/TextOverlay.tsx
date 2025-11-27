import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TheBoldFont } from "../load-font";

export interface TextOverlayItem {
  text: string;
  startMs: number;
  endMs: number;
  position?: "top" | "center" | "bottom";
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  fontFamily?: string;
}

interface TextOverlayProps {
  overlay: TextOverlayItem;
}

export const TextOverlay: React.FC<TextOverlayProps> = ({ overlay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const {
    text,
    startMs,
    endMs,
    position = "center",
    fontSize = 60,
    color = "#FFFFFF",
    backgroundColor,
    fontFamily = TheBoldFont,
  } = overlay;

  const startFrame = (startMs / 1000) * fps;
  const endFrame = (endMs / 1000) * fps;
  const durationFrames = endFrame - startFrame;

  // Check if we should render this overlay
  if (frame < startFrame || frame >= endFrame) {
    return null;
  }

  const relativeFrame = frame - startFrame;

  // Entrance animation (spring in)
  const enterProgress = spring({
    frame: relativeFrame,
    fps,
    config: {
      damping: 200,
    },
    durationInFrames: 10,
  });

  // Exit animation (fade out in last 10 frames)
  const exitFrames = 10;
  const exitProgress =
    relativeFrame > durationFrames - exitFrames
      ? interpolate(
          relativeFrame,
          [durationFrames - exitFrames, durationFrames],
          [1, 0],
          { extrapolateRight: "clamp" }
        )
      : 1;

  // Position styles
  const positionStyles: React.CSSProperties = {
    top: position === "top" ? "10%" : position === "center" ? "50%" : undefined,
    bottom: position === "bottom" ? "20%" : undefined,
    transform:
      position === "center"
        ? `translateY(-50%) scale(${interpolate(enterProgress, [0, 1], [0.8, 1])})`
        : `scale(${interpolate(enterProgress, [0, 1], [0.8, 1])})`,
  };

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        ...positionStyles,
        opacity: enterProgress * exitProgress,
      }}
    >
      <div
        style={{
          fontSize,
          fontFamily,
          color,
          backgroundColor,
          padding: backgroundColor ? "16px 32px" : undefined,
          borderRadius: backgroundColor ? "12px" : undefined,
          textAlign: "center",
          textTransform: "uppercase",
          fontWeight: "bold",
          WebkitTextStroke: backgroundColor ? undefined : "3px black",
          paintOrder: "stroke",
          maxWidth: "90%",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
