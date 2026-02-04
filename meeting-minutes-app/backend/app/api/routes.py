import os
import json
import asyncio
import aiofiles
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional, List
from datetime import datetime
import uuid

from app.models.database import Meeting, ProcessingStatusEnum, get_db
from app.models.schemas import (
    MeetingCreate,
    MeetingUpdate,
    MeetingResponse,
    MeetingListResponse,
    UploadResponse,
    ProcessingStatus,
    EmailData,
)
from app.services.transcription import TranscriptionService
from app.services.minutes_generator import MinutesGenerator
from app.config import settings

router = APIRouter()

# Store for SSE progress updates
progress_store: dict[int, dict] = {}

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def validate_file_format(filename: str) -> bool:
    """Check if file format is supported."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext in settings.supported_formats_list


def serialize_meeting(meeting: Meeting) -> dict:
    """Serialize meeting to response format."""
    participants = None
    if meeting.participants:
        try:
            participants = json.loads(meeting.participants)
        except json.JSONDecodeError:
            participants = []

    return {
        "id": meeting.id,
        "file_name": meeting.file_name,
        "file_size": meeting.file_size,
        "title": meeting.title,
        "meeting_date": meeting.meeting_date,
        "location": meeting.location,
        "participants": participants,
        "purpose": meeting.purpose,
        "status": meeting.status.value if meeting.status else ProcessingStatus.PENDING,
        "transcription": meeting.transcription,
        "minutes": meeting.minutes,
        "progress": meeting.progress or 0,
        "error_message": meeting.error_message,
        "created_at": meeting.created_at,
        "updated_at": meeting.updated_at,
    }


@router.post("/upload", response_model=UploadResponse)
async def upload_audio(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    meeting_date: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    participants: Optional[str] = Form(None),
    purpose: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """Upload audio file and create meeting record."""
    # Validate file format
    if not validate_file_format(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Supported formats: {', '.join(settings.supported_formats_list)}"
        )

    # Check file size
    file_content = await file.read()
    file_size = len(file_content)

    if file_size > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum allowed ({settings.max_file_size_mb}MB)"
        )

    # Generate unique filename
    ext = file.filename.rsplit(".", 1)[-1].lower()
    unique_filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save file
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(file_content)

    # Parse meeting_date if provided
    parsed_date = None
    if meeting_date:
        try:
            parsed_date = datetime.fromisoformat(meeting_date.replace("Z", "+00:00"))
        except ValueError:
            pass

    # Parse participants if provided
    participants_json = None
    if participants:
        try:
            participants_list = json.loads(participants)
            participants_json = json.dumps(participants_list)
        except json.JSONDecodeError:
            participants_json = json.dumps([p.strip() for p in participants.split(",")])

    # Create meeting record
    meeting = Meeting(
        file_name=file.filename,
        file_path=file_path,
        file_size=file_size,
        title=title,
        meeting_date=parsed_date,
        location=location,
        participants=participants_json,
        purpose=purpose,
        status=ProcessingStatusEnum.PENDING,
        progress=0,
    )

    db.add(meeting)
    await db.commit()
    await db.refresh(meeting)

    return UploadResponse(
        id=meeting.id,
        file_name=meeting.file_name,
        file_size=meeting.file_size,
        message="File uploaded successfully"
    )


@router.post("/{meeting_id}/process")
async def process_meeting(
    meeting_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Start processing meeting (transcription + minutes generation)."""
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if meeting.status == ProcessingStatusEnum.COMPLETED:
        return {"message": "Meeting already processed", "id": meeting_id}

    # Initialize progress store
    progress_store[meeting_id] = {"progress": 0, "status": "pending", "message": "処理を開始..."}

    # Start background processing
    background_tasks.add_task(process_meeting_task, meeting_id)

    return {"message": "Processing started", "id": meeting_id}


