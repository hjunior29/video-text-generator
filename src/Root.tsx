import { Composition } from "remotion";
import {
  CaptionedVideo,
  calculateCaptionedVideoMetadata,
  captionedVideoSchema,
} from "./CaptionedVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="CaptionedVideo"
      component={CaptionedVideo}
      calculateMetadata={calculateCaptionedVideoMetadata}
      schema={captionedVideoSchema}
      width={1080}
      height={1920}
      defaultProps={{
        src: "",
        captionsFile: "",
        highlightColor: "#39E508",
        fontSize: 120,
        captionPosition: 350,
        strokeWidth: 20,
        combineTokensMs: 1200,
      }}
    />
  );
};
