# Implementation Plan

- [x] 1. Set up voice integration infrastructure
  - Create TypeScript interfaces for voice services and state management
  - Set up WebSocket connection utilities with error handling and reconnection logic
  - Create audio processing utilities for MediaRecorder and AudioContext management
  - _Requirements: 3.3, 4.1, 4.5_

- [x] 2. Implement AudioManager service
  - [x] 2.1 Create audio capture functionality with MediaRecorder API
    - Implement microphone access and permission handling
    - Set up PCM16 audio format configuration for backend compatibility
    - Add audio data streaming capabilities for real-time processing
    - _Requirements: 4.1, 4.2_

  - [x] 2.2 Implement audio playback system
    - Create AudioContext management for TTS audio playback
    - Implement audio buffer management for streaming audio chunks
    - Add hex-to-Uint8Array conversion for backend audio data format
    - _Requirements: 4.3, 4.4_

  - [ ]* 2.3 Write unit tests for AudioManager
    - Test audio capture start/stop functionality
    - Test audio format conversion and streaming
    - Test audio playback and buffer management
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3. Create WebSocket communication layer
  - [x] 3.1 Implement WebSocketManager service
    - Create WebSocket connection management for STT, TTS, and Chat services
    - Implement connection lifecycle handling with automatic reconnection
    - Add message routing and event handling for different service types
    - _Requirements: 3.3, 4.2_

  - [x] 3.2 Implement STT WebSocket integration
    - Create STT WebSocket connection and audio streaming
    - Handle STT lifecycle messages (start, audio chunks, stop, transcription)
    - Implement error handling and connection recovery for STT service
    - _Requirements: 4.2, 3.3_

  - [x] 3.3 Implement Chat WebSocket integration
    - Create Chat WebSocket connection for conversation management
    - Implement message sending with conversation context
    - Handle streaming chat responses and completion detection
    - _Requirements: 3.1, 3.2_

  - [x] 3.4 Implement TTS WebSocket integration
    - Create TTS WebSocket connection for audio response generation
    - Handle TTS audio chunk streaming and completion detection
    - Implement audio data buffering for seamless playback
    - _Requirements: 4.3, 4.4_

  - [ ]* 3.5 Write integration tests for WebSocket services
    - Test WebSocket connection establishment and error handling
    - Test audio streaming and response processing
    - Test conversation flow and multi-turn dialogue
    - _Requirements: 3.3, 4.2, 4.3_

- [x] 4. Create conversation state management
  - [x] 4.1 Implement ConversationState manager
    - Create conversation history data structure and management
    - Implement conversation context generation for multi-turn dialogue
    - Add conversation persistence and state management
    - _Requirements: 3.1, 3.2_

  - [ ]* 4.2 Write unit tests for conversation management
    - Test conversation history management and context generation
    - Test multi-turn conversation flow
    - _Requirements: 3.1, 3.2_

- [x] 5. Create VoiceButton component
  - [x] 5.1 Implement voice button UI component
    - Create circular button component with positioning at bottom center
    - Implement visual states for idle, recording, processing, and playing
    - Add mouse and touch event handling for voice activation
    - _Requirements: 1.5, 1.3_

  - [x] 5.2 Add keyboard interaction support
    - Implement spacebar key detection for voice activation
    - Handle key press and release events for recording control
    - Add keyboard event cleanup and proper event handling
    - _Requirements: 1.2, 1.4_

  - [ ]* 5.3 Write component tests for VoiceButton
    - Test button rendering and visual state changes
    - Test mouse and keyboard interaction handling
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6. Enhance MatrixEffect with voice integration
  - [x] 6.1 Add voice state management to MatrixEffect
    - Integrate voice interaction state into existing MatrixEffect component
    - Create voice state hooks and event handlers
    - Connect voice button events to recording functionality
    - _Requirements: 1.1, 1.2, 1.4_

  - [x] 6.2 Implement dynamic visual effects
    - Add dynamic font size proportion control based on voice state
    - Implement speed multiplier adjustment for voice interaction feedback
    - Create smooth transitions between normal and voice-active visual states
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 6.3 Integrate voice services with visual feedback
    - Connect voice recording states to visual effect changes
    - Implement visual feedback during audio processing and playback
    - Add error state visual indicators
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 6.4 Write integration tests for enhanced MatrixEffect
    - Test voice state integration with visual effects
    - Test visual effect transitions and performance
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7. Implement complete voice interaction flow
  - [x] 7.1 Wire up end-to-end voice interaction
    - Connect voice button to audio recording and WebSocket services
    - Implement complete STT → Chat → TTS pipeline
    - Add conversation history integration and multi-turn support
    - _Requirements: 1.1, 1.4, 3.1, 3.2, 4.2, 4.3, 4.4_

  - [x] 7.2 Add error handling and recovery
    - Implement comprehensive error handling for all voice services
    - Add connection retry logic and graceful degradation
    - Create user feedback for error states and recovery
    - _Requirements: 3.3, 3.4_

  - [ ]* 7.3 Write end-to-end integration tests
    - Test complete voice interaction workflow
    - Test error handling and recovery scenarios
    - Test multi-turn conversation functionality
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.2, 4.3, 4.4_

- [x] 8. Add configuration and environment setup
  - [x] 8.1 Create environment configuration
    - Add backend service URL configuration
    - Create WebSocket endpoint configuration
    - Add audio processing configuration options
    - _Requirements: 3.3_

  - [x] 8.2 Add development and production configurations
    - Set up development environment with local backend
    - Create production configuration with proper CORS and security
    - Add configuration validation and error handling
    - _Requirements: 3.3_