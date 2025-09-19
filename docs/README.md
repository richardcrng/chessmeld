# Chessmeld Documentation

Welcome to the Chessmeld documentation! This directory contains comprehensive guides for developing, deploying, and using the Chessmeld unified chess learning platform.

## 📚 Documentation Index

### 🚀 Getting Started
- **[Development Guide](./development.md)** - Setup, architecture, and development workflow
- **[Deployment Guide](./deployment.md)** - Deploy to Vercel, Docker, AWS, and other platforms

### 🏗️ Technical Documentation
- **[CMF Format Specification](./cmf-format.md)** - Chess Meld Format schema and structure
- **[API Documentation](./api.md)** - REST API endpoints and usage
- **[Component Library](./components.md)** - UI components and design system

## 🎯 Quick Navigation

### For Developers
1. Start with the [Development Guide](./development.md) for setup and architecture
2. Review the [Component Library](./components.md) for UI development
3. Check the [CMF Format Specification](./cmf-format.md) for data structures

### For DevOps/Deployment
1. Follow the [Deployment Guide](./deployment.md) for production deployment
2. Review environment configuration and monitoring setup
3. Check CI/CD pipeline examples

### For API Integration
1. Read the [API Documentation](./api.md) for endpoint details
2. Review authentication and rate limiting
3. Check usage examples and error handling

## 🏛️ Architecture Overview

The Chessmeld unified application combines two main components:

```
┌─────────────────┐    ┌─────────────────┐
│   Web App       │    │   Studio App    │
│   (Player)      │    │   (Creator)     │
│                 │    │                 │
│ • Chess Lessons │    │ • Audio Record  │
│ • Timeline Nav  │    │ • AI Transcribe │
│ • Move History  │    │ • Move Annotate │
│ • Audio Sync    │    │ • CMF Export    │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
         ┌─────────────────────────┐
         │    Shared Libraries     │
         │                         │
         │ • CMF Schema & Utils    │
         │ • Chess Player Engine   │
         │ • Timeline Renderer     │
         │ • UI Components         │
         │ • Annotation System     │
         └─────────────────────────┘
```

## 🔧 Core Technologies

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with maximum strictness
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Chess Logic**: Chess.js
- **State Management**: Zustand
- **Testing**: Vitest + Testing Library

## 📋 Key Features

### Web App (Chess Player)
- Interactive chess lesson playback
- Timeline navigation with seek controls
- Move history and variation exploration
- Audio synchronization
- Responsive design for all devices

### Studio App (Content Creation)
- Audio recording with real-time feedback
- AI-powered speech-to-text transcription
- Chess move annotation and editing
- CMF file generation and export
- Real-time lesson preview

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd chessmeld-unified
pnpm install

# Start development
pnpm dev

# Access applications
# Web App: http://localhost:3000
# Studio: http://localhost:3000/record
```

## 📖 Migration Notes

This application was migrated from a monorepo structure to a unified Next.js app:

- **Before**: Separate `apps/web` and `apps/studio` with shared `packages/*`
- **After**: Single Next.js app with unified `src/lib/*` structure
- **Benefits**: Simplified deployment, shared components, easier maintenance

## 🤝 Contributing

1. Read the [Development Guide](./development.md) for setup
2. Follow TypeScript strictness guidelines
3. Use the component library patterns
4. Test your changes thoroughly
5. Update documentation as needed

## 🆘 Support

- Check the relevant documentation section
- Review common issues in deployment guide
- Open an issue for bugs or feature requests
- Join community discussions

## 📄 License

This project is licensed under the MIT License. See the main [README](../README.md) for details.

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Status**: Production Ready
