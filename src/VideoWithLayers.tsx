import React, { useCallback, useEffect, useState } from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  cancelRender,
  continueRender,
  delayRender,
  OffthreadVideo,
  Sequence,
  useVideoConfig,
  staticFile,
} from "remotion";
import { z } from "zod";
import { getVideoMetadata } from "@remotion/media-utils";
import { loadFont } from "./load-font";
import {
  LayersConfig,
  Layer,
  TextLayer as TextLayerType,
  CaptionLayer as CaptionLayerType,
  WordTimestamp,
} from "./types";
import TextLayer from "./TextLayer";
import CaptionLayer from "./CaptionLayer";

// Schema for props
export const videoWithLayersSchema = z.object({
  src: z.string(),
  captionsFile: z.string(),
  layersFile: z.string(),
});

// Calculate metadata
export const calculateVideoWithLayersMetadata: CalculateMetadataFunction<
  z.infer<typeof videoWithLayersSchema>
> = async ({ props }) => {
  const fps = 30;
  const metadata = await getVideoMetadata(props.src);

  return {
    fps,
    durationInFrames: Math.floor(metadata.durationInSeconds * fps),
  };
};

// Main component
export const VideoWithLayers: React.FC<{
  src: string;
  captionsFile: string;
  layersFile: string;
}> = ({ src, captionsFile, layersFile }) => {
  const [layers, setLayers] = useState<LayersConfig | null>(null);
  const [captions, setCaptions] = useState<WordTimestamp[]>([]);
  const [handle] = useState(() => delayRender());
  const { fps, durationInFrames } = useVideoConfig();

  // Load data files
  const loadData = useCallback(async () => {
    try {
      // Load font
      await loadFont();

      // Load layers config
      const layersRes = await fetch(staticFile(layersFile));
      const layersData = (await layersRes.json()) as LayersConfig;
      setLayers(layersData);

      // Load captions
      const captionsRes = await fetch(staticFile(captionsFile));
      const captionsData = (await captionsRes.json()) as WordTimestamp[];
      setCaptions(captionsData);

      continueRender(handle);
    } catch (e) {
      console.error("Error loading data:", e);
      cancelRender(e);
    }
  }, [handle, layersFile, captionsFile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Render layers
  const renderLayer = (layer: Layer, index: number) => {
    if (layer.type === "text") {
      const textLayer = layer as TextLayerType;
      const startFrame = Math.floor((textLayer.startMs / 1000) * fps);
      const endFrame = Math.floor((textLayer.endMs / 1000) * fps);
      const durationInFrames = endFrame - startFrame;

      if (durationInFrames <= 0) return null;

      return (
        <Sequence
          key={layer.id}
          from={startFrame}
          durationInFrames={durationInFrames}
          name={`Text: ${textLayer.content.substring(0, 20)}`}
        >
          <TextLayer
            layer={textLayer}
            startFrame={startFrame}
            endFrame={endFrame}
          />
        </Sequence>
      );
    }

    if (layer.type === "caption") {
      const captionLayer = layer as CaptionLayerType;

      // Caption layers span the entire video
      return (
        <Sequence
          key={layer.id}
          from={0}
          durationInFrames={durationInFrames}
          name="Captions"
        >
          <CaptionLayer layer={captionLayer} captions={captions} />
        </Sequence>
      );
    }

    return null;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* Video layer */}
      <AbsoluteFill>
        <OffthreadVideo
          style={{
            objectFit: "cover",
          }}
          src={src}
        />
      </AbsoluteFill>

      {/* Text and caption layers */}
      {layers?.layers.map((layer, index) => renderLayer(layer, index))}
    </AbsoluteFill>
  );
};

export default VideoWithLayers;
