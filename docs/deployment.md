# Deployment

Production deployment guide for SmartClaim AI.

## Deployment Options

### Docker Compose (Recommended)
Full containerized deployment

### Manual Deployment
Individual service deployment

### Cloud Platforms
- Vercel (Frontend)
- Railway / Render (AI Services)
- Supabase Cloud (Database)

## Docker Deployment

### Build Images

```bash
# Build all services
docker-compose -f docker-compose.prod.yml build
```

### Start Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables

Set production environment variables:

```bash
# Create .env.production
cp .env.example .env.production

# Edit with production values
nano .env.production
```

## Vercel Deployment

### Frontend

1. Connect GitHub repository
2. Configure environment variables
3. Deploy

### Environment Variables

Set in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_AI_SERVICE_URL`

## AI Services Deployment

### Railway

1. Create new project
2. Connect repository
3. Configure services
4. Set environment variables

### Render

1. Create new web services
2. Connect repository
3. Configure each service
4. Set environment variables

## Database Setup

### Supabase Cloud

1. Create project at supabase.com
2. Run migrations
3. Configure RLS policies
4. Update environment variables

## SSL/TLS

Ensure all connections use HTTPS:
- Frontend: Vercel provides SSL
- AI Services: Use reverse proxy with SSL
- Database: Supabase provides SSL

## Monitoring

### Health Checks

Configure health check endpoints:
- Frontend: `/api/health`
- AI Services: `/health`

### Logging

Enable structured logging:
- Application logs
- AI service logs
- Database query logs

### Alerts

Configure alerts for:
- Service downtime
- High error rates
- SLA breaches
