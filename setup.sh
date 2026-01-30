#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to compare versions
version_ge() {
    printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

# Start setup
clear
echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════╗
║                                               ║
║         B2BEAST Research App Setup            ║
║                                               ║
╚═══════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Step 1: Check Node.js
print_section "Step 1: Checking Node.js"

if ! command_exists node; then
    print_error "Node.js is not installed"
    print_info "Please install Node.js (v18.0.0 or higher) from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
REQUIRED_NODE_VERSION="18.0.0"

if version_ge "$NODE_VERSION" "$REQUIRED_NODE_VERSION"; then
    print_success "Node.js v$NODE_VERSION is installed"
else
    print_error "Node.js v$NODE_VERSION is installed, but v$REQUIRED_NODE_VERSION or higher is required"
    exit 1
fi

# Step 2: Check pnpm
print_section "Step 2: Checking pnpm"

if ! command_exists pnpm; then
    print_error "pnpm is not installed"
    print_info "Installing pnpm..."
    npm install -g pnpm
    if [ $? -ne 0 ]; then
        print_error "Failed to install pnpm"
        exit 1
    fi
    print_success "pnpm installed successfully"
else
    PNPM_VERSION=$(pnpm --version)
    print_success "pnpm v$PNPM_VERSION is installed"
fi

# Step 2.5: Check Docker
print_section "Step 2.5: Checking Docker"

if ! command_exists docker; then
    print_error "Docker is not installed"
    print_info "Please install Docker from https://www.docker.com/get-started"
    print_warning "Docker is required for Cloudflare Containers (anti-hallucination service)"
    exit 1
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is installed but not running"
    print_info "Please start Docker Desktop and run this script again"
    exit 1
fi

DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
print_success "Docker v$DOCKER_VERSION is installed and running"
print_info "Wrangler will automatically manage Cloudflare Containers for you"

# Step 3: Configure API key
print_section "Step 3: Configure OpenRouter API Key"

DEV_VARS_FILE="apps/research-api/.dev.vars"
DEV_VARS_EXAMPLE="apps/research-api/.dev.vars.example"

if [ -f "$DEV_VARS_FILE" ]; then
    print_info "API key configuration already exists at $DEV_VARS_FILE"
    read -p "$(echo -e ${YELLOW}?${NC} Do you want to reconfigure? [y/N]: )" reconfigure
    if [[ ! "$reconfigure" =~ ^[Yy]$ ]]; then
        print_info "Skipping API key configuration"
    else
        CONFIGURE_API_KEY=true
    fi
else
    CONFIGURE_API_KEY=true
fi

if [ "$CONFIGURE_API_KEY" = true ]; then
    echo ""
    print_info "You need an OpenRouter API key to use AI features"
    print_info "Get your key at: https://openrouter.ai/keys"
    echo ""

    read -p "$(echo -e ${YELLOW}?${NC} Enter your OpenRouter API key [or press Enter to skip]: )" api_key

    if [ -z "$api_key" ]; then
        print_warning "No API key provided. You'll need to add it manually later."
        print_info "Create $DEV_VARS_FILE and add: OPENROUTER_API_KEY=your-key-here"
    else
        # Create .dev.vars file
        cat > "$DEV_VARS_FILE" << EOF
OPENROUTER_API_KEY=$api_key
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
EOF
        print_success "API key configured successfully"
    fi
fi

# Step 4: Install dependencies
print_section "Step 4: Installing dependencies"

print_info "Running pnpm install..."
pnpm install

if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi

print_success "Dependencies installed successfully"

# Step 5: Initialize .wrangler folders
print_section "Step 5: Initializing Wrangler state folders"

# Check if .wrangler folders already exist
API_WRANGLER_EXISTS=false
WEB_WRANGLER_EXISTS=false

if [ -d "apps/research-api/.wrangler/state" ]; then
    API_WRANGLER_EXISTS=true
    print_info "API .wrangler folder already exists"
fi

if [ -d "apps/research-web/.wrangler/state" ]; then
    WEB_WRANGLER_EXISTS=true
    print_info "Web .wrangler folder already exists"
fi

# Initialize API .wrangler folder if needed
if [ "$API_WRANGLER_EXISTS" = false ]; then
    print_info "Creating API .wrangler folder (this will take ~10 seconds)..."
    cd apps/research-api
    timeout 10s pnpm run dev > /dev/null 2>&1 || true
    cd ../..

    if [ -d "apps/research-api/.wrangler/state" ]; then
        print_success "API .wrangler folder created"
    else
        print_warning "API .wrangler folder not created, but will be created on first dev run"
    fi
fi

# Initialize Web .wrangler folder if needed
if [ "$WEB_WRANGLER_EXISTS" = false ]; then
    print_info "Creating Web .wrangler folder (this will take ~10 seconds)..."
    cd apps/research-web
    timeout 10s pnpm run dev > /dev/null 2>&1 || true
    cd ../..

    if [ -d "apps/research-web/.wrangler/state" ]; then
        print_success "Web .wrangler folder created"
    else
        print_warning "Web .wrangler folder not created, but will be created on first dev run"
    fi
fi

# Step 6: Run database migrations
print_section "Step 6: Running database migrations"

print_info "Applying D1 database migrations locally..."
cd apps/research-api
pnpm run db:migrate:local

if [ $? -ne 0 ]; then
    print_error "Failed to run database migrations"
    print_warning "This might be because the .wrangler folder wasn't fully initialized"
    print_info "You can run this manually later: cd apps/research-api && pnpm run db:migrate:local"
    cd ../..
else
    print_success "Database migrations applied successfully"
    cd ../..
fi

# Step 7: Upload legal codes to R2
print_section "Step 7: Uploading legal codes to R2"

print_info "Uploading BGB and HGB legal codes to local R2 bucket..."
cd apps/research-api
pnpm run r2:upload-legal-codes:local

if [ $? -ne 0 ]; then
    print_error "Failed to upload legal codes"
    print_warning "This might be because the .wrangler folder wasn't fully initialized"
    print_info "You can run this manually later: cd apps/research-api && pnpm run r2:upload-legal-codes:local"
    cd ../..
else
    print_success "Legal codes uploaded successfully"
    cd ../..
fi

# Completion message
print_section "Setup Complete! 🎉"

echo ""
print_success "All setup steps completed!"
echo ""

# Check if API key was configured
if [ ! -f "$DEV_VARS_FILE" ]; then
    print_warning "OpenRouter API key not configured!"
    echo ""
    print_info "Before running the app, configure your API key:"
    echo -e "  ${YELLOW}cd apps/research-api${NC}"
    echo -e "  ${YELLOW}cp .dev.vars.example .dev.vars${NC}"
    echo -e "  ${YELLOW}# Edit .dev.vars and add your OpenRouter API key${NC}"
    echo ""
fi

print_info "Next steps:"
echo "  1. Open two terminal windows"
echo "  2. In the first terminal, run:"
echo -e "     ${GREEN}cd apps/research-api && pnpm run dev${NC}"
echo "  3. In the second terminal, run:"
echo -e "     ${GREEN}cd apps/research-web && pnpm run dev${NC}"
echo ""
print_info "The API will run on: http://localhost:8787"
print_info "The Web app will run on: http://localhost:3000"
echo ""
print_warning "If you encounter any errors with migrations or R2 uploads,"
print_warning "run the dev server for API first, then run:"
echo -e "  ${YELLOW}cd apps/research-api${NC}"
echo -e "  ${YELLOW}pnpm run db:migrate:local${NC}"
echo -e "  ${YELLOW}pnpm run r2:upload-legal-codes:local${NC}"
echo ""