async def process_meeting_task(meeting_id: int):
    """Background task to process meeting."""
    async with get_db_session() as db:
        try:
            result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
            meeting = result.scalar_one_or_none()

            if not meeting:
                return

            async def update_progress(progress: int, message: str):
                meeting.progress = progress
                meeting.status = ProcessingStatusEnum.TRANSCRIBING if progress < 80 else ProcessingStatusEnum.GENERATING
                await db.commit()
                progress_store[meeting_id] = {
                    "progress": progress,
                    "status": meeting.status.value,
                    "message": message
                }

            # Update status to transcribing
            meeting.status = ProcessingStatusEnum.TRANSCRIBING
            await db.commit()

            # Transcribe
            transcription_service = TranscriptionService()
            transcription = await transcription_service.transcribe(
                meeting.file_path,
                progress_callback=update_progress
            )
            meeting.transcription = transcription
            await db.commit()

            # Generate minutes
            await update_progress(85, "議事録を生成中...")
            meeting.status = ProcessingStatusEnum.GENERATING
            await db.commit()

            # Parse participants
            participants = None
            if meeting.participants:
                try:
                    participants = json.loads(meeting.participants)
                except json.JSONDecodeError:
                    participants = None

            minutes_generator = MinutesGenerator()
            minutes, subject = await minutes_generator.generate(
                transcription=transcription,
                title=meeting.title,
                meeting_date=meeting.meeting_date,
                location=meeting.location,
                participants=participants,
                purpose=meeting.purpose,
                progress_callback=update_progress
            )

            # Update meeting with results
            meeting.minutes = minutes
            if not meeting.title:
                meeting.title = subject
            meeting.status = ProcessingStatusEnum.COMPLETED
            meeting.progress = 100
            await db.commit()

            progress_store[meeting_id] = {
                "progress": 100,
                "status": "completed",
                "message": "処理が完了しました"
            }

        except Exception as e:
            meeting.status = ProcessingStatusEnum.ERROR
            meeting.error_message = str(e)
            await db.commit()
            progress_store[meeting_id] = {
                "progress": 0,
                "status": "error",
                "message": str(e)
            }


async def get_db_session():
    """Get database session for background tasks."""
    from app.models.database import async_session

    class DBSession:
        def __init__(self):
            self.session = None

        async def __aenter__(self):
            self.session = async_session()
            return self.session

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            if self.session:
                await self.session.close()

    return DBSession()


@router.get("/{meeting_id}/progress")
async def get_progress(meeting_id: int):
    """Get processing progress for a meeting."""
    if meeting_id in progress_store:
        return progress_store[meeting_id]
    return {"progress": 0, "status": "pending", "message": "処理待ち..."}


@router.get("/{meeting_id}/progress/stream")
async def stream_progress(meeting_id: int):
    """Stream processing progress via SSE."""
    async def event_generator():
        last_progress = -1
        while True:
            if meeting_id in progress_store:
                current = progress_store[meeting_id]
                if current["progress"] != last_progress:
                    last_progress = current["progress"]
                    yield f"data: {json.dumps(current)}\n\n"

                if current["status"] in ["completed", "error"]:
                    break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(meeting_id: int, db: AsyncSession = Depends(get_db)):
    """Get meeting details."""
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    return serialize_meeting(meeting)


