# server/whisper/whisper_server.py
# Self-hosted Whisper transcription server using faster-whisper + Flask
# Listens on localhost:5555 — NOT exposed to the internet

import os
import tempfile
import logging
from flask import Flask, request, jsonify
from faster_whisper import WhisperModel

# ─── Logging ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='[WhisperServer] %(asctime)s %(levelname)s %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# ─── Model Loading ────────────────────────────────────────────────────
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "medium")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")  # int8 ≈ 1.5GB RAM vs float16 ≈ 2.5GB
PORT = int(os.environ.get("WHISPER_PORT", 5555))

logger.info(f"Loading Whisper model '{MODEL_SIZE}' with compute_type='{COMPUTE_TYPE}'...")
logger.info("This may take 30-60 seconds on first run (downloading model)...")

model = WhisperModel(MODEL_SIZE, device="cpu", compute_type=COMPUTE_TYPE)
logger.info("✅ Model loaded and ready!")

# ─── Flask App ────────────────────────────────────────────────────────
app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "model": MODEL_SIZE, "compute_type": COMPUTE_TYPE})


@app.route("/transcribe", methods=["POST"])
def transcribe():
    """
    Receive an audio file and return the transcription.
    Expects: multipart/form-data with 'file' field containing the audio.
    Returns: { "text": "transcribed text", "language": "pt", "duration": 5.2 }
    """
    if "file" not in request.files:
        return jsonify({"error": "No 'file' field in request"}), 400

    audio_file = request.files["file"]

    if not audio_file.filename:
        return jsonify({"error": "Empty filename"}), 400

    # Save to a temp file, transcribe, then clean up
    tmp_path = None
    try:
        # Preserve extension for codec detection
        ext = os.path.splitext(audio_file.filename)[1] or ".ogg"
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp_path = tmp.name
            audio_file.save(tmp_path)

        logger.info(f"Transcribing '{audio_file.filename}' ({os.path.getsize(tmp_path)} bytes)...")

        segments, info = model.transcribe(
            tmp_path,
            language="pt",          # Force Portuguese for faster/more accurate results
            beam_size=5,
            vad_filter=True,        # Voice Activity Detection to skip silence
            vad_parameters=dict(
                min_silence_duration_ms=500
            )
        )

        # Concatenate all segments
        full_text = " ".join(segment.text.strip() for segment in segments)

        logger.info(f"✅ Transcription complete ({info.duration:.1f}s audio): \"{full_text[:100]}...\"")

        return jsonify({
            "text": full_text,
            "language": info.language,
            "duration": round(info.duration, 2)
        })

    except Exception as e:
        logger.error(f"❌ Transcription failed: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        # Clean up temp file
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


if __name__ == "__main__":
    logger.info(f"Starting Whisper server on port {PORT} (localhost only)...")
    app.run(host="127.0.0.1", port=PORT, debug=False)
