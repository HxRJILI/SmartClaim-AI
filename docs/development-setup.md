# Development Setup

Guide for authorized developers to set up the development environment.

## Prerequisites

- Node.js 20.x+
- pnpm 9.x+
- Python 3.11+
- Docker
- Git

## Clone Repository

```bash
git clone https://github.com/WE2722/SmartClaim_AI.git
cd SmartClaim_AI
```

## Install Dependencies

```bash
# Node.js dependencies
pnpm install

# Python dependencies
cd python-services
pip install -r chat/requirements.txt
pip install -r classifier/requirements.txt
pip install -r extractor/requirements.txt
pip install -r transcriber/requirements.txt
```

## Environment Setup

```bash
# Copy environment files
cp apps/web/.env.example apps/web/.env.local
cp python-services/.env.example python-services/.env

# Edit with development values
```

## Start Development

### Frontend

```bash
pnpm dev
```

### AI Services

```bash
cd python-services
docker-compose up -d
```

### Database

```bash
npx supabase start
```

## Code Structure

```
SmartClaim-AI/
├── apps/
│   └── web/           # Next.js frontend
├── packages/
│   ├── features/      # Feature modules
│   ├── ui/            # UI components
│   └── shared/        # Shared utilities
├── python-services/   # AI microservices
├── supabase/          # Database migrations
└── docs/              # Documentation
```

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm lint` | Run linter |
| `pnpm test` | Run tests |
| `pnpm typecheck` | Run type checking |
