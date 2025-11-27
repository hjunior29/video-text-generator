import {
  Composition,
  continueRender,
  delayRender,
  staticFile,
  getInputProps,
} from "remotion";
import {
  VideoWithLayers,
  calculateVideoWithLayersMetadata,
  videoWithLayersSchema,
} from "./VideoWithLayers";
import { getVideoMetadata } from "@remotion/media-utils";
import React, { useEffect, useState } from "react";

export const RemotionRoot: React.FC = () => {
  const [handle] = useState(() => delayRender());
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const inputProps = getInputProps();

  // Get file paths from props
  const videoFile = staticFile(inputProps.video as string);
  const captionsFile = (inputProps.captionsFile as string) || "";
  const layersFile = (inputProps.layersFile as string) || "";

  useEffect(() => {
    getVideoMetadata(videoFile)
      .then(({ width, height }) => {
        setWidth(width);
        setHeight(height);
        continueRender(handle);
      })
      .catch((err) => {
        console.error(`Error fetching metadata: ${err}`);
        // Still continue render with default dimensions
        setWidth(1080);
        setHeight(1920);
        continueRender(handle);
      });
  }, [handle, videoFile]);

  return (
    <Composition
      id="VideoWithLayers"
      component={VideoWithLayers}
      calculateMetadata={calculateVideoWithLayersMetadata}
      schema={videoWithLayersSchema}
      width={width}
      height={height}
      defaultProps={{
        src: videoFile,
        captionsFile: captionsFile,
        layersFile: layersFile,
      }}
    />
  );
};
