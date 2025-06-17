# Terminal Portfolio Application

## Overview

This is a full-stack web application that creates an interactive terminal-style portfolio display. The application loads portfolio data from a YAML file and presents it through a command-line interface simulation, allowing users to explore professional information through terminal commands.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with custom terminal-themed color scheme (green terminal aesthetic)
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **State Management**: React Query (TanStack Query) for server state management
- **Fonts**: JetBrains Mono for authentic terminal appearance

### Backend Architecture
- **Runtime**: Node.js 20 with TypeScript
- **Framework**: Express.js for REST API
- **Module System**: ES Modules throughout the application
- **Development**: TSX for TypeScript execution in development

### Data Layer
- **Database**: PostgreSQL 16 (configured but not yet implemented)
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Zod for runtime type validation and schema definition
- **Data Source**: YAML file containing portfolio information served via REST API

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

1. **Data Source**: Portfolio information stored in YAML format in `attached_assets/`
2. **API Layer**: Express server loads and validates YAML data on request
3. **Client Fetching**: React Query manages data fetching with caching and error handling
4. **Terminal Processing**: Custom hooks process portfolio data for terminal display
5. **Command Execution**: Users interact through terminal commands to explore data
6. **Response Rendering**: Terminal displays formatted responses with typewriter effects

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Query
- **Build Tools**: Vite, TypeScript, ESBuild for production bundling
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer

### UI and Interaction
- **Component Library**: Radix UI primitives, Shadcn/ui components
- **Form Handling**: React Hook Form with resolvers
- **Icons**: Lucide React icon library

### Backend and Data
- **Server**: Express.js with TypeScript support
- **Database**: Drizzle ORM, @neondatabase/serverless for database connectivity
- **Validation**: Zod for schema validation, Drizzle-Zod integration
- **Data Processing**: js-yaml for YAML parsing

### Development and DevOps
- **Development**: TSX for TypeScript execution, Vite plugins for Replit integration
- **Linting and Formatting**: TypeScript compiler for type checking
- **Deployment**: Configured for Replit's autoscale deployment target

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20, Web, and PostgreSQL 16 modules
- **Port Configuration**: Local port 5000 mapped to external port 80
- **Hot Reload**: Vite development server with HMR support
- **Database**: PostgreSQL instance provisioned through Replit

### Production Build
- **Frontend**: Vite builds optimized React application to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Assets**: Static assets served from build directory
- **Database Migration**: Drizzle Kit handles schema migrations

### Deployment Process
1. **Build Phase**: `npm run build` compiles both frontend and backend
2. **Production Start**: `npm run start` runs the bundled server
3. **Database Setup**: Drizzle migrations applied via `npm run db:push`
4. **Static Serving**: Express serves built React application in production

### Environment Configuration
- **Development**: Uses Vite dev server with Express API proxy
- **Production**: Single Express server serves both API and static files
- **Database**: Connection via `DATABASE_URL` environment variable

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

## User Preferences
Preferred communication style: Simple, everyday language.