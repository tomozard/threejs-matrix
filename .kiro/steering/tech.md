# Technology Stack

## Framework & Runtime
- **Next.js 14.2.0** - React framework with SSR/SSG capabilities
- **React 18** - Component library with hooks
- **TypeScript 5** - Type-safe JavaScript with strict mode enabled
- **Node.js** - Runtime environment

## 3D Graphics & Animation
- **Three.js 0.157.0** - WebGL 3D library for character rendering and animations
- **WebGL** - Hardware-accelerated graphics rendering
- **Canvas API** - Dynamic text texture generation

## Development Tools
- **ESLint** - Code linting with Next.js configuration
- **TypeScript compiler** - Type checking and compilation

## Build System & Commands

### Development
```bash
npm run dev          # Start development server on localhost:3000
```

### Production
```bash
npm run build        # Build optimized production bundle
npm start            # Start production server
```

### Code Quality
```bash
npm run lint         # Run ESLint for code quality checks
```

## Configuration
- **next.config.js** - Next.js configuration with React strict mode
- **tsconfig.json** - TypeScript configuration with strict settings and path aliases
- **Path aliases** - `@/*` maps to project root for cleaner imports

## Performance Considerations
- Dynamic imports used for Three.js components to avoid SSR issues
- Canvas texture generation for character rendering
- RequestAnimationFrame for smooth 60fps animations
- Geometry and material disposal for memory management