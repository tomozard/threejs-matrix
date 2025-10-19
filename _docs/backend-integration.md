---
description: Backend Integration Guide
---

# Backend Integration Guide

## Service Overview
- **Framework** FastAPI app at `src/voice_assistance_service/main.py`.
- **Base URL** `http://<backend-host>:8000` (adjust for deployment).
- **Routers** Mounted under `/ws`, `/chat`, `/tts`, `/health`.
- **CORS** Currently allows `http://localhost:3000`; update `main.py` for additional origins.

## Health Check
- **Endpoint** `GET /health` (`app/api/health.py`).
- **Purpose** Verify service availability before establishing WebSockets.
- **Sample Response**
```json
{
  "status": "healthy",
  "service": "voice-assistance"
}
```

## Chat Streaming API
- **WebSocket URL** `ws://<backend-host>:8000/chat/stream` (`app/api/chat.py`).
- **Client Messages**
  - `{ "type": "message", "text": "<user text>" }`
  - `{ "type": "ping" }` for heartbeat.
- **Server Responses**
  - `{ "type": "status", "message": "thinking" }`
  - `{ "type": "response", "text": "<ai reply>", "complete": true }`
  - `{ "type": "pong" }`, `{ "type": "error", "message": "<detail>" }`.
- **Frontend Tips** Maintain a single socket per session, handle disconnects, retry with backoff.

## Speech-to-Text (STT) Stream
- **WebSocket URL** `ws://<backend-host>:8000/ws/stt` (`app/api/stt.py`).
- **Lifecycle**
  1. Send `{ "type": "start" }`.
  2. Stream raw PCM16 audio chunks via `websocket.send_bytes()`.
  3. Send `{ "type": "stop" }` to trigger processing.
  4. Listen for transcription/emotion payloads.
- **Server Events**
  - Status updates: `recording_started`, `recording`, `processing`.
  - Result: `{ "type": "transcription", "text": "...", "emotion": "..." }`.
  - Errors and pings handled like other sockets.
- **Frontend Tips** Buffer mic input, throttle stop requests, close socket once results are received.

## Text-to-Speech (TTS) Stream
- **WebSocket URL** `ws://<backend-host>:8000/tts/stream` (`app/api/tts.py`).
- **Client Payload** `{ "type": "text", "text": "...", "emotion": "neutral" }`.
- **Server Responses**
  - `{ "type": "status", "message": "generating" }`.
  - Audio chunks: `{ "type": "audio_chunk", "data": "<hex>", "complete": false }`.
  - Completion marker: `{ "type": "audio_chunk", "complete": true }`.
  - Heartbeat and error payloads as above.
- **Frontend Tips** Convert hex to `Uint8Array`, buffer until `complete: true`, then play via `AudioContext`.

## Running the Backend
- **Command** `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- **Environment** Populate `.env` with credentials required by `TTSService`, `VoiceAgent`, etc.
- **Deployment** Expose port 8000 and ensure HTTPS termination when operating on public networks.

## Integration Checklist
- **Origin Access** Update CORS allowlist and/or proxy WebSockets through the frontend service.
- **Error Handling** Watch for `{ "type": "error" }` payloads and surface user-friendly messages.
- **Heartbeat** Send periodic pings to keep long-lived sockets alive if platform requires it.
- **Security** Add authentication headers or tokens before production roll-out and enable monitoring.
