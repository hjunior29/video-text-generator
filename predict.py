"""
Video Text Generator for Replicate
Generates beautiful TikTok/CapCut style captions with karaoke effect
"""

from typing import Optional
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
            bun_path = "/root/.bun/bin/bun"
            if not bun_path:
                raise FileNotFoundError("bun executable not found")
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
        self.current_model = "large-v3"
        self.load_model("large-v3")
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
        # Caption Style
        style_preset: str = Input(
            default="tiktok",
            choices=["tiktok", "capcut", "minimal", "bold", "neon", "gradient"],
            description="Caption style preset. Each preset has unique colors, fonts and animations.",
        ),
        font_size: int = Input(
            default=48,
            ge=16,
            le=120,
            description="Font size for captions (16-120)",
        ),
        highlight_color: str = Input(
            default="#39E508",
            description="Color for the active word in karaoke mode (hex color)",
        ),
        text_color: str = Input(
            default="#FFFFFF",
            description="Color for inactive words (hex color)",
        ),
        stroke_color: str = Input(
            default="#000000",
            description="Color for text outline/stroke (hex color)",
        ),
        stroke_width: int = Input(
            default=5,
            ge=0,
            le=15,
            description="Width of text outline (0 = no outline)",
        ),
        # Position
        position: str = Input(
            default="bottom",
            choices=["top", "center", "bottom", "custom"],
            description="Vertical position of captions",
        ),
        position_y: int = Input(
            default=85,
            ge=5,
            le=95,
            description="Custom Y position (% from top, only used when position='custom')",
        ),
        # Animation
        animation_style: str = Input(
            default="bounce",
            choices=["bounce", "slide", "fade", "pop", "wave", "none"],
            description="Animation style for caption entrance",
        ),
        words_per_line: int = Input(
            default=4,
            ge=1,
            le=10,
            description="Maximum words to show per caption line",
        ),
        # Background
        background_style: str = Input(
            default="none",
            choices=["none", "blur", "solid", "gradient"],
            description="Background style behind captions",
        ),
        background_color: str = Input(
            default="#000000",
            description="Background color (for solid/gradient, with opacity)",
        ),
        background_opacity: float = Input(
            default=0.6,
            ge=0.0,
            le=1.0,
            description="Background opacity (0-1)",
        ),
        # Whisper settings
        model: str = Input(
            choices=["large-v3"],
            default="large-v3",
            description="Whisper model size",
        ),
        language: str = Input(
            choices=["auto"]
            + sorted(LANGUAGES.keys())
            + sorted([k.title() for k in TO_LANGUAGE_CODE.keys()]),
            default="auto",
            description="Language spoken in the audio",
        ),
        temperature: float = Input(
            default=0,
            description="Temperature for sampling",
        ),
        condition_on_previous_text: bool = Input(
            default=True,
            description="Use previous output as context for next window",
        ),
    ) -> Path:
        """Generate beautiful karaoke-style captions for video"""
        print(f"Processing video with {model} model.")
        duration = get_audio_duration(video)
        print(f"Audio duration: {duration} sec")

        # File identifier
        hash = hashlib.md5(str(video).encode('utf-8')).hexdigest()
        print(f"Hash: {hash}")

        if model != self.current_model:
            self.model = self.load_model(model)
        else:
            self.model = self.models[self.current_model]

        temperature = [temperature]

        normalized_language = language.lower() if language.lower() != "auto" else None
        if normalized_language and normalized_language not in LANGUAGES:
            normalized_language = TO_LANGUAGE_CODE.get(normalized_language, normalized_language)

        args = {
            "language": normalized_language,
            "suppress_tokens": "-1",
            "condition_on_previous_text": condition_on_previous_text,
            "compression_ratio_threshold": 2.4,
            "logprob_threshold": -1.0,
            "no_speech_threshold": 0.6,
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

        # Save results to JSON
        output_file = f"/src/public/{hash}.json"
        with open(output_file, "w") as f:
            json.dump(formatted_results, f, indent=4)
        print(f"Results saved to {output_file}")

        # Copy video to public directory
        video_file = f"/src/public/{hash}.mp4"
        target_dir = os.path.dirname(video_file)

        if not os.path.exists(str(video)):
            raise FileNotFoundError(f"Source video not found: {video}")

        os.makedirs(target_dir, exist_ok=True)
        shutil.copy2(str(video), video_file)

        # Calculate position percentage
        position_map = {
            "top": 15,
            "center": 50,
            "bottom": 85,
            "custom": position_y
        }
        final_position_y = position_map.get(position, 85)

        # Build render props
        props = {
            "video": hash + ".mp4",
            # Style
            "stylePreset": style_preset,
            "fontSize": font_size,
            "highlightColor": highlight_color,
            "textColor": text_color,
            "strokeColor": stroke_color,
            "strokeWidth": stroke_width,
            # Position
            "positionY": final_position_y,
            # Animation
            "animationStyle": animation_style,
            "wordsPerLine": words_per_line,
            # Background
            "backgroundStyle": background_style,
            "backgroundColor": background_color,
            "backgroundOpacity": background_opacity,
        }

        render_command = f"/root/.bun/bin/bunx remotion render --concurrency='90%' --props='{json.dumps(props)}' CaptionedVideo out/{hash}_captioned.mp4"
        print(f"Running render command: {render_command}")
        subprocess.run(['bash', '-c', render_command], check=True)

        # Cleanup
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
