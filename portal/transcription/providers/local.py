import asyncio
import logging
import threading
import numpy as np

from portal.transcription.providers.base import TranscriptionProvider, ProviderConfig

logger = logging.getLogger(__name__)

_loaded_models = {}
_model_lock = threading.Lock()

def get_model(model_size: str):
    with _model_lock:
        if model_size not in _loaded_models:
            logger.info(f"Loading faster-whisper model: {model_size}")
            from faster_whisper import WhisperModel
            _loaded_models[model_size] = WhisperModel(model_size, device="cpu", compute_type="int8")
        return _loaded_models[model_size]

class LocalProvider(TranscriptionProvider):
    async def process_chunk(self, chunk: bytes, language_code: str, model_variant: str, config: ProviderConfig) -> str:
        audio_data = np.frombuffer(chunk, np.int16).astype(np.float32) / 32768.0
        return await asyncio.to_thread(self._run_inference, audio_data, language_code, model_variant)
        
    def _run_inference(self, audio_data: np.ndarray, language_code: str, model_size: str) -> str:
        model = get_model(model_size)
        segments, _ = model.transcribe(audio_data, beam_size=5, vad_filter=True, language=language_code)
        text = " ".join(segment.text for segment in segments)
        return text.strip()
