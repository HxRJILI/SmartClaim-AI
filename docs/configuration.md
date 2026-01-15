# Configuration

SmartClaim AI configuration options.

## Environment Variables

### Application

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Yes |
| `NEXT_PUBLIC_AI_SERVICE_URL` | AI service base URL | Yes |

### AI Services

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_API_KEY` | Gemini API key | Yes |
| `OPENROUTER_API_KEY` | OpenRouter API key | Yes |
| `QDRANT_URL` | Qdrant URL | Yes |
| `QDRANT_API_KEY` | Qdrant API key | Yes |

### Feature Flags

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_ENABLE_SMARTCLAIM` | Enable SmartClaim | true |
| `ENABLE_VOICE_INPUT` | Enable voice input | true |
| `ENABLE_IMAGE_UPLOAD` | Enable image upload | true |

## Configuration Files

### apps/web/.env.local
Main application configuration

### python-services/.env
AI services configuration

### supabase/config.toml
Local Supabase configuration

## Customization

### Categories
Edit classification categories in:
`packages/features/smartclaim/src/config.ts`

### Priorities
Edit priority levels in:
`packages/features/smartclaim/src/config.ts`

### SLA Rules
Edit SLA rules in:
`python-services/sla/config.py`
