import { useRef, useCallback } from 'react'

interface MatrixEffectControl {
  setSpeed: (speed: number) => void
  startSmoothPulse: () => void
  endSmoothPulse: () => void
  resetSpeed: () => void
}

// Global reference to matrix effect controls
let matrixEffectControl: MatrixEffectControl | null = null

export const useMatrixEffectControl = () => {
  const speedMultiplierRef = useRef(0.5)
  const originalSpeedRef = useRef(0.5)
  const animationFrameRef = useRef<number>()
  const isAnimatingRef = useRef(false)

  const setSpeed = useCallback((speed: number) => {
    speedMultiplierRef.current = speed
  }, [])

  const animateSpeed = useCallback((fromSpeed: number, toSpeed: number, duration: number, onComplete?: () => void) => {
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Smooth easing function (ease-in-out)
      const easeInOut = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2
      
      const currentSpeed = fromSpeed + (toSpeed - fromSpeed) * easeInOut
      speedMultiplierRef.current = currentSpeed
      
      if (progress < 1 && isAnimatingRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        speedMultiplierRef.current = toSpeed
        if (onComplete) onComplete()
      }
    }
    
    animate()
  }, [])

  const startSmoothPulse = useCallback(() => {
    // Cancel any existing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    isAnimatingRef.current = true
    
    // Animate from current speed to 1.5 over 800ms
    animateSpeed(speedMultiplierRef.current, 1.5, 800)
  }, [animateSpeed])

  const endSmoothPulse = useCallback(() => {
    // Cancel any existing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    isAnimatingRef.current = true
    
    // Animate from current speed back to original over 1200ms
    animateSpeed(speedMultiplierRef.current, originalSpeedRef.current, 1200, () => {
      isAnimatingRef.current = false
    })
  }, [animateSpeed])

  const resetSpeed = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    isAnimatingRef.current = false
    speedMultiplierRef.current = originalSpeedRef.current
  }, [])

  // Register this control globally
  const registerControl = useCallback(() => {
    matrixEffectControl = {
      setSpeed,
      startSmoothPulse,
      endSmoothPulse,
      resetSpeed
    }
    return speedMultiplierRef
  }, [setSpeed, startSmoothPulse, endSmoothPulse, resetSpeed])

  return {
    speedMultiplierRef,
    registerControl,
    setSpeed,
    startSmoothPulse,
    endSmoothPulse,
    resetSpeed
  }
}

// Hook for VoiceAssistant to control matrix effect
export const useMatrixEffectTrigger = () => {
  const triggerRecordingMode = useCallback(() => {
    if (matrixEffectControl) {
      matrixEffectControl.setSpeed(0.2)
    }
  }, [])

  const triggerAIResponse = useCallback(() => {
    if (matrixEffectControl) {
      matrixEffectControl.startSmoothPulse()
    }
  }, [])

  const resetToNormal = useCallback(() => {
    if (matrixEffectControl) {
      matrixEffectControl.endSmoothPulse()
    }
  }, [])

  return {
    triggerRecordingMode,
    triggerAIResponse,
    resetToNormal
  }
}