from anthropic import AsyncAnthropic
from typing import Optional, List, Callable, Awaitable
from datetime import datetime

from app.config import settings


class MinutesGenerator:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def generate(
        self,
        transcription: str,
        title: Optional[str] = None,
        meeting_date: Optional[datetime] = None,
        location: Optional[str] = None,
        participants: Optional[List[str]] = None,
        purpose: Optional[str] = None,
        progress_callback: Optional[Callable[[int, str], Awaitable[None]]] = None
    ) -> tuple[str, str]:
        """
        Generate meeting minutes from transcription.
        Returns (minutes_text, suggested_subject)
        """
        if not settings.anthropic_api_key:
            raise ValueError("Anthropic API key is not configured")

        if progress_callback:
            await progress_callback(85, "議事録を生成中...")

        # Build context for the prompt
        context_parts = []
        if title:
            context_parts.append(f"会議名: {title}")
        if meeting_date:
            date_str = meeting_date.strftime("%Y年%m月%d日")
            weekday = ["月", "火", "水", "木", "金", "土", "日"][meeting_date.weekday()]
            context_parts.append(f"日時: {date_str}（{weekday}）")
        if location:
            context_parts.append(f"場所/形式: {location}")
        if participants:
            context_parts.append(f"参加者: {', '.join(participants)}")
        if purpose:
            context_parts.append(f"会議の目的: {purpose}")

        context_str = "\n".join(context_parts) if context_parts else "（補助情報なし）"

        prompt = f"""以下の会議の文字起こしから、ビジネスメールとして送付できる形式の議事録を作成してください。

## 補助情報
{context_str}

## 文字起こし内容
{transcription}

## 出力形式
以下の形式で議事録を作成してください。不明な情報は「（確認中）」や「（音声から推定）」などと記載してください。

【件名】〇〇に関する打ち合わせ議事録

【日時】YYYY年MM月DD日（曜日）HH:MM〜HH:MM
【場所/形式】対面 / オンライン（Zoom等）
【参加者】（音声から推定、または上記の補助情報から）

【議題】
1. 〇〇について
2. 〇〇について

【議事内容】
■ 議題1：〇〇について
・〇〇という意見があった
・〇〇について議論した結果、〇〇となった

■ 議題2：〇〇について
・〇〇の報告があった
・〇〇の課題が挙がった

【決定事項】
1. 〇〇を実施する
2. 〇〇の方針で進める

【宿題・アクションアイテム】
| 担当者 | 内容 | 期限 |
|--------|------|------|
| 〇〇さん | 〇〇の資料作成 | MM/DD |
| 〇〇さん | 〇〇の確認 | MM/DD |

【次回予定】
・日時：YYYY年MM月DD日（曜日）HH:MM〜
・議題：〇〇について

【備考】
・〇〇

## 注意事項
- 会話の内容を正確に反映し、重要な決定事項や行動項目を漏らさないでください
- 参加者の名前や役職が分からない場合は「参加者A」「参加者B」などとしてください
- 専門用語はそのまま使用してください
- 日時が不明な場合は補助情報を参照するか、「（日時確認中）」としてください
- 議事録のみを出力し、説明文や前置きは不要です
"""

        response = await self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        if progress_callback:
            await progress_callback(95, "議事録生成完了")

        minutes_text = response.content[0].text

        # Extract subject from minutes
        subject = self._extract_subject(minutes_text)

        return minutes_text, subject

    def _extract_subject(self, minutes: str) -> str:
        """Extract subject line from generated minutes."""
        for line in minutes.split("\n"):
            if line.startswith("【件名】"):
                return line.replace("【件名】", "").strip()
        return "打ち合わせ議事録"

    async def regenerate_section(
        self,
        minutes: str,
        section: str,
        instruction: str
    ) -> str:
        """Regenerate a specific section of the minutes with new instructions."""
        prompt = f"""以下の議事録の「{section}」セクションを、指示に従って修正してください。

## 現在の議事録
{minutes}

## 修正指示
{instruction}

## 注意
- 指定されたセクションのみを修正し、他の部分はそのまま維持してください
- 修正後の完全な議事録を出力してください
"""

        response = await self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        return response.content[0].text
