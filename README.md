# Chessmeld - Unified Chess Learning Platform

A modern chess learning platform that combines interactive lessons with AI-powered content creation tools.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd chessmeld-unified

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The application will be available at:
- **Web App (Player)**: http://localhost:3000
- **Studio App (Creator)**: http://localhost:3000/record

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server (web app)
pnpm dev:studio       # Start dev server on port 4000 (studio)

# Building
pnpm build            # Build for production
pnpm start            # Start production server

# Testing
pnpm test             # Run tests
pnpm test:run         # Run tests once

# Linting
pnpm lint             # Run ESLint
```

## 📁 Project Structure

```
chessmeld-unified/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Web app (chess player)
│   │   ├── record/            # Studio app (content creation)
│   │   ├── editor/            # CMF editor
│   │   └── api/               # API routes
│   ├── lib/                   # Core libraries (migrated from packages)
│   │   ├── cmf/              # Chess Meld Format schema & utilities
│   │   ├── player/           # Interactive chess player
│   │   ├── renderer-core/    # Timeline engine
│   │   ├── ui/               # Shared UI components
│   │   └── annotations/      # Annotation system
│   ├── components/           # React components
│   │   ├── ui/              # Base UI components (shadcn/ui)
│   │   └── ...              # Feature-specific components
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API services & utilities
│   ├── stores/              # State management (Zustand)
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
├── public/                  # Static assets
│   └── examples/           # Sample CMF files
├── docs/                   # Documentation
└── vercel.json            # Deployment configuration
```

## 🎯 Features

### Web App (Chess Player)
- **Interactive Chess Lessons**: Play through structured chess lessons
- **Timeline Navigation**: Jump to any point in the lesson
- **Move History**: View and explore game variations
- **Audio Support**: Synchronized audio commentary
- **Responsive Design**: Works on desktop and mobile

### Studio App (Content Creation)
- **Audio Recording**: Record chess lessons with voice
- **AI Transcription**: Automatic speech-to-text using WhisperX
- **Move Annotation**: Add chess moves and annotations
- **CMF Export**: Generate Chess Meld Format files
- **Real-time Preview**: See your lesson as you create it

## 🏗️ Architecture

### Chess Meld Format (CMF)
The platform uses a custom JSON format for storing chess lessons:

```typescript
interface ChessmeldMeldFormatCMFV001 {
  schema: "cmf.v0.0.1"
  meta: {
    id: string
    title: string
    author: string
    // ... other metadata
  }
  events: Event[]  // Timeline of moves, text, annotations
  positions: PositionNode[]  // Chess positions
}
```

### Core Libraries

- **`@/lib/cmf`**: Schema definitions, validation, and utilities
- **`@/lib/player`**: Interactive chess player with timeline controls
- **`@/lib/renderer-core`**: Timeline engine for processing CMF files
- **`@/lib/ui`**: Shared UI components and chess board
- **`@/lib/annotations`**: Annotation system for highlighting moves

## 🚀 Deployment

### Vercel (Recommended)

The app is configured for easy Vercel deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

The `vercel.json` configuration handles:
- Build command: `next build`
- Output directory: `.next`
- Framework detection: Next.js

### Environment Variables

Create a `.env.local` file for local development:

```env
# Optional: Add any API keys or configuration
# REPLICATE_API_TOKEN=your_token_here
```

## 🧪 Development

### TypeScript Configuration
The project uses strict TypeScript with:
- `strict: true`
- `noUncheckedIndexAccess: true`
- Maximum type safety

### Code Style
- ESLint with Next.js and TypeScript rules
- Prettier for code formatting
- Functional components with hooks
- TypeScript interfaces over types

### Testing
```bash
pnpm test        # Run tests in watch mode
pnpm test:run    # Run tests once
```

## 📚 Documentation

- [API Documentation](./docs/api.md)
- [CMF Format Specification](./docs/cmf-format.md)
- [Component Library](./docs/components.md)
- [Deployment Guide](./docs/deployment.md)
- [Development Setup](./docs/development.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Check the [documentation](./docs/) for detailed guides
- Open an issue for bugs or feature requests
- Join our community discussions

---

**Note**: This application was migrated from a monorepo structure to a unified Next.js app for simplified deployment and development.