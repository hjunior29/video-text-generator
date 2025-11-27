import path from "node:path";
import {
  downloadWhisperModel,
  installWhisperCpp,
  type WhisperModel,
} from "@remotion/install-whisper-cpp";

const WHISPER_PATH = path.join(process.cwd(), "whisper.cpp");
const WHISPER_VERSION = "1.6.0";

// Get model from args or default to medium.en
const model = (process.argv[2] || "medium.en") as WhisperModel;

console.log(`Installing Whisper.cpp version ${WHISPER_VERSION}...`);
await installWhisperCpp({ to: WHISPER_PATH, version: WHISPER_VERSION });

console.log(`Downloading Whisper model: ${model}...`);
await downloadWhisperModel({ folder: WHISPER_PATH, model });

console.log("Whisper installation complete!");
