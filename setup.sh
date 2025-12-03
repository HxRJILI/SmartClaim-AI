#!/bin/bash

echo "🚀 SmartClaim Setup Script"
echo "=========================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo -e "\n${BLUE}Step 1: Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js found${NC}"

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm is not installed${NC}"
    echo "Install it with: npm install -g pnpm"
    exit 1
fi
echo -e "${GREEN}✅ pnpm found${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker found${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python 3 found${NC}"

# Step 2: Install Node.js dependencies
echo -e "\n${BLUE}Step 2: Installing Node.js dependencies...${NC}"
pnpm install
echo -e "${GREEN}✅ Node.js dependencies installed${NC}"

# Step 3: Set up environment files
echo -e "\n${BLUE}Step 3: Setting up environment files...${NC}"

if [ ! -f "apps/web/.env.local" ]; then
    echo -e "${RED}⚠️  .env.local not found. Please create it from .env.local.example${NC}"
    echo "Would you like to create it now? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        cp apps/web/.env.local.example apps/web/.env.local
        echo -e "${GREEN}✅ .env.local created. Please update it with your credentials${NC}"
    fi
else
    echo -e "${GREEN}✅ .env.local exists${NC}"
fi

# Step 4: Start Supabase
echo -e "\n${BLUE}Step 4: Starting Supabase...${NC}"
pnpm run supabase:web:start

echo -e "${GREEN}✅ Supabase started${NC}"

# Step 5: Run database migrations
echo -e "\n${BLUE}Step 5: Running database migrations...${NC}"
pnpm run supabase:web:reset

echo -e "${GREEN}✅ Database migrations completed${NC}"

# Step 6: Set up Python services
echo -e "\n${BLUE}Step 6: Setting up Python services...${NC}"

cd python-services

if [ ! -f ".env" ]; then
    echo "OPENAI_API_KEY=efghijklmnop5678efghijklmnop5678efghijkl" > .env
    echo "LOG_LEVEL=info" >> .env
    echo -e "${GREEN}✅ Python .env created. Please update OPENAI_API_KEY${NC}"
fi

# Build and start Docker containers
echo "Building Docker containers..."
docker-compose up -d --build

cd ..

echo -e "${GREEN}✅ Python services started${NC}"

# Step 7: Summary
echo -e "\n${GREEN}=========================="
echo "🎉 Setup Complete!"
echo "==========================${NC}"
echo ""
echo "Services running:"
echo "  - Next.js: http://localhost:3000"
echo "  - Supabase Studio: http://localhost:54323"
echo "  - File Extractor: http://localhost:8000"
echo "  - Classifier: http://localhost:8001"
echo "  - Chat Assistant: http://localhost:8002"
echo "  - Transcriber: http://localhost:8003"
echo ""
echo "Next steps:"
echo "  1. Update apps/web/.env.local with your Supabase keys"
echo "  2. Update python-services/.env with your OpenAI API key"
echo "  3. Run: pnpm dev"
echo ""
echo "Documentation:"
echo "  - API docs: http://localhost:8000/docs"
echo ""