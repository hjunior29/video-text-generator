"""
Video Text Generator for Replicate
Add text overlays, titles, captions with karaoke effect to videos
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

# Default layer configuration
DEFAULT_LAYER_STYLE = {
    "fontSize": 48,
    "fontFamily": "TheBoldFont",
    "color": "#FFFFFF",
    "strokeColor": "#000000",
    "strokeWidth": 3,
    "textTransform": "none",
    "letterSpacing": 0
}

DEFAULT_LAYER_POSITION = {
    "x": 50,
    "y": 50,
    "anchor": "center"
}

DEFAULT_ANIMATION = {
    "enter": {
        "type": "fadeIn",
        "duration": 300,
        "easing": "easeOut"
    },
    "exit": {
        "type": "fadeOut",
        "duration": 200,
        "easing": "easeIn"
    }
}


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
    """Bun install is now run at build time in cog.yaml, so this is a no-op"""
    pass


def apply_defaults(layer: dict) -> dict:
    """Apply default values to a layer configuration"""
    # Apply position defaults
    if "position" not in layer:
        layer["position"] = DEFAULT_LAYER_POSITION.copy()
    else:
        for key, value in DEFAULT_LAYER_POSITION.items():
            if key not in layer["position"]:
                layer["position"][key] = value

    # Apply style defaults
    if "style" not in layer:
        layer["style"] = DEFAULT_LAYER_STYLE.copy()
    else:
        for key, value in DEFAULT_LAYER_STYLE.items():
            if key not in layer["style"]:
                layer["style"][key] = value

    # Apply animation defaults
    if "animation" not in layer:
        layer["animation"] = DEFAULT_ANIMATION.copy()

    return layer


def validate_layers(layers_data: dict) -> dict:
    """Validate and normalize layers configuration"""
    if "layers" not in layers_data:
        raise ValueError("layers_json must contain a 'layers' array")

    validated_layers = []
    for i, layer in enumerate(layers_data["layers"]):
        # Required fields for text layers
        if layer.get("type") == "text":
            if "content" not in layer:
                raise ValueError(f"Layer {i}: 'text' type requires 'content' field")
            if "startMs" not in layer:
                layer["startMs"] = 0
            if "endMs" not in layer:
                raise ValueError(f"Layer {i}: 'text' type requires 'endMs' field")

        # Generate ID if not provided
        if "id" not in layer:
            layer["id"] = f"layer-{i}"

        # Apply defaults
        layer = apply_defaults(layer)
        validated_layers.append(layer)

    return {"layers": validated_layers}


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
        video: Path = Input(description="Video file to process"),

        # Layers JSON - the main configuration
        layers_json: str = Input(
            default="",
            description="""JSON configuration for text layers. Example:
{
  "layers": [
    {
      "type": "text",
      "content": "MY TITLE",
      "startMs": 0,
      "endMs": 3000,
      "position": {"x": 50, "y": 20},
      "style": {"fontSize": 64, "color": "#FFFFFF"},
      "animation": {"enter": {"type": "bounceIn", "duration": 500}}
    },
    {
      "type": "caption",
      "source": "whisper",
      "position": {"x": 50, "y": 85},
      "karaoke": true
    }
  ]
}
Leave empty to use simple mode with parameters below."""
        ),

        # Generate captions toggle
        generate_captions: bool = Input(
            default=True,
            description="Generate captions from audio using Whisper AI"
        ),

        # Simple mode parameters (used when layers_json is empty)
        caption_preset: str = Input(
            default="tiktok",
            choices=["tiktok", "capcut", "minimal", "bold", "neon", "gradient"],
            description="[Simple Mode] Caption style preset",
        ),
        caption_position: str = Input(
            default="bottom",
            choices=["top", "center", "bottom"],
            description="[Simple Mode] Caption vertical position",
        ),
        font_size: int = Input(
            default=48,
            ge=16,
            le=120,
            description="[Simple Mode] Font size for captions",
        ),
        highlight_color: str = Input(
            default="#39E508",
            description="[Simple Mode] Karaoke highlight color (hex)",
        ),
        text_color: str = Input(
            default="#FFFFFF",
            description="[Simple Mode] Base text color (hex)",
        ),
        animation_style: str = Input(
            default="bounce",
            choices=["bounce", "slide", "fade", "pop", "wave", "none"],
            description="[Simple Mode] Caption entrance animation",
        ),

        # Whisper settings
        language: str = Input(
            choices=["auto"]
            + sorted(LANGUAGES.keys())
            + sorted([k.title() for k in TO_LANGUAGE_CODE.keys()]),
            default="auto",
            description="Language spoken in the audio (for captions)",
        ),
    ) -> Path:
        """Add text overlays and captions to video"""

        # File identifier
        file_hash = hashlib.md5(str(video).encode('utf-8')).hexdigest()
        print(f"Processing video - Hash: {file_hash}")

        # Parse layers configuration
        if layers_json and layers_json.strip():
            try:
                layers_data = json.loads(layers_json)
                layers_data = validate_layers(layers_data)
                print(f"Using custom layers configuration: {len(layers_data['layers'])} layers")
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON in layers_json: {e}")
        else:
            # Simple mode - create default caption layer
            position_map = {"top": 15, "center": 50, "bottom": 85}
            layers_data = {
                "layers": [
                    {
                        "id": "captions",
                        "type": "caption",
                        "source": "whisper",
                        "position": {
                            "x": 50,
                            "y": position_map.get(caption_position, 85),
                            "anchor": "center"
                        },
                        "style": {
                            "fontSize": font_size,
                            "color": text_color,
                            "highlightColor": highlight_color,
                            "preset": caption_preset
                        },
                        "animation": {
                            "enter": {
                                "type": animation_style,
                                "duration": 300
                            }
                        },
                        "karaoke": True
                    }
                ]
            }
            print("Using simple mode with default caption layer")

        # Check if we need to generate captions
        has_caption_layer = any(
            layer.get("type") == "caption" and layer.get("source") == "whisper"
            for layer in layers_data["layers"]
        )

        whisper_results = []
        if generate_captions and has_caption_layer:
            print("Generating captions with Whisper...")
            whisper_results = self._run_whisper(video, language)
            print(f"Generated {len(whisper_results)} word timestamps")

        # Prepare files for Remotion
        os.makedirs("/src/public", exist_ok=True)

        # Save whisper results
        captions_file = f"/src/public/{file_hash}_captions.json"
        with open(captions_file, "w") as f:
            json.dump(whisper_results, f, indent=2)

        # Save layers configuration
        layers_file = f"/src/public/{file_hash}_layers.json"
        with open(layers_file, "w") as f:
            json.dump(layers_data, f, indent=2)

        # Copy video
        video_file = f"/src/public/{file_hash}.mp4"
        if not os.path.exists(str(video)):
            raise FileNotFoundError(f"Source video not found: {video}")
        shutil.copy2(str(video), video_file)

        # Build render props
        props = {
            "video": f"{file_hash}.mp4",
            "captionsFile": f"{file_hash}_captions.json",
            "layersFile": f"{file_hash}_layers.json",
        }

        # Render with Remotion
        render_command = f"/root/.bun/bin/bunx remotion render --concurrency='90%' --props='{json.dumps(props)}' VideoWithLayers out/{file_hash}_output.mp4"
        print(f"Running render command...")
        subprocess.run(['bash', '-c', render_command], check=True)

        # Cleanup
        os.remove(video_file)
        os.remove(captions_file)
        os.remove(layers_file)

        return Path(f"/src/out/{file_hash}_output.mp4")

    def _run_whisper(self, video: Path, language: str) -> list:
        """Run Whisper transcription and return word-level timestamps"""

        if "large-v3" != self.current_model:
            self.model = self.load_model("large-v3")
        else:
            self.model = self.models[self.current_model]

        normalized_language = language.lower() if language.lower() != "auto" else None
        if normalized_language and normalized_language not in LANGUAGES:
            normalized_language = TO_LANGUAGE_CODE.get(normalized_language, normalized_language)

        args = {
            "language": normalized_language,
            "suppress_tokens": "-1",
            "condition_on_previous_text": True,
            "compression_ratio_threshold": 2.4,
            "logprob_threshold": -1.0,
            "no_speech_threshold": 0.6,
            "fp16": True,
            "word_timestamps": True
        }

        print("Running Whisper inference...")
        start_event = torch.cuda.Event(enable_timing=True)
        end_event = torch.cuda.Event(enable_timing=True)
        start_event.record()

        with torch.inference_mode():
            result = self.model.transcribe(str(video), temperature=[0], **args)

        end_event.record()
        torch.cuda.synchronize()
        elapsed_time = start_event.elapsed_time(end_event)
        print(f"Whisper completed in {elapsed_time:.2f} ms")

        detected_language = LANGUAGES.get(result["language"], result["language"])
        print(f"Detected language: {detected_language}")

        return format_whisper_results(result)


def format_whisper_results(whisper_result: dict) -> list:
    """Format Whisper output to word-level timestamps"""
    formatted_results = []

    for segment in whisper_result.get('segments', []):
        for word in segment.get('words', []):
            formatted_word = {
                "text": word['word'],
                "startMs": int(word['start'] * 1000),
                "endMs": int(word['end'] * 1000),
                "confidence": round(word.get('probability', 1.0), 6)
            }
            formatted_results.append(formatted_word)

    return formatted_results


def get_audio_duration(file_path) -> float:
    """Get audio duration using ffprobe"""
    try:
        probe = ffmpeg.probe(file_path)
        audio_stream = next(
            (s for s in probe['streams'] if s['codec_type'] == 'audio'),
            None
        )
        if audio_stream and 'duration' in audio_stream:
            return float(audio_stream['duration'])
        return -1
    except ffmpeg.Error as e:
        print(f"Error reading audio: {e.stderr}")
        return -1
