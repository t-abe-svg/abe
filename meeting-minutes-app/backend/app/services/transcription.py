import os
from openai import AsyncOpenAI
from typing import Optional, Callable, Awaitable
from pydub import AudioSegment
import tempfile
import asyncio

from app.config import settings


class TranscriptionService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        # Whisper API has a 25MB limit per request
        self.max_chunk_size_mb = 24

    async def transcribe(
        self,
        file_path: str,
        progress_callback: Optional[Callable[[int, str], Awaitable[None]]] = None
    ) -> str:
        """
        Transcribe audio file to text using OpenAI Whisper API.
        Handles large files by splitting them into chunks.
        """
        if not settings.openai_api_key:
            raise ValueError("OpenAI API key is not configured")

        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)

        if progress_callback:
            await progress_callback(5, "音声ファイルを準備中...")

        # If file is small enough, transcribe directly
        if file_size_mb <= self.max_chunk_size_mb:
            return await self._transcribe_file(file_path, progress_callback)

        # For large files, split and transcribe in chunks
        return await self._transcribe_large_file(file_path, progress_callback)

    async def _transcribe_file(
        self,
        file_path: str,
        progress_callback: Optional[Callable[[int, str], Awaitable[None]]] = None
    ) -> str:
        """Transcribe a single audio file."""
        if progress_callback:
            await progress_callback(20, "文字起こし中...")

        with open(file_path, "rb") as audio_file:
            response = await self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="ja",
                response_format="verbose_json"
            )

        if progress_callback:
            await progress_callback(80, "文字起こし完了")

        # Format transcription with timestamps
        formatted_text = self._format_transcription(response)
        return formatted_text

    async def _transcribe_large_file(
        self,
        file_path: str,
        progress_callback: Optional[Callable[[int, str], Awaitable[None]]] = None
    ) -> str:
        """Split large audio file and transcribe in chunks."""
        if progress_callback:
            await progress_callback(10, "大きなファイルを分割中...")

        # Determine file format
        file_ext = os.path.splitext(file_path)[1].lower().replace(".", "")
        format_map = {
            "mp3": "mp3",
            "wav": "wav",
            "m4a": "mp4",
            "webm": "webm",
            "mp4": "mp4"
        }
        audio_format = format_map.get(file_ext, "mp3")

        # Load audio
        audio = AudioSegment.from_file(file_path, format=audio_format)

        # Calculate chunk duration (approximately 10 minutes per chunk)
        chunk_duration_ms = 10 * 60 * 1000  # 10 minutes in milliseconds
        chunks = []

        for i in range(0, len(audio), chunk_duration_ms):
            chunk = audio[i:i + chunk_duration_ms]
            chunks.append(chunk)

        if progress_callback:
            await progress_callback(15, f"合計{len(chunks)}個のチャンクに分割しました")

        # Transcribe each chunk
        transcriptions = []
        for idx, chunk in enumerate(chunks):
            progress = 15 + int((idx / len(chunks)) * 65)
            if progress_callback:
                await progress_callback(progress, f"チャンク {idx + 1}/{len(chunks)} を文字起こし中...")

            # Save chunk to temporary file
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp_file:
                chunk.export(tmp_file.name, format="mp3")
                tmp_path = tmp_file.name

            try:
                with open(tmp_path, "rb") as audio_file:
                    response = await self.client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        language="ja",
                        response_format="verbose_json"
                    )
                    transcriptions.append(self._format_transcription(response, offset_seconds=idx * 600))
            finally:
                os.unlink(tmp_path)

        if progress_callback:
            await progress_callback(80, "文字起こし完了")

        return "\n\n".join(transcriptions)

    def _format_transcription(self, response, offset_seconds: int = 0) -> str:
        """Format transcription with timestamps."""
        if hasattr(response, 'segments') and response.segments:
            formatted_lines = []
            for segment in response.segments:
                start_time = segment.get('start', 0) + offset_seconds
                text = segment.get('text', '').strip()
                if text:
                    timestamp = self._format_timestamp(start_time)
                    formatted_lines.append(f"[{timestamp}] {text}")
            return "\n".join(formatted_lines)
        else:
            return response.text if hasattr(response, 'text') else str(response)

    def _format_timestamp(self, seconds: float) -> str:
        """Format seconds to HH:MM:SS."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{secs:02d}"
        return f"{minutes:02d}:{secs:02d}"
