import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { readFileSync } from "node:fs";

interface StyleConfig {
  highlightColor: string;
  fontSize: number;
  captionPosition: number;
  strokeWidth: number;
  combineTokensMs: number;
}

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace("--", "");
    const value = args[i + 1];
    result[key] = value;
  }

  return result;
};

// Convert local file path to file:// URL
const toFileUrl = (filePath: string): string => {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
  return `file://${absolutePath}`;
};

const main = async () => {
  const args = parseArgs();

  const inputVideo = args.input;
  const captionsFile = args.captions;
  const outputPath = args.output;
  const styleConfig: StyleConfig = args.style
    ? JSON.parse(args.style)
    : {
        highlightColor: "#39E508",
        fontSize: 120,
        captionPosition: 350,
        strokeWidth: 20,
        combineTokensMs: 1200,
      };

  if (!inputVideo || !captionsFile || !outputPath) {
    console.error(
      "Usage: bun run render --input <video> --captions <captions.json> --output <output.mp4> [--style <json>]"
    );
    process.exit(1);
  }

  // Convert paths to file:// URLs for Remotion
  const videoUrl = toFileUrl(inputVideo);
  const captionsUrl = toFileUrl(captionsFile);

  console.log("Bundling Remotion project...");
  const bundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), "src/index.ts"),
    onProgress: (progress) => {
      if (progress % 10 === 0) {
        console.log(`Bundling: ${progress}%`);
      }
    },
  });

  const inputProps = {
    src: videoUrl,
    captionsFile: captionsUrl,
    ...styleConfig,
  };

  console.log("Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "CaptionedVideo",
    inputProps,
  });

  console.log(`Rendering video (${composition.durationInFrames} frames)...`);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    onProgress: ({ progress }) => {
      const percent = Math.round(progress * 100);
      if (percent % 10 === 0) {
        console.log(`Rendering: ${percent}%`);
      }
    },
  });

  console.log(`Video rendered successfully to ${outputPath}`);
};

main().catch((err) => {
  console.error("Render failed:", err);
  process.exit(1);
});
