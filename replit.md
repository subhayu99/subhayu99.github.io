# Terminal Portfolio PWA Application

## Overview

This is a frontend-only Progressive Web App that creates an interactive terminal-style portfolio display. The application loads portfolio data from a static JSON file and presents it through a command-line interface simulation, allowing users to explore professional information through terminal commands. Features offline support, app installation capability, and responsive design.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with custom terminal-themed color scheme (green terminal aesthetic)
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **State Management**: React Query (TanStack Query) for data fetching and caching
- **Fonts**: JetBrains Mono for authentic terminal appearance
- **PWA**: Progressive Web App with service worker, offline support, and installability

### Data Layer
- **Schema**: Zod for runtime type validation and schema definition
- **Data Source**: Static JSON file containing portfolio information
- **Caching**: Service worker caches static assets and data for offline functionality

## Key Components

### Terminal Interface (`client/src/components/Terminal.tsx`)
- Interactive command-line interface with command history
- Auto-complete and suggestion system
- Typewriter effects for realistic terminal experience
- Custom terminal hooks for command processing

### Portfolio Data Management
- **Schema Definition**: Comprehensive portfolio schema including personal info, experience, education, projects, and publications
- **Data Loading**: YAML parser with validation against Zod schemas
- **API Endpoint**: `/api/portfolio` serves validated portfolio data
- **Type Safety**: Full TypeScript coverage from data loading to UI rendering

### UI Component System
- **Design System**: Terminal-themed with green-on-black color scheme
- **Component Library**: Full Shadcn/ui implementation with custom styling
- **Responsive Design**: Mobile-first approach with terminal-appropriate breakpoints

## Data Flow

1. **Data Source**: Portfolio information stored in JSON format in `client/public/data/`
2. **Client Fetching**: React Query manages data fetching from static JSON with caching and error handling
3. **Terminal Processing**: Custom hooks process portfolio data for terminal display
4. **Command Execution**: Users interact through terminal commands to explore data
5. **Response Rendering**: Terminal displays formatted responses with typewriter effects
6. **Offline Support**: Service worker caches data for offline functionality

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Query
- **Build Tools**: Vite, TypeScript, ESBuild for production bundling
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer

### UI and Interaction
- **Component Library**: Radix UI primitives, Shadcn/ui components
- **Form Handling**: React Hook Form with resolvers
- **Icons**: Lucide React icon library

### Data and Validation
- **Validation**: Zod for schema validation and runtime type checking
- **Data Processing**: Static JSON loading with schema validation

### Development and DevOps
- **Development**: TSX for TypeScript execution, Vite plugins for Replit integration
- **Linting and Formatting**: TypeScript compiler for type checking
- **Deployment**: Configured for Replit's autoscale deployment target

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20 and Web modules
- **Port Configuration**: Local port 5173 mapped to external port 80
- **Hot Reload**: Vite development server with HMR support

### Production Build
- **Frontend**: Vite builds optimized React application to `dist-frontend/`
- **Assets**: Static assets and data served from build directory
- **PWA**: Service worker enables offline functionality and app installation

### Deployment Process
1. **Build Phase**: `npm run build` compiles frontend-only application
2. **Production Start**: `npm run preview` serves the built application
3. **Static Serving**: Vite preview server serves the complete PWA

### Environment Configuration
- **Development**: Vite dev server with frontend-only configuration
- **Production**: Static file serving with PWA capabilities
- **Data**: Portfolio data loaded from static JSON file

## Changelog
- June 16, 2025. Initial setup with terminal portfolio interface
- June 16, 2025. Added responsive design optimizations for mobile, tablet, and desktop devices

## Recent Changes
- Enhanced terminal interface with responsive breakpoints for different screen sizes
- Optimized font sizes: 16px desktop, 14px tablet (768px), 12px mobile (480px)
- Added mobile-friendly ASCII art with simplified version for small screens
- Improved command input area with better touch interaction
- Enhanced scrolling with touch support and smaller scrollbars on mobile
- Reduced terminal effects intensity on mobile devices for better performance
- Made terminal header responsive with smaller elements on mobile
- Fixed UX issues: click anywhere to focus input, clickable links throughout, improved help formatting
- Implemented markdown-style link rendering with data attributes for better compatibility
- Enhanced visual hierarchy with icons, dividers, and improved color scheme in help and contact commands
- Converted to frontend-only PWA application with service worker for offline support
- Added app installation capability and removed server dependencies
- Migrated from Express API to static JSON data loading

## User Preferences
Preferred communication style: Simple, everyday language.