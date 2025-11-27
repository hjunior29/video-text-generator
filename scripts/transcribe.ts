import { execSync } from "node:child_process";
import { existsSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import {
  downloadWhisperModel,
  installWhisperCpp,
  transcribe,
  toCaptions,
  type WhisperModel,
  type Language,
} from "@remotion/install-whisper-cpp";

const WHISPER_PATH = path.join(process.cwd(), "whisper.cpp");
const WHISPER_VERSION = "1.6.0";

interface TranscribeConfig {
  model: WhisperModel;
  language: Language;
}

const extractToTempAudioFile = (fileToTranscribe: string, tempOutFile: string) => {
  execSync(
    `npx remotion ffmpeg -i "${fileToTranscribe}" -ar 16000 "${tempOutFile}" -y`,
    { stdio: ["ignore", "inherit", "inherit"] }
  );
};

const processVideo = async (
  videoPath: string,
  config: TranscribeConfig
): Promise<string> => {
  // Ensure whisper is installed
  console.log("Ensuring Whisper.cpp is installed...");
  await installWhisperCpp({ to: WHISPER_PATH, version: WHISPER_VERSION });
  await downloadWhisperModel({ folder: WHISPER_PATH, model: config.model });

  // Create temp directory
  const tempDir = path.join(process.cwd(), "temp");
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const videoName = path.basename(videoPath, path.extname(videoPath));
  const tempWavFile = path.join(tempDir, `${videoName}.wav`);

  console.log(`Extracting audio from ${videoPath}...`);
  extractToTempAudioFile(videoPath, tempWavFile);

  console.log(`Transcribing with model ${config.model}...`);
  const whisperCppOutput = await transcribe({
    inputPath: tempWavFile,
    model: config.model,
    tokenLevelTimestamps: true,
    whisperPath: WHISPER_PATH,
    whisperCppVersion: WHISPER_VERSION,
    printOutput: false,
    translateToEnglish: false,
    language: config.language,
    splitOnWord: true,
  });

  const { captions } = toCaptions({ whisperCppOutput });

  // Output JSON file next to the video
  const outputPath = videoPath.replace(/\.[^.]+$/, ".json");
  writeFileSync(outputPath, JSON.stringify(captions, null, 2));

  // Cleanup temp files
  rmSync(tempDir, { recursive: true, force: true });

  console.log(`Captions saved to ${outputPath}`);
  return outputPath;
};

// Main execution
const [videoPath, configJson] = process.argv.slice(2);

if (!videoPath) {
  console.error("Usage: bun run transcribe <video-path> [config-json]");
  process.exit(1);
}

const config: TranscribeConfig = configJson
  ? JSON.parse(configJson)
  : { model: "medium.en", language: "en" };

await processVideo(videoPath, config);
