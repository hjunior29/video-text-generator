import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { TextLayer as TextLayerType, STYLE_PRESETS } from "./types";
import {
  getEnterAnimation,
  getExitAnimation,
  getLoopAnimation,
  combineAnimations,
} from "./animations";
import { TheBoldFont } from "./load-font";
import { fitText } from "@remotion/layout-utils";

interface TextLayerProps {
  layer: TextLayerType;
  startFrame: number;
  endFrame: number;
}

export const TextLayer: React.FC<TextLayerProps> = ({
  layer,
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Calculate local frame (relative to layer start)
  const localFrame = frame;
  const totalFrames = endFrame - startFrame;

  // Get preset styles if specified
  const preset = layer.style.preset
    ? STYLE_PRESETS[layer.style.preset]
    : null;

  // Merge styles with preset
  const mergedStyle = {
    ...preset,
    ...layer.style,
  };

  // Calculate animations
  const enterAnim = layer.animation?.enter
    ? getEnterAnimation(localFrame, fps, layer.animation.enter)
    : { opacity: 1, transform: "none" };

  const exitAnim = layer.animation?.exit
    ? getExitAnimation(localFrame, fps, totalFrames, layer.animation.exit)
    : { opacity: 1, transform: "none" };

  const loopAnim = layer.animation?.loop
    ? getLoopAnimation(localFrame, fps, layer.animation.loop)
    : { opacity: 1, transform: "none" };

  const animationStyle = combineAnimations(enterAnim, exitAnim, loopAnim);

  // Calculate position
  const positionStyle = getPositionStyle(layer.position, width, height);

  // Fit text to width
  const fittedText = fitText({
    fontFamily: mergedStyle.fontFamily || TheBoldFont,
    text: layer.content,
    withinWidth: width * 0.9,
    textTransform: mergedStyle.textTransform || "none",
  });

  const fontSize = Math.min(mergedStyle.fontSize || 48, fittedText.fontSize);

  // Build text shadow
  const textShadow = mergedStyle.shadow
    ? `${mergedStyle.shadow.offsetX}px ${mergedStyle.shadow.offsetY}px ${mergedStyle.shadow.blur}px ${mergedStyle.shadow.color}`
    : undefined;

  // Neon glow for neon preset
  const neonGlow =
    mergedStyle.preset === "neon"
      ? `0 0 10px ${mergedStyle.color}, 0 0 20px ${mergedStyle.color}, 0 0 40px ${mergedStyle.color}`
      : undefined;

  return (
    <AbsoluteFill
      style={{
        ...positionStyle,
        justifyContent: getJustifyContent(layer.position.anchor),
        alignItems: getAlignItems(layer.position.anchor),
      }}
    >
      <div
        style={{
          fontSize,
          fontFamily: mergedStyle.fontFamily || TheBoldFont,
          color: mergedStyle.color || "#FFFFFF",
          WebkitTextStroke:
            mergedStyle.strokeWidth && mergedStyle.strokeWidth > 0
              ? `${mergedStyle.strokeWidth}px ${mergedStyle.strokeColor || "#000000"}`
              : undefined,
          paintOrder: "stroke",
          textTransform: mergedStyle.textTransform || "none",
          letterSpacing: mergedStyle.letterSpacing || 0,
          textShadow: neonGlow || textShadow,
          textAlign: "center",
          lineHeight: 1.3,
          maxWidth: "90%",
          ...animationStyle,
        }}
      >
        {layer.content}
      </div>
    </AbsoluteFill>
  );
};

// Helper functions for positioning
function getPositionStyle(
  position: TextLayerType["position"],
  width: number,
  height: number
): React.CSSProperties {
  return {
    position: "absolute",
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: getAnchorTransform(position.anchor),
    width: "100%",
    display: "flex",
  };
}

function getAnchorTransform(
  anchor: TextLayerType["position"]["anchor"]
): string {
  const transforms: Record<string, string> = {
    topLeft: "translate(0, 0)",
    top: "translate(-50%, 0)",
    topRight: "translate(-100%, 0)",
    left: "translate(0, -50%)",
    center: "translate(-50%, -50%)",
    right: "translate(-100%, -50%)",
    bottomLeft: "translate(0, -100%)",
    bottom: "translate(-50%, -100%)",
    bottomRight: "translate(-100%, -100%)",
  };
  return transforms[anchor] || transforms.center;
}

function getJustifyContent(
  anchor: TextLayerType["position"]["anchor"]
): React.CSSProperties["justifyContent"] {
  if (anchor.includes("Left")) return "flex-start";
  if (anchor.includes("Right")) return "flex-end";
  return "center";
}

function getAlignItems(
  anchor: TextLayerType["position"]["anchor"]
): React.CSSProperties["alignItems"] {
  if (anchor.includes("top") || anchor === "topLeft" || anchor === "topRight")
    return "flex-start";
  if (
    anchor.includes("bottom") ||
    anchor === "bottomLeft" ||
    anchor === "bottomRight"
  )
    return "flex-end";
  return "center";
}

export default TextLayer;
