import React from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Page } from "./Page";
import { TikTokPage } from "@remotion/captions";

interface SubtitlePageProps {
  readonly page: TikTokPage;
  readonly highlightColor: string;
  readonly fontSize: number;
  readonly captionPosition: number;
  readonly strokeWidth: number;
}

const SubtitlePage: React.FC<SubtitlePageProps> = ({
  page,
  highlightColor,
  fontSize,
  captionPosition,
  strokeWidth,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: {
      damping: 200,
    },
    durationInFrames: 5,
  });

  return (
    <AbsoluteFill>
      <Page
        enterProgress={enter}
        page={page}
        highlightColor={highlightColor}
        fontSize={fontSize}
        captionPosition={captionPosition}
        strokeWidth={strokeWidth}
      />
    </AbsoluteFill>
  );
};

export default SubtitlePage;
