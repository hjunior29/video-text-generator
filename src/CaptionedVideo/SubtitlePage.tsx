import React from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
  getInputProps,
  interpolate,
} from "remotion";
import { Page } from "./Page";
import { TikTokPage } from "@remotion/captions";

type AnimationStyle = "bounce" | "slide" | "fade" | "pop" | "wave" | "none";

const SubtitlePage: React.FC<{ readonly page: TikTokPage }> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inputProps = getInputProps();

  const animationStyle = (inputProps.animationStyle as AnimationStyle) || "bounce";

  // Different animation configs based on style
  const getEnterProgress = () => {
    switch (animationStyle) {
      case "bounce":
        return spring({
          frame,
          fps,
          config: {
            damping: 12,
            stiffness: 200,
            mass: 0.5,
          },
          durationInFrames: 8,
        });

      case "slide":
        return spring({
          frame,
          fps,
          config: {
            damping: 20,
            stiffness: 100,
          },
          durationInFrames: 10,
        });

      case "fade":
        return interpolate(frame, [0, 6], [0, 1], {
          extrapolateRight: "clamp",
        });

      case "pop":
        return spring({
          frame,
          fps,
          config: {
            damping: 8,
            stiffness: 400,
            mass: 0.3,
          },
          durationInFrames: 6,
        });

      case "wave":
        return spring({
          frame,
          fps,
          config: {
            damping: 15,
            stiffness: 150,
          },
          durationInFrames: 12,
        });

      case "none":
      default:
        return 1;
    }
  };

  const enter = getEnterProgress();

  return (
    <AbsoluteFill>
      <Page enterProgress={enter} page={page} animationStyle={animationStyle} />
    </AbsoluteFill>
  );
};

export default SubtitlePage;
