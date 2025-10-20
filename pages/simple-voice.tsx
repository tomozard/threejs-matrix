// Simple Voice Test - Push-to-Talk Only

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export default function SimpleVoiceTest() {
  const [isRecording, setIsRecording] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [transcription, setTranscription] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // Start recording
  const startRecording = useCallback(async () => {
    if (isRecording) return

    try {
      console.log('🎤 Starting simple recording...')

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      streamRef.current = stream
      audioChunksRef.current = []

      // Create MediaRecorder with fallback formats
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '' // Use default
          }
        }
      }

      console.log('🎵 Using MIME type:', mimeType)

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
          console.log('📦 Audio chunk:', event.data.size, 'bytes')
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' })
        setRecordedAudio(audioBlob)

        // Create URL for audio player
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)

        console.log('📼 Recording complete:', audioBlob.size, 'bytes', 'type:', mimeType)
        console.log('🔗 Audio URL created:', url)

        // Send to STT service
        sendToSTT(audioBlob)
      }

      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      console.log('✅ Recording started')

    } catch (error) {
      console.error('❌ Failed to start recording:', error)
    }
  }, [isRecording])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return

    console.log('🛑 Stopping simple recording...')
    mediaRecorderRef.current.stop()

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    setIsRecording(false)
    console.log('✅ Recording stopped')
  }, [isRecording])

  // Send audio to STT service
  const sendToSTT = async (audioBlob: Blob) => {
    try {
      console.log('📤 Sending audio to STT service...')

      // Convert to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer()

      // Create WebSocket connection to STT
      const ws = new WebSocket('ws://localhost:8000/ws/stt')

      ws.onopen = () => {
        console.log('🔗 STT WebSocket connected')

        // Send start message
        ws.send(JSON.stringify({
          type: 'start',
          config: {
            sampleRate: 16000,
            channels: 1,
            format: 'webm'
          }
        }))

        // Send audio data
        ws.send(arrayBuffer)

        // Send stop message
        ws.send(JSON.stringify({ type: 'stop' }))
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('📨 STT Response:', data)

        if (data.type === 'transcription' && data.text) {
          setTranscription(data.text)
          console.log('📝 Transcription:', data.text)
        }
      }

      ws.onerror = (error) => {
        console.error('❌ STT WebSocket error:', error)
      }

      ws.onclose = () => {
        console.log('🔗 STT WebSocket closed')
      }

    } catch (error) {
      console.error('❌ Failed to send to STT:', error)
    }
  }

  // Keyboard event handlers
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Only handle space if not in an input field and not already pressed
    if (event.code === 'Space' && !isSpacePressed &&
      !(event.target as HTMLElement)?.tagName.match(/INPUT|TEXTAREA|SELECT/)) {
      event.preventDefault()
      console.log('🔽 Space key pressed - starting recording')
      setIsSpacePressed(true)
      startRecording()
    }
  }, [isSpacePressed, startRecording])

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    // Only handle space if currently pressed and not in an input field
    if (event.code === 'Space' && isSpacePressed &&
      !(event.target as HTMLElement)?.tagName.match(/INPUT|TEXTAREA|SELECT/)) {
      event.preventDefault()
      console.log('🔼 Space key released - stopping recording')
      setIsSpacePressed(false)
      stopRecording()
    }
  }, [isSpacePressed, stopRecording])

  // Mouse event handlers
  const handleMouseDown = () => {
    startRecording()
  }

  const handleMouseUp = () => {
    stopRecording()
  }

  // Set up keyboard listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  // Cleanup audio URL when component unmounts
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  return (
    <div className="simple-voice-container">
      <div className="header">
        <h1>🎤 Simple Voice Test</h1>
        <p>Push-to-Talk Testing</p>
      </div>

      <div className="status">
        <div className={`recording-status ${isRecording ? 'recording' : 'idle'}`}>
          {isRecording ? '🔴 Recording...' : '⚪ Ready'}
        </div>

        <div className="space-status">
          Space Key: {isSpacePressed ? '⬇️ Pressed' : '⬆️ Released'}
        </div>
      </div>

      <div className="controls">
        <h3>🎮 Controls</h3>
        <p><kbd>Space Down</kbd> Push to record voice message</p>
        <p><kbd>Space Up</kbd> Stop recording and send to service</p>

        <button
          className={`voice-button ${isRecording ? 'recording' : 'idle'}`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {isRecording ? '🛑 Recording...' : '🎤 Hold to Record'}
        </button>
      </div>

      {recordedAudio && audioUrl && (
        <div className="audio-info">
          <h3>📼 Recorded Audio</h3>
          <p>Size: {recordedAudio.size} bytes</p>
          <p>Type: {recordedAudio.type}</p>
          <audio
            controls
            src={audioUrl}
            onError={(e) => {
              console.error('❌ Audio playback error:', e)
              console.log('🔍 Audio blob details:', {
                size: recordedAudio.size,
                type: recordedAudio.type,
                url: audioUrl
              })
            }}
            onLoadStart={() => console.log('🎵 Audio loading started')}
            onCanPlay={() => console.log('✅ Audio can play')}
          />
          <div className="audio-debug">
            <p>🔗 Audio URL: {audioUrl.substring(0, 50)}...</p>
          </div>
        </div>
      )}

      {transcription && (
        <div className="transcription">
          <h3>📝 Transcription</h3>
          <p>{transcription}</p>
        </div>
      )}

      <style jsx global>{`
        html, body {
          overflow-x: hidden;
          overflow-y: auto;
          height: auto;
          min-height: 100vh;
        }
        
        body {
          margin: 0;
          padding: 0;
          background: #000;
        }
      `}</style>

      <style jsx>{`
        .simple-voice-container {
          background: #000;
          color: #00ff00;
          font-family: 'Courier New', monospace;
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
          min-height: 100vh;
          overflow-y: auto;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
        }

        .header h1 {
          font-size: 2.5em;
          margin: 0 0 10px 0;
          text-shadow: 0 0 10px #00ff00;
        }

        .status {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          padding: 20px;
          background: rgba(0, 255, 0, 0.1);
          border: 1px solid #00ff00;
          border-radius: 10px;
        }

        .recording-status {
          font-size: 1.5em;
          font-weight: bold;
        }

        .recording-status.recording {
          color: #ff0000;
          animation: pulse 1s infinite;
        }

        .space-status {
          font-size: 1.2em;
        }

        .controls {
          text-align: center;
          margin-bottom: 30px;
          padding: 20px;
          background: rgba(0, 255, 0, 0.1);
          border: 1px solid #00ff00;
          border-radius: 10px;
        }

        .voice-button {
          background: rgba(0, 255, 0, 0.2);
          color: #00ff00;
          border: 2px solid #00ff00;
          padding: 20px 40px;
          border-radius: 10px;
          font-size: 1.2em;
          font-family: inherit;
          cursor: pointer;
          margin-top: 20px;
          transition: all 0.3s ease;
        }

        .voice-button.recording {
          background: rgba(255, 0, 0, 0.2);
          color: #ff0000;
          border-color: #ff0000;
          animation: pulse 1s infinite;
        }

        .voice-button:hover {
          transform: scale(1.05);
        }

        .voice-button:active {
          transform: scale(0.95);
        }

        .audio-info, .transcription {
          padding: 20px;
          background: rgba(0, 255, 0, 0.1);
          border: 1px solid #00ff00;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .transcription {
          border-color: #00ffff;
          background: rgba(0, 255, 255, 0.1);
        }

        kbd {
          background: #333;
          color: #00ff00;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: inherit;
          font-weight: bold;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        audio {
          width: 100%;
          margin-top: 10px;
          background: #333;
        }

        .audio-debug {
          margin-top: 10px;
          font-size: 0.8em;
          color: #888;
        }
      `}</style>
    </div>
  )
}