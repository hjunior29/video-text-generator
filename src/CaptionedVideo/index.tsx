import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  cancelRender,
  OffthreadVideo,
  Sequence,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import SubtitlePage from "./SubtitlePage";
import { getVideoMetadata } from "@remotion/media-utils";
import { loadFont } from "../load-font";
import { Caption, createTikTokStyleCaptions } from "@remotion/captions";

export type SubtitleProp = {
  startInSeconds: number;
  text: string;
};

export const captionedVideoSchema = z.object({
  src: z.string(),
  captionsFile: z.string(),
  highlightColor: z.string().default("#39E508"),
  fontSize: z.number().default(120),
  captionPosition: z.number().default(350),
  strokeWidth: z.number().default(20),
  combineTokensMs: z.number().default(1200),
});

export type CaptionedVideoProps = z.infer<typeof captionedVideoSchema>;

export const calculateCaptionedVideoMetadata: CalculateMetadataFunction<
  CaptionedVideoProps
> = async ({ props }) => {
  const fps = 30;
  const metadata = await getVideoMetadata(props.src);

  return {
    fps,
    durationInFrames: Math.floor(metadata.durationInSeconds * fps),
  };
};

export const CaptionedVideo: React.FC<CaptionedVideoProps> = ({
  src,
  captionsFile,
  highlightColor,
  fontSize,
  captionPosition,
  strokeWidth,
  combineTokensMs,
}) => {
  const [subtitles, setSubtitles] = useState<Caption[]>([]);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender());
  const { fps } = useVideoConfig();

  const fetchSubtitles = useCallback(async () => {
    try {
      await loadFont();
      const res = await fetch(captionsFile);
      const data = (await res.json()) as Caption[];
      setSubtitles(data);
      continueRender(handle);
    } catch (e) {
      cancelRender(e);
    }
  }, [handle, captionsFile, continueRender]);

  useEffect(() => {
    fetchSubtitles();
  }, [fetchSubtitles]);

  const { pages } = useMemo(() => {
    return createTikTokStyleCaptions({
      combineTokensWithinMilliseconds: combineTokensMs,
      captions: subtitles ?? [],
    });
  }, [subtitles, combineTokensMs]);

  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <AbsoluteFill>
        <OffthreadVideo
          style={{
            objectFit: "cover",
          }}
          src={src}
        />
      </AbsoluteFill>
      {pages.map((page, index) => {
        const nextPage = pages[index + 1] ?? null;
        const subtitleStartFrame = (page.startMs / 1000) * fps;
        const subtitleEndFrame = Math.min(
          nextPage ? (nextPage.startMs / 1000) * fps : Infinity,
          subtitleStartFrame + combineTokensMs
        );
        const durationInFrames = subtitleEndFrame - subtitleStartFrame;
        if (durationInFrames <= 0) {
          return null;
        }

        return (
          <Sequence
            key={index}
            from={subtitleStartFrame}
            durationInFrames={durationInFrames}
          >
            <SubtitlePage
              page={page}
              highlightColor={highlightColor}
              fontSize={fontSize}
              captionPosition={captionPosition}
              strokeWidth={strokeWidth}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
