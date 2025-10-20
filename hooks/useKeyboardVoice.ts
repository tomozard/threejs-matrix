import { useEffect, useRef } from 'react'
import { VoiceState } from '@/types/voice'

interface UseKeyboardVoiceProps {
  voiceState: VoiceState
  isConnected: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  error?: string | null
}

export function useKeyboardVoice({
  voiceState,
  isConnected,
  onStartRecording,
  onStopRecording,
  error
}: UseKeyboardVoiceProps) {
  const isSpacePressed = useRef(false)
  const isRecording = voiceState === VoiceState.RECORDING

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle spacebar for voice activation and not in input fields
      if (event.code !== 'Space' || 
          (event.target as HTMLElement)?.tagName.match(/INPUT|TEXTAREA|SELECT/)) return
      
      // Prevent default spacebar behavior only when handling voice activation
      event.preventDefault()
      
      console.log('⌨️ Space key down - Recording:', isRecording, 'Connected:', isConnected, 'Error:', error)
      
      // Ignore if already pressed (prevents key repeat)
      if (isSpacePressed.current) return
      
      // Check if voice interaction is available
      if (!isConnected || error) {
        console.warn('⚠️ Cannot start recording via keyboard - not connected or has error')
        return
      }
      
      // Start recording if not already recording
      if (!isRecording) {
        console.log('🎤 Starting recording via keyboard')
        isSpacePressed.current = true
        onStartRecording()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      // Only handle spacebar for voice activation and not in input fields
      if (event.code !== 'Space' || 
          (event.target as HTMLElement)?.tagName.match(/INPUT|TEXTAREA|SELECT/)) return
      
      // Prevent default spacebar behavior only when handling voice activation
      event.preventDefault()
      
      console.log('⌨️ Space key up - Recording:', isRecording, 'SpacePressed:', isSpacePressed.current)
      
      // Reset pressed state
      if (isSpacePressed.current) {
        isSpacePressed.current = false
        
        // Stop recording if currently recording
        if (isRecording) {
          console.log('🛑 Stopping recording via keyboard')
          onStopRecording()
        }
      }
    }

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      
      // Reset state on cleanup
      isSpacePressed.current = false
    }
  }, [voiceState, isConnected, onStartRecording, onStopRecording, error, isRecording])

  // Handle window blur to stop recording if spacebar was held
  useEffect(() => {
    const handleWindowBlur = () => {
      if (isSpacePressed.current && isRecording) {
        isSpacePressed.current = false
        onStopRecording()
      }
    }

    window.addEventListener('blur', handleWindowBlur)
    
    return () => {
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [isRecording, onStopRecording])

  return {
    isSpacePressed: isSpacePressed.current
  }
}