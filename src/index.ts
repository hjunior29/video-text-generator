// Entry file for Remotion
// npx remotion render <entry-file> CaptionedVideo out/video.mp4

import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
