// Voice Test - Complete Voice Assistant Integration

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  emotion?: string
}

export default function VoiceTestPage() {
  const [isRecording, setIsRecording] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [transcription, setTranscription] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [connectionStatus, setConnectionStatus] = useState({
    stt: false,
    chat: false,
    tts: false
  })
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const conversationScrollRef = useRef<HTMLDivElement>(null)

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

  // Auto-scroll conversation to bottom
  useEffect(() => {
    if (conversationScrollRef.current) {
      conversationScrollRef.current.scrollTop = conversationScrollRef.current.scrollHeight
    }
  }, [conversationHistory, aiResponse])

  // Test backend connections
  const testConnections = useCallback(async () => {
    console.log('🧪 Testing backend connections...')

    const baseUrl = 'http://localhost:8000'
    const tests = {
      stt: false,
      chat: false,
      tts: false
    }

    // Test STT WebSocket
    try {
      const sttWs = new WebSocket('ws://localhost:8000/ws/stt')
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          sttWs.close()
          reject(new Error('STT connection timeout'))
        }, 3000)

        sttWs.onopen = () => {
          clearTimeout(timeout)
          tests.stt = true
          sttWs.close()
          resolve(true)
        }

        sttWs.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('STT connection failed'))
        }
      })
    } catch (error) {
      console.warn('❌ STT connection failed:', error)
    }

    // Test Chat endpoint
    try {
      const chatResponse = await fetch(`${baseUrl}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test', history: [] })
      })
      tests.chat = chatResponse.ok
    } catch (error) {
      console.warn('❌ Chat connection failed:', error)
    }

    // Test TTS endpoint
    try {
      const ttsResponse = await fetch(`${baseUrl}/tts/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test' })
      })
      tests.tts = ttsResponse.ok
    } catch (error) {
      console.warn('❌ TTS connection failed:', error)
    }

    setConnectionStatus(tests)
    console.log('🔍 Connection test results:', tests)

    return tests
  }, [])

  // Initialize and test connections
  useEffect(() => {
    testConnections()
  }, [testConnections])

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
        setRecordedAudio(audioBlob)

        // Create URL for audio player
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)

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
        } else {
          // Generate TTS for the AI response
          console.log('🔊 Generating TTS for AI response...')
          setProcessingStep('Generating speech...')
          try {
            await sendToTTS(aiResponseText)
          } catch (ttsError) {
            console.warn('⚠️ TTS generation failed:', ttsError)
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

  // Send message to Chat service
  const sendToChat = async (message: string, history: ConversationTurn[]): Promise<string> => {
    try {
      console.log('📤 Sending to chat service:', message)

      const response = await fetch('http://localhost:8000/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          history: history.slice(-10) // Send last 10 messages for context
        })
      })

      if (!response.ok) {
        throw new Error(`Chat service error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body from chat service')
      }

      let fullResponse = ''
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.content) {
                fullResponse += data.content
                setAiResponse(fullResponse) // Update UI in real-time
              }
            } catch (parseError) {
              console.warn('Failed to parse chat chunk:', parseError)
            }
          }
        }
      }

      console.log('💬 Complete chat response:', fullResponse)
      return fullResponse

    } catch (error) {
      console.error('❌ Chat service failed:', error)
      throw error
    }
  }

  // Send text to TTS service
  const sendToTTS = async (text: string): Promise<void> => {
    try {
      console.log('📤 Sending to TTS service:', text)

      const response = await fetch('http://localhost:8000/tts/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      })

      if (!response.ok) {
        throw new Error(`TTS service error: ${response.status}`)
      }

      // Handle audio stream (simplified - just log for now)
      const audioBlob = await response.blob()
      console.log('🔊 TTS audio received:', audioBlob.size, 'bytes')

      // TODO: Play the audio
      // const audioUrl = URL.createObjectURL(audioBlob)
      // const audio = new Audio(audioUrl)
      // await audio.play()

    } catch (error) {
      console.error('❌ TTS service failed:', error)
      // Don't throw - TTS is optional
    }
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
      console.log('� Spacce key released - stopping recording')
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

  // Clear conversation
  const clearConversation = () => {
    setConversationHistory([])
    setTranscription('')
    setAiResponse('')
    setRecordedAudio(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
  }

  return (
    <div className="voice-test-container">
      <div className="header">
        <h1>� AI Vcoice Assistant Test</h1>
        <p>Complete Voice Pipeline Testing</p>
      </div>

      {/* Connection Status */}
      <div className="status-panel">
        <h3>📡 Connection Status</h3>
        <div className="connection-grid">
          <div className={`connection-item ${connectionStatus.stt ? 'connected' : 'disconnected'}`}>
            <span className="service-name">STT (Speech-to-Text)</span>
            <span className="status">{connectionStatus.stt ? '✅ Connected' : '❌ Disconnected'}</span>
          </div>
          <div className={`connection-item ${connectionStatus.chat ? 'connected' : 'disconnected'}`}>
            <span className="service-name">Chat (AI Assistant)</span>
            <span className="status">{connectionStatus.chat ? '✅ Connected' : '❌ Disconnected'}</span>
          </div>
          <div className={`connection-item ${connectionStatus.tts ? 'connected' : 'disconnected'}`}>
            <span className="service-name">TTS (Text-to-Speech)</span>
            <span className="status">{connectionStatus.tts ? '✅ Connected' : '❌ Disconnected'}</span>
          </div>
        </div>

        <button onClick={testConnections} className="test-button">
          🔍 Test Connections
        </button>
      </div>

      {/* Current Status */}
      <div className="status-panel">
        <h3>🎙️ Current Status</h3>
        <div className={`state-indicator ${isRecording ? 'recording' : isProcessing ? 'processing' : 'idle'}`}>
          <span className="state-text">
            {isRecording && '🎤 Recording - Speak now...'}
            {isProcessing && `⚙️ Processing - ${processingStep}`}
            {!isRecording && !isProcessing && '😴 Idle - Ready to record'}
          </span>
        </div>

        <div className="space-status">
          Space Key: {isSpacePressed ? '⬇️ Pressed' : '⬆️ Released'}
        </div>

        {error && (
          <div className="error-message">
            <span>❌ Error: {error}</span>
            <button onClick={() => setError(null)} className="clear-error">✕</button>
          </div>
        )}
      </div>

      {/* Current Processing */}
      {(transcription || aiResponse) && (
        <div className="processing-panel">
          <h3>🔄 Current Processing</h3>

          {transcription && (
            <div className="transcription">
              <strong>📝 Your Speech:</strong> {transcription}
            </div>
          )}

          {aiResponse && (
            <div className="ai-response">
              <strong>🤖 AI Response:</strong> {aiResponse}
              {isProcessing && <span className="typing-indicator">▋</span>}
            </div>
          )}
        </div>
      )}

      {/* Conversation History */}
      <div className="conversation-panel">
        <div className="conversation-header">
          <h3>💬 Conversation History</h3>
          <button onClick={clearConversation} className="clear-button">🗑️ Clear</button>
        </div>

        <div className="conversation-history" ref={conversationScrollRef}>
          {conversationHistory.length === 0 ? (
            <div className="empty-conversation">
              <p>No conversation yet. Press Space or click the voice button to start!</p>
            </div>
          ) : (
            conversationHistory.map((turn, index) => (
              <div key={index} className={`conversation-turn ${turn.role}`}>
                <div className="turn-header">
                  <span className="role">
                    {turn.role === 'user' ? '👤 You' : '🤖 AI Assistant'}
                  </span>
                  <span className="timestamp">
                    {new Date(turn.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="turn-content">{turn.content}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="controls-panel">
        <h3>🎮 Controls</h3>
        <div className="controls-info">
          <p><kbd>Space Down</kbd> Push to record voice message</p>
          <p><kbd>Space Up</kbd> Stop recording and process through AI pipeline</p>
          <p>Or use the voice button below</p>
        </div>

        <button
          className={`voice-button ${isRecording ? 'recording' : isProcessing ? 'processing' : 'idle'}`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          disabled={isProcessing}
        >
          {isRecording ? '🛑 Recording...' : isProcessing ? '⟳ Processing...' : '🎤 Hold to Record'}
        </button>
      </div>

      {/* Recorded Audio */}
      {recordedAudio && audioUrl && (
        <div className="audio-panel">
          <h3>📼 Recorded Audio</h3>
          <p>Size: {recordedAudio.size} bytes | Type: {recordedAudio.type}</p>
          <audio
            controls
            src={audioUrl}
            onError={(e) => console.error('❌ Audio playback error:', e)}
          />
        </div>
      )}

      <style jsx global>{`
        html, body {
          overflow-x: hidden;
          overflow-y: auto;
          height: auto;
          min-height: 100vh;
          margin: 0;
          padding: 0;
          background: #000;
        }
      `}</style>

      <style jsx>{`
        .voice-test-container {
          background: #000;
          color: #00ff00;
          font-family: 'Courier New', monospace;
          padding: 20px;
          max-width: 1000px;
          margin: 0 auto;
          min-height: 100vh;
          overflow-y: auto;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #00ff00;
          padding-bottom: 20px;
        }

        .header h1 {
          font-size: 2.5em;
          margin: 0 0 10px 0;
          text-shadow: 0 0 10px #00ff00;
        }

        .header p {
          font-size: 1.2em;
          margin: 0;
          opacity: 0.8;
        }

        .status-panel, .processing-panel, .conversation-panel, .controls-panel, .audio-panel {
          background: rgba(0, 255, 0, 0.1);
          border: 1px solid #00ff00;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .status-panel h3, .processing-panel h3, .conversation-panel h3, .controls-panel h3, .audio-panel h3 {
          margin: 0 0 15px 0;
          font-size: 1.3em;
          text-shadow: 0 0 5px #00ff00;
        }

        .connection-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
          margin-bottom: 15px;
        }

        .connection-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          border-radius: 5px;
          background: rgba(0, 0, 0, 0.5);
        }

        .connection-item.connected {
          border-left: 4px solid #00ff00;
        }

        .connection-item.disconnected {
          border-left: 4px solid #ff0000;
        }

        .service-name {
          font-weight: bold;
        }

        .test-button {
          background: #0066cc;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.9em;
        }

        .test-button:hover {
          background: #0052a3;
        }

        .state-indicator {
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          font-size: 1.2em;
          font-weight: bold;
          margin-bottom: 15px;
        }

        .state-indicator.idle {
          background: rgba(0, 255, 0, 0.2);
          border: 2px solid #00ff00;
        }

        .state-indicator.recording {
          background: rgba(255, 0, 0, 0.2);
          border: 2px solid #ff0000;
          animation: pulse 1s infinite;
        }

        .state-indicator.processing {
          background: rgba(255, 255, 0, 0.2);
          border: 2px solid #ffff00;
        }

        .space-status {
          font-size: 1.1em;
          text-align: center;
        }

        .error-message {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 15px;
          padding: 10px;
          background: rgba(255, 0, 0, 0.2);
          border: 1px solid #ff0000;
          border-radius: 5px;
        }

        .clear-error {
          background: #ff0000;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 3px;
          cursor: pointer;
          font-family: inherit;
        }

        .transcription, .ai-response {
          margin-bottom: 15px;
          padding: 10px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 5px;
          border-left: 4px solid #00ff00;
        }

        .ai-response {
          border-left-color: #00ffff;
        }

        .typing-indicator {
          animation: blink 1s infinite;
          color: #ffff00;
        }

        .conversation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .clear-button {
          background: #ff6600;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 5px;
          cursor: pointer;
          font-family: inherit;
        }

        .clear-button:hover {
          background: #cc5500;
        }

        .conversation-history {
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #333;
          border-radius: 5px;
          padding: 10px;
          background: rgba(0, 0, 0, 0.3);
          scroll-behavior: smooth;
        }

        .empty-conversation {
          text-align: center;
          padding: 40px;
          opacity: 0.6;
        }

        .conversation-turn {
          margin-bottom: 15px;
          padding: 10px;
          border-radius: 8px;
        }

        .conversation-turn.user {
          background: rgba(0, 255, 0, 0.1);
          border-left: 4px solid #00ff00;
        }

        .conversation-turn.assistant {
          background: rgba(0, 255, 255, 0.1);
          border-left: 4px solid #00ffff;
        }

        .turn-header {
          display: flex;
          gap: 15px;
          margin-bottom: 8px;
          font-size: 0.9em;
          opacity: 0.8;
        }

        .role {
          font-weight: bold;
        }

        .timestamp {
          color: #888;
        }

        .turn-content {
          line-height: 1.5;
        }

        .controls-info {
          background: rgba(0, 0, 0, 0.5);
          padding: 15px;
          border-radius: 5px;
          border-left: 4px solid #00ff00;
          margin-bottom: 20px;
        }

        .controls-info p {
          margin: 5px 0;
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
          transition: all 0.3s ease;
          width: 100%;
          max-width: 300px;
          margin: 0 auto;
          display: block;
        }

        .voice-button.recording {
          background: rgba(255, 0, 0, 0.2);
          color: #ff0000;
          border-color: #ff0000;
          animation: pulse 1s infinite;
        }

        .voice-button.processing {
          background: rgba(255, 255, 0, 0.2);
          color: #ffff00;
          border-color: #ffff00;
          cursor: not-allowed;
        }

        .voice-button:hover:not(:disabled) {
          transform: scale(1.05);
        }

        .voice-button:active:not(:disabled) {
          transform: scale(0.95);
        }

        .voice-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        kbd {
          background: #333;
          color: #00ff00;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: inherit;
          font-weight: bold;
        }

        audio {
          width: 100%;
          margin-top: 10px;
          background: #333;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        /* Scrollbar styling */
        .conversation-history::-webkit-scrollbar {
          width: 8px;
        }

        .conversation-history::-webkit-scrollbar-track {
          background: #000;
        }

        .conversation-history::-webkit-scrollbar-thumb {
          background: #00ff00;
          border-radius: 4px;
        }

        .conversation-history::-webkit-scrollbar-thumb:hover {
          background: #00cc00;
        }
      `}</style>
    </div>
  )
}