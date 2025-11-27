import os
import subprocess
import json
import tempfile
import shutil
from pathlib import Path
from cog import BasePredictor, Input, Path as CogPath

class Predictor(BasePredictor):
    def setup(self):
        """Setup is called once when the model is loaded"""
        self.model_dir = Path("/src")
        self.whisper_models_installed = set()

    def _ensure_whisper(self, model: str):
        """Install whisper.cpp and download model on first use"""
        if model in self.whisper_models_installed:
            return

        print(f"Installing Whisper model: {model}...")
        subprocess.run(
            ["bun", "run", "install-whisper", model],
            cwd=str(self.model_dir),
            check=True
        )
        self.whisper_models_installed.add(model)

    def predict(
        self,
        video: CogPath = Input(description="Input video file"),
        whisper_model: str = Input(
            description="Whisper model to use for transcription",
            default="medium.en",
            choices=["tiny", "tiny.en", "base", "base.en", "small", "small.en", "medium", "medium.en", "large-v1", "large-v2", "large-v3"]
        ),
        language: str = Input(
            description="Language for transcription (use 'en' for English models)",
            default="en"
        ),
        highlight_color: str = Input(
            description="Color for highlighted words (hex format)",
            default="#39E508"
        ),
        font_size: int = Input(
            description="Font size for captions",
            default=120,
            ge=20,
            le=200
        ),
        caption_position: int = Input(
            description="Distance from bottom in pixels",
            default=350,
            ge=50,
            le=800
        ),
        stroke_width: int = Input(
            description="Text stroke width in pixels",
            default=20,
            ge=0,
            le=50
        ),
        combine_tokens_ms: int = Input(
            description="Time window to combine captions (milliseconds)",
            default=1200,
            ge=200,
            le=3000
        ),
    ) -> CogPath:
        """Generate TikTok-style captions for a video"""

        self._ensure_whisper(whisper_model)

        # Create temp directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Copy input video to temp folder
            input_video = temp_path / "input.mp4"
            shutil.copy(str(video), str(input_video))

            # Whisper config
            whisper_config = {
                "model": whisper_model,
                "language": language
            }

            # Run transcription
            print("Transcribing video...")
            subprocess.run(
                ["bun", "run", "transcribe", str(input_video), json.dumps(whisper_config)],
                cwd=str(self.model_dir),
                check=True
            )

            # Captions file is created next to the video
            captions_file = temp_path / "input.json"

            # Style config
            style_config = {
                "highlightColor": highlight_color,
                "fontSize": font_size,
                "captionPosition": caption_position,
                "strokeWidth": stroke_width,
                "combineTokensMs": combine_tokens_ms
            }

            # Run render
            output_path = temp_path / "output.mp4"
            print("Rendering video with captions...")
            subprocess.run(
                [
                    "bun", "run", "render",
                    "--input", str(input_video),
                    "--captions", str(captions_file),
                    "--output", str(output_path),
                    "--style", json.dumps(style_config)
                ],
                cwd=str(self.model_dir),
                check=True
            )

            # Copy output to cog output path
            final_output = Path("/tmp/output.mp4")
            shutil.copy(str(output_path), str(final_output))

            return CogPath(final_output)
