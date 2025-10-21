# Project Structure

## Root Level
- **package.json** - Dependencies and npm scripts
- **next.config.js** - Next.js configuration
- **tsconfig.json** - TypeScript configuration with path aliases
- **README.md** - Project documentation and setup instructions
- **.env.example/.env.local/.env.production** - Environment configuration templates

## Source Code Organization

### `/pages` - Next.js Pages Router
- **index.tsx** - Main page with dynamic imports for MatrixEffect and VoiceAssistant
- **_app.tsx** - Global app wrapper with CSS imports
- **simple-voice.tsx** - Simplified voice testing page
- **voice-test.tsx** - Voice integration testing interface

### `/components` - React Components
- **MatrixEffect.tsx** - Main Three.js component with character animation logic
  - Uses 'use client' directive for client-side rendering
  - Implements refs for Three.js scene management
  - Contains multi-language character arrays
  - Handles user interactions and performance monitoring
- **VoiceAssistant.tsx** - Complete voice interaction component
  - WebSocket-based voice services integration
  - Speech-to-text and text-to-speech functionality
  - Conversation history management
  - Matrix effect synchronization
- **VoiceButton.tsx** - Voice recording button component
  - Push-to-talk functionality
  - Visual state indicators
  - Touch and mouse event handling
- **ConfigurationProvider.tsx** - Configuration context provider

### `/hooks` - Custom React Hooks
- **useMatrixEffect.ts** - Matrix effect control and synchronization
- **useKeyboardVoice.ts** - Keyboard-based voice activation
- **useConfiguration.ts** - Configuration management

### `/config` - Configuration Management
- **index.ts** - Main configuration exports
- **voice.ts** - Voice service configuration and validation
  - WebSocket URLs and connection settings
  - Audio processing parameters
  - Visual effect parameters
  - Environment-based configuration

### `/types` - TypeScript Type Definitions
- Voice integration types and interfaces
- Configuration type definitions
- Component prop types

### `/utils` - Utility Functions
- Helper functions for voice processing
- Configuration utilities
- Error handling utilities

### `/styles` - Global Styling
- **globals.css** - Global styles with Matrix theme
  - Black background with green text (#00ff00)
  - Monospace font family (Courier New)
  - Fixed positioning for overlay elements
  - Text shadow effects for Matrix aesthetic

### `/scripts` - Utility Scripts
- **check-backend.js** - Backend service health checks
- **test-websockets.js** - WebSocket connection testing
- **validate-config.js** - Configuration validation
- **load-env.js** - Environment loading utilities

### `/mock-backend` - Development Backend
- **server.js** - Mock backend for development testing

### `/html` - Static HTML Version
- **index.html** - Standalone HTML implementation
- **matrix-effect.js** - Vanilla JavaScript version
- **README.md** - Documentation for HTML version

### `/_docs` - Documentation
- **backend-integration.md** - Backend service integration guide
- **deployment-configuration.md** - Deployment and configuration documentation

## Code Patterns

### Component Structure
- Use TypeScript interfaces for type definitions
- Implement useRef hooks for Three.js and WebSocket management
- Handle cleanup in useEffect return functions
- Use dynamic imports for Three.js and voice components to avoid SSR issues

### Voice Integration Patterns
- WebSocket connection management with reconnection logic
- State-driven UI updates based on voice interaction states
- Audio processing with proper cleanup and error handling
- Configuration-driven service endpoints and parameters

### Three.js Integration
- Scene, camera, and renderer refs stored at component level
- Character objects contain mesh, life, and animation properties
- Canvas-based texture generation for text rendering
- Proper disposal of geometries and materials for memory management
- Matrix effect synchronization with voice states

### Event Handling
- Global event listeners for keyboard and mouse interactions
- Window resize handling for responsive design
- Animation loop using requestAnimationFrame
- Voice activation through spacebar and mouse events

### Configuration Management
- Environment-based configuration with validation
- Type-safe configuration interfaces
- Runtime configuration validation
- Development vs production configuration handling