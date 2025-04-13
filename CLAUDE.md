# Development Guidelines for Dashboard App

## Build & Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run start` - Alias for `npm run dev`

## Code Style Guidelines

### Structure & Naming
- React components: PascalCase (e.g., `StatsCard.jsx`)
- Utility files: camelCase (e.g., `csvParser.js`)
- Components in `/src/components/`, UI components in `/ui/` subdirectory
- Utilities in `/src/utils/`, shared functions in `/src/lib/`

### JavaScript & React Patterns
- Functional components with arrow function syntax
- Props destructuring in parameters
- Default exports for components
- Modern JS features (destructuring, optional chaining)
- State management with React hooks
- Try/catch for error handling with user-friendly messages

### Styling
- TailwindCSS for all styling
- Use `cn()` utility for conditional class merging
- Follow color scheme defined in `tailwind.config.js`
- Responsive design with Tailwind breakpoint utilities

### Imports
- Use absolute imports with aliases (e.g., `@/components/ui/button`)
- Group imports by type: React, components, utilities, styles