@router.get("/", response_model=MeetingListResponse)
async def list_meetings(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all meetings with pagination."""
    query = select(Meeting).order_by(desc(Meeting.created_at))

    if search:
        query = query.where(
            Meeting.title.ilike(f"%{search}%") |
            Meeting.minutes.ilike(f"%{search}%")
        )

    # Get total count
    count_result = await db.execute(select(Meeting.id))
    total = len(count_result.all())

    # Get paginated results
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    meetings = result.scalars().all()

    return MeetingListResponse(
        meetings=[serialize_meeting(m) for m in meetings],
        total=total
    )


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: int,
    update_data: MeetingUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update meeting details."""
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    update_dict = update_data.model_dump(exclude_unset=True)

    if "participants" in update_dict and update_dict["participants"] is not None:
        update_dict["participants"] = json.dumps(update_dict["participants"])

    for key, value in update_dict.items():
        setattr(meeting, key, value)

    await db.commit()
    await db.refresh(meeting)

    return serialize_meeting(meeting)


@router.delete("/{meeting_id}")
async def delete_meeting(meeting_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a meeting."""
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Delete file
    if os.path.exists(meeting.file_path):
        os.remove(meeting.file_path)

    await db.delete(meeting)
    await db.commit()

    return {"message": "Meeting deleted successfully"}


@router.post("/{meeting_id}/regenerate")
async def regenerate_minutes(
    meeting_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Regenerate minutes for a meeting."""
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not meeting.transcription:
        raise HTTPException(status_code=400, detail="No transcription available")

    # Reset status
    meeting.status = ProcessingStatusEnum.GENERATING
    meeting.progress = 85
    await db.commit()

    progress_store[meeting_id] = {
        "progress": 85,
        "status": "generating",
        "message": "議事録を再生成中..."
    }

    background_tasks.add_task(regenerate_minutes_task, meeting_id)

    return {"message": "Regeneration started", "id": meeting_id}


async def regenerate_minutes_task(meeting_id: int):
    """Background task to regenerate minutes."""
    async with get_db_session() as db:
        try:
            result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
            meeting = result.scalar_one_or_none()

            if not meeting:
                return

            participants = None
            if meeting.participants:
                try:
                    participants = json.loads(meeting.participants)
                except json.JSONDecodeError:
                    participants = None

            minutes_generator = MinutesGenerator()
            minutes, subject = await minutes_generator.generate(
                transcription=meeting.transcription,
                title=meeting.title,
                meeting_date=meeting.meeting_date,
                location=meeting.location,
                participants=participants,
                purpose=meeting.purpose,
            )

            meeting.minutes = minutes
            meeting.status = ProcessingStatusEnum.COMPLETED
            meeting.progress = 100
            await db.commit()

            progress_store[meeting_id] = {
                "progress": 100,
                "status": "completed",
                "message": "議事録を再生成しました"
            }

        except Exception as e:
            meeting.status = ProcessingStatusEnum.ERROR
            meeting.error_message = str(e)
            await db.commit()
            progress_store[meeting_id] = {
                "progress": 0,
                "status": "error",
                "message": str(e)
            }


@router.post("/{meeting_id}/email")
async def generate_email(meeting_id: int, email_data: EmailData, db: AsyncSession = Depends(get_db)):
    """Generate mailto link for the meeting minutes."""
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not meeting.minutes:
        raise HTTPException(status_code=400, detail="No minutes available")

    import urllib.parse

    # Build mailto URL
    params = []

    if email_data.cc:
        params.append(f"cc={','.join(email_data.cc)}")
    if email_data.bcc:
        params.append(f"bcc={','.join(email_data.bcc)}")

    params.append(f"subject={urllib.parse.quote(email_data.subject)}")
    params.append(f"body={urllib.parse.quote(email_data.body)}")

    to_addresses = ",".join(email_data.to) if email_data.to else ""
    mailto_url = f"mailto:{to_addresses}?{'&'.join(params)}"

    return {
        "mailto_url": mailto_url,
        "subject": email_data.subject,
        "body": email_data.body
    }


@router.get("/{meeting_id}/export/{format}")
async def export_meeting(
    meeting_id: int,
    format: str,
    db: AsyncSession = Depends(get_db)
):
    """Export meeting minutes in specified format (md, txt)."""
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not meeting.minutes:
        raise HTTPException(status_code=400, detail="No minutes available")

    if format not in ["md", "txt"]:
        raise HTTPException(status_code=400, detail="Unsupported format. Use 'md' or 'txt'")

    content = meeting.minutes
    filename = f"{meeting.title or 'meeting_minutes'}_{meeting.id}.{format}"

    content_type = "text/markdown" if format == "md" else "text/plain"

    return StreamingResponse(
        iter([content]),
        media_type=content_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
