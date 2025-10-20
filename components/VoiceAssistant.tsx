'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  emotion?: string
}

interface VoiceAssistantProps {
  className?: string
  showUI?: boolean
}

export default function VoiceAssistant({ className = '', showUI = false }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [transcription, setTranscription] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // Play audio from base64 data
  const playAudioFromBase64 = useCallback(async (base64Data: string) => {
    try {
      console.log('🔊 Playing audio response...')

      // Convert base64 to blob
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const audioBlob = new Blob([bytes], { type: 'audio/wav' })
      const audioUrl = URL.createObjectURL(audioBlob)

      // Create and play audio
      const audio = new Audio(audioUrl)

      audio.onloadstart = () => console.log('🎵 Audio loading...')
      audio.oncanplay = () => console.log('✅ Audio ready to play')
      audio.onplay = () => console.log('▶️ Audio playback started')
      audio.onended = () => {
        console.log('⏹️ Audio playback finished')
        URL.revokeObjectURL(audioUrl)
      }
      audio.onerror = (error) => {
        console.error('❌ Audio playback error:', error)
        URL.revokeObjectURL(audioUrl)
      }

      await audio.play()

    } catch (error) {
      console.error('❌ Failed to play audio:', error)
    }
  }, [])

  // Start recording
  const startRecording = useCallback(async () => {
    if (isRecording) return

    try {
      console.log('🎤 Starting recording...')
      setError(null)

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
        console.log('📼 Recording complete:', audioBlob.size, 'bytes', 'type:', mimeType)

        // Process the audio
        processAudio(audioBlob)
      }

      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      console.log('✅ Recording started')

    } catch (error) {
      console.error('❌ Failed to start recording:', error)
      setError(error instanceof Error ? error.message : 'Failed to start recording')
    }
  }, [isRecording])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return

    console.log('🛑 Stopping recording...')
    mediaRecorderRef.current.stop()

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    setIsRecording(false)
    console.log('✅ Recording stopped')
  }, [isRecording])

  // Process audio through the complete pipeline
  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    setTranscription('')
    setAiResponse('')
    setProcessingStep('Starting...')

    try {
      console.log('🔄 Processing audio through pipeline...')

      // Step 1: Speech-to-Text
      setProcessingStep('Converting speech to text...')
      console.log('📝 Step 1: Converting speech to text...')
      let transcriptionText = ''

      let sttResult: any = ''
      try {
        sttResult = await sendToSTT(audioBlob)
        // Handle both string and object responses
        if (typeof sttResult === 'string') {
          transcriptionText = sttResult
        } else if (sttResult && typeof sttResult === 'object') {
          transcriptionText = sttResult.transcription || ''
        }
      } catch (sttError) {
        console.error('❌ STT failed:', sttError)
        setError(`Speech recognition failed: ${sttError instanceof Error ? sttError.message : 'Unknown error'}`)
        return
      }

      if (!transcriptionText || transcriptionText.trim() === '') {
        console.warn('⚠️ No transcription received')
        setError('No speech detected. Please speak more clearly and try again.')
        return
      }

      setTranscription(transcriptionText)

      // Add user message to conversation
      const userTurn: ConversationTurn = {
        role: 'user',
        content: transcriptionText,
        timestamp: Date.now()
      }
      setConversationHistory(prev => [...prev, userTurn])

      // Step 2: Use LLM response from STT service (if available)
      let aiResponseText = ''
      if (sttResult && typeof sttResult === 'object' && sttResult.llmResponse) {
        aiResponseText = sttResult.llmResponse
        console.log('✅ Using LLM response from STT service:', aiResponseText)
        setAiResponse(aiResponseText)

        // Add AI response to conversation
        const aiTurn: ConversationTurn = {
          role: 'assistant',
          content: aiResponseText,
          timestamp: Date.now()
        }
        setConversationHistory(prev => [...prev, aiTurn])

        // Play audio response if available from STT, otherwise generate TTS
        if (sttResult.audioResponse) {
          console.log('🔊 Playing audio response from STT service')
          try {
            await playAudioFromBase64(sttResult.audioResponse)
          } catch (audioError) {
            console.warn('⚠️ Audio playback failed:', audioError)
          }
        }

        console.log('✅ Complete pipeline processing finished (using integrated LLM)')
      } else {
        // Fallback: Skip chat service since it's not available
        console.log('⚠️ No LLM response from STT service, skipping chat step')
        setError('LLM response not available from STT service')
      }

    } catch (error) {
      console.error('❌ Pipeline processing failed:', error)
      setError(error instanceof Error ? error.message : 'Processing failed')
    } finally {
      setIsProcessing(false)
      setProcessingStep('')
    }
  }

  // Send audio to STT service
  const sendToSTT = async (audioBlob: Blob): Promise<string | { transcription: string; llmResponse?: string; audioResponse?: string }> => {
    return new Promise((resolve, reject) => {
      try {
        console.log('📤 Connecting to STT service...')

        const ws = new WebSocket('ws://localhost:8000/ws/stt')
        let transcriptionResult = ''
        let llmResponseResult = ''
        let audioResponseResult = ''
        let isProcessingComplete = false
        let timeoutId: ReturnType<typeof setTimeout>

        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId)
          if (ws.readyState === WebSocket.OPEN) {
            ws.close()
          }
        }

        ws.onopen = async () => {
          console.log('🔗 STT WebSocket connected')

          try {
            // Send start message
            ws.send(JSON.stringify({
              type: 'start',
              config: {
                sampleRate: 16000,
                channels: 1,
                format: 'webm'
              }
            }))

            // Wait a bit for the service to be ready
            await new Promise(resolve => setTimeout(resolve, 100))

            // Convert audio to base64 and send as JSON
            const arrayBuffer = await audioBlob.arrayBuffer()
            const uint8Array = new Uint8Array(arrayBuffer)

            console.log('📤 Converting audio data:', arrayBuffer.byteLength, 'bytes to base64')

            // Send in chunks to avoid memory issues with large files
            const chunkSize = 8192 // 8KB chunks
            let offset = 0

            while (offset < uint8Array.length) {
              const chunk = uint8Array.slice(offset, offset + chunkSize)
              const chunkArray = Array.from(chunk) // Convert to regular array of numbers

              ws.send(JSON.stringify({
                type: 'audio',
                bytes: chunkArray, // Use 'bytes' key as expected by backend
                format: 'webm',
                chunk: true,
                offset: offset,
                total: uint8Array.length
              }))

              offset += chunkSize

              // Small delay between chunks to prevent overwhelming the server
              await new Promise(resolve => setTimeout(resolve, 10))
            }

            console.log('📤 Finished sending audio data in chunks')

            // Wait a bit before sending stop
            await new Promise(resolve => setTimeout(resolve, 100))

            // Send stop message
            ws.send(JSON.stringify({ type: 'stop' }))
            console.log('📤 Sent stop message, waiting for transcription...')

            // Set timeout for transcription response
            timeoutId = setTimeout(() => {
              if (!isProcessingComplete) {
                console.warn('⚠️ STT timeout - no transcription received')
                cleanup()
                reject(new Error('STT timeout - no transcription received within 15 seconds'))
              }
            }, 15000) // 15 second timeout

          } catch (error) {
            console.error('❌ Error sending data to STT:', error)
            cleanup()
            reject(error)
          }
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('📨 STT Response:', data)

            // Handle different message types
            if (data.type === 'status') {
              console.log('ℹ️ STT Status:', data.message)
              return // Continue waiting for transcription
            }

            if (data.type === 'transcription' && data.text) {
              transcriptionResult = data.text
              console.log('📝 Transcription received:', data.text)

              // Store LLM response if available
              if (data.llm_response) {
                llmResponseResult = data.llm_response
                console.log('🤖 LLM response from STT service:', data.llm_response)
              }

              // Store audio response if available in the same message
              if (data.audio_response) {
                audioResponseResult = data.audio_response
                console.log('🔊 Audio response received with transcription')
              }

              // Don't resolve yet, wait for potential audio_response message
              return
            }

            if (data.type === 'partial' && data.text) {
              console.log('📝 Partial transcription:', data.text)
              transcriptionResult = data.text // Update with partial result
              return
            }

            if (data.type === 'audio_response' && data.data) {
              audioResponseResult = data.data
              console.log('🔊 Audio response from STT service:', data.data.length, 'chars')

              // Now we have everything, resolve with complete data
              if (transcriptionResult) {
                isProcessingComplete = true
                cleanup()
                resolve({
                  transcription: transcriptionResult,
                  llmResponse: llmResponseResult || undefined,
                  audioResponse: audioResponseResult
                })
                return
              }
            }

            if (data.type === 'final' || data.type === 'complete' || data.type === 'end') {
              console.log('✅ STT processing complete')
              isProcessingComplete = true
              cleanup()
              resolve(transcriptionResult || '')
              return
            }

            // Handle error messages
            if (data.type === 'error') {
              console.error('❌ STT service error:', data.message)
              isProcessingComplete = true
              cleanup()
              reject(new Error(`STT service error: ${data.message}`))
              return
            }

          } catch (parseError) {
            console.error('❌ Failed to parse STT response:', parseError, 'Raw data:', event.data)
          }
        }

        ws.onerror = (error) => {
          console.error('❌ STT WebSocket error:', error)
          isProcessingComplete = true
          cleanup()
          reject(new Error('STT WebSocket connection failed'))
        }

        ws.onclose = (event) => {
          console.log('🔗 STT WebSocket closed:', event.code, event.reason)

          if (!isProcessingComplete) {
            if (transcriptionResult) {
              console.log('✅ Connection closed but we have transcription:', transcriptionResult)
              isProcessingComplete = true
              cleanup()
              resolve(transcriptionResult)
            } else {
              console.warn('⚠️ Connection closed without transcription')
              isProcessingComplete = true
              cleanup()

              // Provide more specific error messages based on close code
              let errorMessage = 'STT connection closed unexpectedly'
              if (event.code === 1006) {
                errorMessage = 'STT service connection lost (code 1006) - service may be unavailable'
              } else if (event.code === 1011) {
                errorMessage = 'STT service encountered an error processing the audio'
              }

              reject(new Error(errorMessage))
            }
          }
        }

      } catch (error) {
        console.error('❌ Failed to connect to STT:', error)
        reject(error)
      }
    })
  }

  // Keyboard event handlers
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.code === 'Space' && !isSpacePressed &&
      !(event.target as HTMLElement)?.tagName.match(/INPUT|TEXTAREA|SELECT/)) {
      event.preventDefault()
      console.log('🔽 Space key pressed - starting recording')
      setIsSpacePressed(true)
      startRecording()
    }
  }, [isSpacePressed, startRecording])

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.code === 'Space' && isSpacePressed &&
      !(event.target as HTMLElement)?.tagName.match(/INPUT|TEXTAREA|SELECT/)) {
      event.preventDefault()
      console.log('🔼 Space key released - stopping recording')
      setIsSpacePressed(false)
      stopRecording()
    }
  }, [isSpacePressed, stopRecording])

  // Set up keyboard listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // If showUI is false, render nothing (just provide the voice functionality)
  if (!showUI) {
    return null
  }

  // Render UI when showUI is true
  return (
    <div className={`voice-assistant ${className} ${isMinimized ? 'minimized' : ''} ${isExpanded ? 'expanded' : ''}`}>
      {/* Header with controls */}
      <div className="voice-header">
        <div className="voice-title">
          🎙️ Voice Assistant
        </div>
        <div className="voice-controls">
          <button
            className="control-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'ย่อ' : 'ขยาย'}
          >
            {isExpanded ? '📋' : '💬'}
          </button>
          <button
            className="control-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'แสดง' : 'ซ่อน'}
          >
            {isMinimized ? '⬆️' : '⬇️'}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Voice Status Indicator */}
          <div className={`voice-status ${isRecording ? 'recording' : isProcessing ? 'processing' : 'idle'}`}>
            {isRecording && '🎤 กำลังบันทึกเสียง...'}
            {isProcessing && `⚙️ ${processingStep}`}
            {!isRecording && !isProcessing && '🎙️ กด Space เพื่อพูด'}
          </div>

          {/* Error Display */}
          {error && (
            <div className="voice-error">
              <span>❌ {error}</span>
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )}

          {/* Current Conversation */}
          {(transcription || aiResponse) && (
            <div className="voice-current">
              <div className="current-title">การสนทนาปัจจุบัน</div>
              {transcription && (
                <div className="voice-user">
                  <span className="role-icon">👤</span>
                  <span className="message">{transcription}</span>
                </div>
              )}
              {aiResponse && (
                <div className="voice-ai">
                  <span className="role-icon">🤖</span>
                  <span className="message">{aiResponse}</span>
                </div>
              )}
            </div>
          )}

          {/* Full Conversation History (when expanded) */}
          {isExpanded && conversationHistory.length > 0 && (
            <div className="voice-history">
              <div className="history-header">
                <span>ประวัติการสนทนา</span>
                <button
                  className="clear-btn"
                  onClick={() => setConversationHistory([])}
                >
                  🗑️ ล้าง
                </button>
              </div>
              <div className="history-list">
                {conversationHistory.map((turn, index) => (
                  <div key={index} className={`history-turn ${turn.role}`}>
                    <div className="turn-header">
                      <span className="role">
                        {turn.role === 'user' ? '👤 คุณ' : '🤖 AI'}
                      </span>
                      <span className="timestamp">
                        {new Date(turn.timestamp).toLocaleTimeString('th-TH')}
                      </span>
                    </div>
                    <div className="turn-content">{turn.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .voice-assistant {
          position: fixed;
          bottom: 20px;
          left: 20px;
          width: 320px;
          max-height: 80vh;
          z-index: 1000;
          font-family: 'Courier New', monospace;
          color: #00ff00;
          background: rgba(0, 0, 0, 0.95);
          border: 2px solid #00ff00;
          border-radius: 12px;
          backdrop-filter: blur(10px);
          box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .voice-assistant.minimized {
          height: 50px;
        }

        .voice-assistant.expanded {
          width: 400px;
          max-height: 70vh;
        }

        .voice-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: rgba(0, 255, 0, 0.1);
          border-bottom: 1px solid #00ff00;
          font-size: 0.9em;
          font-weight: bold;
        }

        .voice-title {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .voice-controls {
          display: flex;
          gap: 5px;
        }

        .control-btn {
          background: transparent;
          border: 1px solid #00ff00;
          color: #00ff00;
          padding: 2px 6px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8em;
          transition: all 0.2s ease;
        }

        .control-btn:hover {
          background: rgba(0, 255, 0, 0.2);
          transform: scale(1.1);
        }

        .voice-status {
          margin: 10px;
          padding: 8px 12px;
          border-radius: 8px;
          text-align: center;
          font-size: 0.85em;
          border: 1px solid #00ff00;
          background: rgba(0, 255, 0, 0.05);
        }

        .voice-status.recording {
          border-color: #ff0000;
          color: #ff0000;
          background: rgba(255, 0, 0, 0.1);
          animation: pulse 1s infinite;
        }

        .voice-status.processing {
          border-color: #ffff00;
          color: #ffff00;
          background: rgba(255, 255, 0, 0.1);
        }

        .voice-error {
          margin: 10px;
          background: rgba(255, 0, 0, 0.2);
          border: 1px solid #ff0000;
          border-radius: 8px;
          padding: 8px 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8em;
        }

        .voice-error button {
          background: #ff0000;
          color: white;
          border: none;
          padding: 2px 6px;
          border-radius: 3px;
          cursor: pointer;
          font-family: inherit;
        }

        .voice-current {
          margin: 10px;
          border: 1px solid #00ff00;
          border-radius: 8px;
          overflow: hidden;
        }

        .current-title {
          background: rgba(0, 255, 0, 0.1);
          padding: 6px 10px;
          font-size: 0.75em;
          font-weight: bold;
          border-bottom: 1px solid #00ff00;
        }

        .voice-user, .voice-ai {
          padding: 8px 10px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.8em;
          line-height: 1.4;
        }

        .voice-user {
          background: rgba(0, 255, 0, 0.05);
          border-bottom: 1px solid rgba(0, 255, 0, 0.2);
        }

        .voice-ai {
          background: rgba(0, 255, 255, 0.05);
          color: #00ffff;
        }

        .role-icon {
          flex-shrink: 0;
          font-size: 0.9em;
        }

        .message {
          flex: 1;
          word-wrap: break-word;
        }

        .voice-history {
          margin: 10px;
          border: 1px solid #00ff00;
          border-radius: 8px;
          max-height: 300px;
          overflow: hidden;
        }

        .history-header {
          background: rgba(0, 255, 0, 0.1);
          padding: 6px 10px;
          font-size: 0.75em;
          font-weight: bold;
          border-bottom: 1px solid #00ff00;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .clear-btn {
          background: transparent;
          border: 1px solid #ff6600;
          color: #ff6600;
          padding: 2px 6px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 0.9em;
          transition: all 0.2s ease;
        }

        .clear-btn:hover {
          background: rgba(255, 102, 0, 0.2);
        }

        .history-list {
          max-height: 250px;
          overflow-y: auto;
        }

        .history-turn {
          padding: 8px 10px;
          border-bottom: 1px solid rgba(0, 255, 0, 0.1);
          font-size: 0.75em;
        }

        .history-turn.user {
          background: rgba(0, 255, 0, 0.03);
        }

        .history-turn.assistant {
          background: rgba(0, 255, 255, 0.03);
          color: #00ffff;
        }

        .turn-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          opacity: 0.8;
        }

        .role {
          font-weight: bold;
        }

        .timestamp {
          font-size: 0.9em;
          opacity: 0.6;
        }

        .turn-content {
          line-height: 1.3;
          word-wrap: break-word;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Scrollbar styling */
        .history-list::-webkit-scrollbar {
          width: 4px;
        }

        .history-list::-webkit-scrollbar-track {
          background: transparent;
        }

        .history-list::-webkit-scrollbar-thumb {
          background: #00ff00;
          border-radius: 2px;
        }

        .history-list::-webkit-scrollbar-thumb:hover {
          background: #00cc00;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .voice-assistant {
            left: 10px;
            bottom: 10px;
            width: calc(100vw - 20px);
            max-width: 350px;
          }

          .voice-assistant.expanded {
            width: calc(100vw - 20px);
            max-width: 380px;
          }
        }

        @media (max-height: 600px) {
          .voice-assistant {
            max-height: 60vh;
          }

          .voice-assistant.expanded {
            max-height: 50vh;
          }

          .history-list {
            max-height: 150px;
          }
        }
      `}</style>
    </div>
  )
}