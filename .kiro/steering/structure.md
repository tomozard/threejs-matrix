# Project Structure

## Root Level
- **package.json** - Dependencies and npm scripts
- **next.config.js** - Next.js configuration
- **tsconfig.json** - TypeScript configuration with path aliases
- **README.md** - Project documentation and setup instructions

## Source Code Organization

### `/pages` - Next.js Pages Router
- **index.tsx** - Main page with dynamic MatrixEffect import (SSR disabled)
- **_app.tsx** - Global app wrapper with CSS imports

### `/components` - React Components
- **MatrixEffect.tsx** - Main Three.js component with character animation logic
  - Uses 'use client' directive for client-side rendering
  - Implements refs for Three.js scene management
  - Contains multi-language character arrays
  - Handles user interactions and performance monitoring

### `/styles` - Global Styling
- **globals.css** - Global styles with Matrix theme
  - Black background with green text (#00ff00)
  - Monospace font family (Courier New)
  - Fixed positioning for overlay elements
  - Text shadow effects for Matrix aesthetic

### `/html` - Static HTML Version
- **index.html** - Standalone HTML implementation
- **matrix-effect.js** - Vanilla JavaScript version
- **README.md** - Documentation for HTML version

### `/_docs` - Documentation
- **backend-integration.md** - Backend service integration guide

## Code Patterns

### Component Structure
- Use TypeScript interfaces for type definitions
- Implement useRef hooks for Three.js object management
- Handle cleanup in useEffect return functions
- Use dynamic imports for Three.js components to avoid SSR issues

### Three.js Integration
- Scene, camera, and renderer refs stored at component level
- Character objects contain mesh, life, and animation properties
- Canvas-based texture generation for text rendering
- Proper disposal of geometries and materials for memory management

### Event Handling
- Global event listeners for keyboard and mouse interactions
- Window resize handling for responsive design
- Animation loop using requestAnimationFrame