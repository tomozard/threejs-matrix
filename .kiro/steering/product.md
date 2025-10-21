# Product Overview

Matrix Effect is a Next.js web application that creates an interactive Matrix-style digital rain effect using Three.js, enhanced with AI voice integration capabilities. The application features multi-language character support and real-time voice interaction with AI assistants.

## Key Features
- Real-time animated character rain effect with WebGL rendering
- Multi-language character sets (8 languages + symbols)
- AI Voice Assistant with speech-to-text and text-to-speech
- Interactive visual effects that respond to voice activity
- Real-time performance statistics display
- Responsive design that adapts to screen size
- Variable character sizes and fade effects

## Voice Integration Features
- Push-to-talk voice recording (spacebar or mouse button)
- Real-time speech-to-text transcription
- AI conversation with LLM integration
- Text-to-speech audio responses
- Visual matrix effects synchronized with voice states
- Conversation history and management

## User Interactions
### Matrix Controls
- Mouse click: Toggle between normal (1x) and fast (3x) speed
- Arrow keys: Increase/decrease speed incrementally
- Automatic column generation based on screen width

### Voice Controls
- Spacebar (hold): Record voice input
- Mouse button (hold): Alternative voice recording method
- Voice Assistant UI: Expandable conversation interface

## Visual States
- Normal: Standard matrix rain effect
- Recording: Slower, red-tinted effect during voice input
- Processing: Animated effect during AI processing
- AI Response: Pulsing effect during audio playback

## Technical Focus
This is a comprehensive demonstration project showcasing Three.js integration with React/Next.js for creating smooth, performant animations with complex character rendering, real-time user interaction, and AI voice integration through WebSocket connections.