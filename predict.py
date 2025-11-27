from typing import Optional, Any
import os
import time
import subprocess
import torch
import numpy as np
import ffmpeg
import hashlib
import json
from pathlib import Path
import shutil

from cog import BasePredictor, Input, Path
from whisper.model import Whisper, ModelDimensions
from whisper.tokenizer import LANGUAGES, TO_LANGUAGE_CODE

MODEL_CACHE = "weights"
BASE_URL = f"https://weights.replicate.delivery/default/whisper-v3/{MODEL_CACHE}/"

# =============================================================================
# ADVANCED WHISPER SETTINGS (hardcoded - modify here if needed)
# =============================================================================
WHISPER_MODEL = "large-v3"  # Options: "large-v3", "large-v2", "large-v1", "medium", "small", "base", "tiny"
WHISPER_LANGUAGE = "auto"  # "auto" for auto-detection, or specific language code like "en", "pt", "es"
WHISPER_TEMPERATURE = 0  # Temperature for sampling
WHISPER_PATIENCE = None  # Patience value for beam decoding (None = default 1.0)
WHISPER_SUPPRESS_TOKENS = "-1"  # Token IDs to suppress ("-1" = most special chars)
WHISPER_INITIAL_PROMPT = None  # Optional prompt for first window
WHISPER_CONDITION_ON_PREVIOUS_TEXT = True  # Use previous output as prompt
WHISPER_TEMPERATURE_INCREMENT_ON_FALLBACK = 0.2  # Temperature increase on fallback
WHISPER_COMPRESSION_RATIO_THRESHOLD = 2.4  # Max compression ratio before failure
WHISPER_LOGPROB_THRESHOLD = -1.0  # Min log probability threshold
WHISPER_NO_SPEECH_THRESHOLD = 0.6  # No speech probability threshold



def download_weights(url: str, dest: str) -> None:
    start = time.time()
    print("[!] Initiating download from URL: ", url)
    print("[~] Destination path: ", dest)
    if ".tar" in dest:
        dest = os.path.dirname(dest)
    command = ["pget", "-vf" + ("x" if ".tar" in url else ""), url, dest]
    try:
        print(f"[~] Running command: {' '.join(command)}")
        subprocess.check_call(command, close_fds=False)
    except subprocess.CalledProcessError as e:
        print(
            f"[ERROR] Failed to download weights. Command '{' '.join(e.cmd)}' returned non-zero exit status {e.returncode}."
        )
        raise
    print("[+] Download completed in: ", time.time() - start, "seconds")

