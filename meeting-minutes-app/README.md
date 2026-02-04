# 議事録メール自動生成アプリ

音声ファイルをアップロードするだけで、完璧な議事録メールを自動生成するWebアプリケーションです。

## 機能

- **音声アップロード**: MP3, WAV, M4A, WebM, MP4形式に対応（最大500MB）
- **音声文字起こし**: OpenAI Whisper APIによる高精度な日本語文字起こし
- **議事録自動生成**: Claude APIによるビジネスメール形式の議事録生成
- **メール作成支援**: 宛先設定、件名・本文編集、メールクライアント連携
- **履歴管理**: 過去の議事録の検索・編集・再生成・エクスポート
- **ダークモード対応**: ライト/ダークテーマの切り替え

## 技術スタック

### フロントエンド
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Dropzone
- Lucide Icons

### バックエンド
- Python FastAPI
- SQLAlchemy (async)
- SQLite / PostgreSQL
- OpenAI API (Whisper)
- Anthropic API (Claude)

### インフラ
- Docker
- Docker Compose

## セットアップ

### 前提条件

- Docker と Docker Compose がインストールされていること
- OpenAI API キー（Whisper用）
- Anthropic API キー（Claude用）

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd meeting-minutes-app
```

### 2. 環境変数を設定

```bash
cp .env.example .env
```

`.env` ファイルを編集して、APIキーを設定してください：

```env
# OpenAI API（Whisper用）
OPENAI_API_KEY=sk-your-openai-api-key

# Anthropic API（Claude用）
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key

# Database（デフォルトはSQLite）
DATABASE_URL=sqlite:///./meeting_minutes.db

# App Settings
MAX_FILE_SIZE_MB=500
SUPPORTED_FORMATS=mp3,wav,m4a,webm,mp4
```

### 3. Docker Composeで起動

```bash
docker-compose up --build
```

### 4. アプリケーションにアクセス

- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8000
- APIドキュメント: http://localhost:8000/docs

## 使い方

### 1. 音声ファイルをアップロード

- 「新規作成」タブで音声ファイルをドラッグ＆ドロップ
- 必要に応じて補助情報（会議名、日時、参加者など）を入力
- 「議事録を生成する」をクリック

### 2. 処理を待つ

- 音声の文字起こしと議事録生成が自動で行われます
- 進捗状況がリアルタイムで表示されます

### 3. 議事録を確認・編集

- 生成された議事録を確認
- 必要に応じて編集や再生成
- Markdown/テキスト形式でエクスポート可能

### 4. メールを送信

- 宛先（To/Cc/Bcc）を設定
- 件名・本文を確認・編集
- メールクライアントで開くか、クリップボードにコピー

## API エンドポイント

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| POST | `/api/meetings/upload` | 音声ファイルをアップロード |
| POST | `/api/meetings/{id}/process` | 処理を開始 |
| GET | `/api/meetings/{id}/progress` | 進捗を取得 |
| GET | `/api/meetings/{id}` | 議事録詳細を取得 |
| GET | `/api/meetings/` | 議事録一覧を取得 |
| PUT | `/api/meetings/{id}` | 議事録を更新 |
| DELETE | `/api/meetings/{id}` | 議事録を削除 |
| POST | `/api/meetings/{id}/regenerate` | 議事録を再生成 |
| POST | `/api/meetings/{id}/email` | メールURLを生成 |
| GET | `/api/meetings/{id}/export/{format}` | エクスポート (md/txt) |

## 開発

### ローカル開発（Docker不使用）

#### バックエンド

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### フロントエンド

```bash
cd frontend
npm install
npm run dev
```

### プロジェクト構造

```
meeting-minutes-app/
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   ├── components/    # Reactコンポーネント
│   │   ├── hooks/         # カスタムフック
│   │   ├── lib/           # ユーティリティ（API等）
│   │   └── types/         # TypeScript型定義
│   ├── package.json
│   └── Dockerfile
├── backend/
│   ├── app/
│   │   ├── api/           # APIルート
│   │   ├── services/      # ビジネスロジック
│   │   ├── models/        # データモデル
│   │   └── utils/         # ユーティリティ
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## 注意事項

- 音声ファイルのサイズが大きい場合、処理に時間がかかることがあります
- APIキーが未設定の場合、適切なエラーメッセージが表示されます
- 本番環境では、PostgreSQLの使用を推奨します

## ライセンス

MIT License
