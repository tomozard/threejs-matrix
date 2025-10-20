'use client'

import { useRef } from 'react'
import { VoiceState } from '@/types/voice'

interface VoiceButtonProps {
  voiceState: VoiceState
  isConnected: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  error?: string | null
}

export default function VoiceButton({
  voiceState,
  isConnected,
  onStartRecording,
  onStopRecording,
  error
}: VoiceButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const isRecording = voiceState === VoiceState.RECORDING

  // Handle mouse and touch events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    console.log('🖱️ VoiceButton mouseDown - State:', voiceState, 'Connected:', isConnected, 'Error:', error)
    
    // If there's a connection error, allow retry
    if (error && (error.includes('connection') || error.includes('WebSocket'))) {
      console.log('🔄 Retrying connection via button click')
      onStartRecording()
      return
    }
    
    if (!isConnected || error) {
      console.warn('⚠️ Cannot start recording - not connected or has error')
      return
    }
    
    if (!isRecording) {
      console.log('🎤 Starting recording via button')
      onStartRecording()
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault()
    console.log('🖱️ VoiceButton mouseUp - Recording:', isRecording)
    if (isRecording) {
      console.log('🛑 Stopping recording via button')
      onStopRecording()
    }
  }

  const handleMouseLeave = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isRecording) {
      onStopRecording()
    }
  }

  // Handle touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    if (!isConnected || error) return
    
    if (!isRecording) {
      onStartRecording()
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    if (isRecording) {
      onStopRecording()
    }
  }

  // Get button styles based on current state
  const getButtonStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      bottom: '30px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      border: '2px solid #00ff00',
      background: 'rgba(0, 0, 0, 0.8)',
      cursor: isConnected && !error ? 'pointer' : 'not-allowed',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      fontFamily: 'Courier New, monospace',
      transition: 'all 0.3s ease',
      userSelect: 'none' as const,
      outline: 'none',
      boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)'
    }

    switch (voiceState) {
      case VoiceState.RECORDING:
        return {
          ...baseStyles,
          background: 'rgba(255, 0, 0, 0.8)',
          border: '2px solid #ff0000',
          boxShadow: '0 0 20px rgba(255, 0, 0, 0.6)',
          color: '#ff0000',
          animation: 'pulse 1s infinite'
        }
      case VoiceState.PROCESSING:
        return {
          ...baseStyles,
          background: 'rgba(255, 255, 0, 0.8)',
          border: '2px solid #ffff00',
          boxShadow: '0 0 15px rgba(255, 255, 0, 0.5)',
          color: '#ffff00',
          animation: 'spin 1s linear infinite'
        }
      case VoiceState.PLAYING:
        return {
          ...baseStyles,
          background: 'rgba(0, 255, 255, 0.8)',
          border: '2px solid #00ffff',
          boxShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
          color: '#00ffff',
          animation: 'wave 1.5s ease-in-out infinite'
        }
      case VoiceState.IDLE:
      default:
        return {
          ...baseStyles,
          color: isConnected && !error ? '#00ff00' : '#666666',
          opacity: isConnected && !error ? 1 : 0.5
        }
    }
  }

  // Get button content based on state
  const getButtonContent = () => {
    if (error) {
      // Show different icons for different error types
      if (error.includes('connection') || error.includes('WebSocket')) {
        return '🔄' // Retry icon for connection errors
      }
      if (error.includes('microphone') || error.includes('permission')) {
        return '🎤' // Microphone icon for permission errors
      }
      return '⚠' // General warning for other errors
    }
    
    switch (voiceState) {
      case VoiceState.RECORDING:
        return '⏹'
      case VoiceState.PROCESSING:
        return '⟳'
      case VoiceState.PLAYING:
        return '♪'
      case VoiceState.IDLE:
      default:
        return '🎤'
    }
  }

  // Get tooltip text
  const getTooltipText = () => {
    if (error) {
      if (error.includes('connection') || error.includes('WebSocket')) {
        return `Connection error: ${error}. Click to retry connection.`
      }
      if (error.includes('microphone') || error.includes('permission')) {
        return `Microphone error: ${error}. Please check your microphone permissions.`
      }
      return `Error: ${error}`
    }
    
    if (!isConnected) return 'Connecting to voice services...'
    
    switch (voiceState) {
      case VoiceState.RECORDING:
        return 'Release to stop recording or release spacebar'
      case VoiceState.PROCESSING:
        return 'Processing your voice...'
      case VoiceState.PLAYING:
        return 'Playing AI response'
      case VoiceState.IDLE:
      default:
        return 'Hold to record (mouse) or press spacebar'
    }
  }

  return (
    <>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.1); }
        }
        
        @keyframes spin {
          from { transform: translateX(-50%) rotate(0deg); }
          to { transform: translateX(-50%) rotate(360deg); }
        }
        
        @keyframes wave {
          0%, 100% { transform: translateX(-50%) scaleY(1); }
          50% { transform: translateX(-50%) scaleY(1.2); }
        }
        
        .voice-button:hover:not(:disabled) {
          transform: translateX(-50%) scale(1.05) !important;
        }
        
        .voice-button:active:not(:disabled) {
          transform: translateX(-50%) scale(0.95) !important;
        }
      `}</style>
      
      <button
        ref={buttonRef}
        className="voice-button"
        style={getButtonStyles()}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        disabled={!isConnected && !error?.includes('connection') && !error?.includes('WebSocket')}
        title={getTooltipText()}
        aria-label={getTooltipText()}
      >
        {getButtonContent()}
      </button>
    </>
  )
}