def run_bun_install():
    try:
        lockfile = Path("bun.lockb")
        if not lockfile.exists():
            # Use which to find bun executable
            bun_path = "/root/.bun/bin/bun"

            if not bun_path:
                raise FileNotFoundError("bun executable not found")

            # Run bun install with proper error handling
            subprocess.run([bun_path, "install"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running bun install: {e}")
    except FileNotFoundError as e:
        print(f"Error: {e}")

class Predictor(BasePredictor):
    def setup(self):
        """Load the large-v3 model"""
        self.model_cache = MODEL_CACHE
        self.models = {}
        self.current_model = WHISPER_MODEL
        self.load_model(WHISPER_MODEL)
        run_bun_install()

    def load_model(self, model_name):
        if model_name not in self.models:
            if not os.path.exists(self.model_cache):
                os.makedirs(self.model_cache)

            model_file = f"{model_name}.pt"
            url = BASE_URL + model_file
            dest_path = os.path.join(self.model_cache, model_file)

            if not os.path.exists(dest_path):
                download_weights(url, dest_path)

            with open(dest_path, "rb") as fp:
                checkpoint = torch.load(fp, map_location="cpu")
                dims = ModelDimensions(**checkpoint["dims"])
                model = Whisper(dims)
                model.load_state_dict(checkpoint["model_state_dict"])
                model.to("cuda")

            self.models[model_name] = model
        self.current_model = model_name
        return self.models[model_name]

    def predict(
        self,
        video: Path = Input(description="Video file to add captions to"),
        caption_style: str = Input(
            default="boxed",
            choices=["classic", "boxed"],
            description="Caption style: 'classic' (text with stroke) or 'boxed' (words with background boxes)",
        ),
        caption_size: int = Input(
            default=60,
            description="Font size for the captions",
        ),
        highlight_color: str = Input(
            default="#39E508",
            description="Color for the highlighted word (hex format)",
        ),
        text_overlays: str = Input(
            default="",
            description='''JSON array of text overlays. Example: [{"text": "TITLE", "startMs": 0, "endMs": 3000, "position": 300, "fontSize": 80, "color": "#FFFFFF"}]. Fields: text (required), startMs (required), endMs (required), position (distance from bottom in pixels, default: 300), fontSize (default: 60), color (default: "#FFFFFF"), backgroundColor (optional, e.g. "rgba(0,0,0,0.5)")''',
        ),
        caption_position: int = Input(
            default=150,
            description="Distance from the bottom of the video in pixels (150 = bottom, 300 = center, 500 = top)",
        ),
    ) -> Path:
        """Run a single prediction on the model"""
        print(f"Transcribe with {WHISPER_MODEL} model.")
        duration = get_audio_duration(video)
        print(f"Audio duration: {duration} sec")

        # file identifier
        hash = hashlib.md5(str(video).encode('utf-8')).hexdigest()
        print(f"Hash: {hash}")

        if WHISPER_MODEL != self.current_model:
            self.model = self.load_model(WHISPER_MODEL)
        else:
            self.model = self.models[self.current_model]

        # Temperature settings
        temperature = WHISPER_TEMPERATURE
        if WHISPER_TEMPERATURE_INCREMENT_ON_FALLBACK is not None:
            temperature = tuple(
                np.arange(temperature, 1.0 + 1e-6, WHISPER_TEMPERATURE_INCREMENT_ON_FALLBACK)
            )
        else:
            temperature = [temperature]

        # Language normalization
        normalized_language = WHISPER_LANGUAGE.lower() if WHISPER_LANGUAGE.lower() != "auto" else None
        if normalized_language and normalized_language not in LANGUAGES:
            normalized_language = TO_LANGUAGE_CODE.get(normalized_language, normalized_language)

        args = {
            "language": normalized_language,
            "patience": WHISPER_PATIENCE,
            "suppress_tokens": WHISPER_SUPPRESS_TOKENS,
            "initial_prompt": WHISPER_INITIAL_PROMPT,
            "condition_on_previous_text": WHISPER_CONDITION_ON_PREVIOUS_TEXT,
            "compression_ratio_threshold": WHISPER_COMPRESSION_RATIO_THRESHOLD,
            "logprob_threshold": WHISPER_LOGPROB_THRESHOLD,
            "no_speech_threshold": WHISPER_NO_SPEECH_THRESHOLD,
            "fp16": True,
            "word_timestamps": True
        }


        print("Running inference...")
        start_event = torch.cuda.Event(enable_timing=True)
        end_event = torch.cuda.Event(enable_timing=True)
        start_event.record()

        with torch.inference_mode():
            result = self.model.transcribe(str(video), temperature=temperature, **args)


        end_event.record()
        torch.cuda.synchronize()
        elapsed_time = start_event.elapsed_time(end_event)
        print(f"Inference completed in {elapsed_time:.2f} ms")

        detected_language_code = result["language"]
        detected_language_name = LANGUAGES.get(detected_language_code, detected_language_code)

        print(f"Detected language: {detected_language_name}")

        formatted_results = format_whisper_results(result)

        # save the results to a json file on the /src/public directory
        output_file = f"/src/public/{hash}.json"
        with open(output_file, "w") as f:
            json.dump(formatted_results, f, indent=4)

        print(f"Results saved to {output_file}")



        # copy the video file to the /src/public directory
        video_file = f"/src/public/{hash}.mp4"
        target_dir = os.path.dirname(video_file)

        # Ensure source exists
        if not os.path.exists(str(video)):
            raise FileNotFoundError(f"Source video not found: {video}")

        # Create target directory
        os.makedirs(target_dir, exist_ok=True)

        # Copy with error handling
        shutil.copy2(str(video), video_file)

        # Parse text overlays JSON
        parsed_overlays = []
        if text_overlays and text_overlays.strip():
            try:
                parsed_overlays = json.loads(text_overlays)
                print(f"Text overlays: {len(parsed_overlays)} items")
            except json.JSONDecodeError as e:
                print(f"Warning: Invalid text_overlays JSON: {e}")

        # run bun rendering command to render the video with the subtitles
        props = {
            "video": hash + ".mp4",
            "captionStyle": caption_style,
            "captionSize": caption_size,
            "highlightColor": highlight_color,
            "captionPosition": caption_position,
            "textOverlays": parsed_overlays,
        }

        render_command = f"/root/.bun/bin/bunx remotion render --concurrency='90%' --props='{json.dumps(props)}' CaptionedVideo out/{hash}_captioned.mp4"
        print(f"Running render command: {render_command}")
        subprocess.run(['bash', '-c', render_command], check=True)

        # cleanup
        os.remove(video_file)
        os.remove(output_file)

        return Path(f"/src/out/{hash}_captioned.mp4")


def format_whisper_results(whisper_result):
    formatted_results = []

    for segment in whisper_result['segments']:
        for word in segment['words']:
            formatted_word = {
                "text": word['word'],
                "startMs": int(word['start'] * 1000),
                "endMs": int(word['end'] * 1000),
                "timestampMs": int((word['end'] * 1000)),
                "confidence": round(word['probability'], 6)
            }

            formatted_results.append(formatted_word)

    return formatted_results

def get_audio_duration(file_path):
    try:
        probe = ffmpeg.probe(file_path)
        audio_stream = next((stream for stream in probe['streams'] if stream['codec_type'] == 'audio'), None)
        if audio_stream and 'duration' in audio_stream:
            duration = float(audio_stream['duration'])
            return np.round(duration)
        else:
            print("No audio stream found, cannot calculate duration")
            return -1
    except ffmpeg.Error as e:
        print(f"Error reading audio file: {e.stderr}")
        return -1
