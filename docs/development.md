# Development Guide

This guide covers the development setup, architecture, and best practices for the Chessmeld unified application.

## 🛠️ Development Setup

### Prerequisites
- Node.js 18 or higher
- pnpm (recommended) or npm
- Git

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd chessmeld-unified

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Development Scripts

```bash
# Development servers
pnpm dev              # Web app on http://localhost:3000
pnpm dev:studio       # Studio app on http://localhost:4000

# Building and testing
pnpm build            # Production build
pnpm start            # Production server
pnpm test             # Run tests in watch mode
pnpm test:run         # Run tests once
pnpm lint             # Run ESLint
```

## 🏗️ Architecture Overview

### Application Structure

The unified app combines two main applications:

1. **Web App** (`/`): Interactive chess lesson player
2. **Studio App** (`/record`): Content creation and recording tools

### Core Libraries

All shared packages have been migrated to `src/lib/`:

```
src/lib/
├── cmf/              # Chess Meld Format schema & utilities
├── player/           # Interactive chess player
├── renderer-core/    # Timeline engine
├── ui/               # Shared UI components
└── annotations/      # Annotation system
```

### Component Organization

```
src/components/
├── ui/               # Base UI components (shadcn/ui)
├── GraphChessBoard.tsx
├── GraphChessBoardSimple.tsx
├── EventList.tsx
└── ...
```

## 📝 TypeScript Configuration

The project uses maximum TypeScript strictness:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Type Safety Guidelines

1. **No unchecked index access**: Always handle potential undefined values
2. **Type assertions**: Use custom type predicates for better readability
3. **Pragmatic approach**: Document when making sensible assertions

Example:
```typescript
// ❌ Avoid
const item = array[index]; // Could be undefined

// ✅ Preferred
const item = array[index];
if (!item) {
  throw new Error(`Item at index ${index} not found`);
}

// ✅ Or use type predicate
function isValidIndex<T>(array: T[], index: number): index is number {
  return index >= 0 && index < array.length;
}
```

## 🎨 Styling

### Tailwind CSS v4

The project uses Tailwind CSS v4 with CSS-first configuration:

```css
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-border: #e5e7eb;
}
```

### Component Styling

- Use Tailwind utility classes
- Follow mobile-first responsive design
- Use CSS variables for theming
- Prefer composition over custom CSS

## 🔧 Development Workflow

### File Naming Conventions

- Components: `PascalCase.tsx`
- Hooks: `useHookName.ts`
- Utilities: `kebab-case.ts`
- Types: `types.ts` or `*.type.ts`

### Import Organization

```typescript
// 1. React imports
import { useState, useEffect } from 'react';

// 2. Third-party libraries
import { Chess } from 'chess.js';

// 3. Internal libraries
import { Player } from '@/lib/player/Player';

// 4. Components
import { Button } from '@/components/ui/button';

// 5. Types
import type { MeldV0_0_1 } from '@/lib/renderer';
```

### State Management

- **Local state**: `useState`, `useReducer`
- **Global state**: Zustand stores in `src/stores/`
- **Server state**: React Query (if needed)

### Error Handling

```typescript
// ✅ Preferred: Handle errors as return values
async function loadData(): Promise<{ data?: Data; error?: string }> {
  try {
    const data = await fetchData();
    return { data };
  } catch (error) {
    return { error: error.message };
  }
}

// ✅ Use error boundaries for unexpected errors
// Implement in error.tsx and global-error.tsx
```

## 🧪 Testing

### Test Structure

```bash
src/
├── __tests__/           # Test files
├── components/
│   └── __tests__/      # Component tests
└── lib/
    └── __tests__/      # Library tests
```

### Testing Guidelines

- Unit tests for utility functions
- Integration tests for components
- E2E tests for critical user flows
- Use Vitest for unit testing
- Use Testing Library for component testing

### Example Test

```typescript
import { render, screen } from '@testing-library/react';
import { Player } from '@/lib/player/Player';

describe('Player', () => {
  it('renders chess board', () => {
    const mockMeld = createMockMeld();
    render(<Player meld={mockMeld} />);
    expect(screen.getByTestId('chess-board')).toBeInTheDocument();
  });
});
```

## 🚀 Performance

### Optimization Strategies

1. **Code Splitting**: Use dynamic imports for large components
2. **Image Optimization**: Use Next.js Image component
3. **Bundle Analysis**: Regular bundle size monitoring
4. **Lazy Loading**: Load components when needed

### Web Vitals

Monitor and optimize:
- **LCP** (Largest Contentful Paint)
- **CLS** (Cumulative Layout Shift)
- **FID** (First Input Delay)

## 🔍 Debugging

### Development Tools

- **React DevTools**: Component inspection
- **Next.js DevTools**: Built-in debugging
- **TypeScript**: Compile-time error checking
- **ESLint**: Code quality and style

### Common Issues

1. **Turbopack Issues**: Use standard Next.js dev server if needed
2. **Type Errors**: Check import paths and type definitions
3. **Build Failures**: Verify all dependencies are installed

## 📦 Dependencies

### Core Dependencies

- **Next.js 15**: React framework with App Router
- **React 19**: UI library
- **TypeScript 5**: Type safety
- **Tailwind CSS 4**: Styling
- **Chess.js**: Chess logic
- **Zustand**: State management

### Development Dependencies

- **Vitest**: Testing framework
- **ESLint**: Code linting
- **@testing-library/react**: Component testing

## 🔄 Migration Notes

This application was migrated from a monorepo structure. Key changes:

1. **Consolidated Dependencies**: All packages merged into single `package.json`
2. **Unified Imports**: Changed from `@chessmeld/*` to `@/lib/*`
3. **Simplified Deployment**: Single app instead of multiple apps
4. **Shared Components**: All UI components in single location

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
