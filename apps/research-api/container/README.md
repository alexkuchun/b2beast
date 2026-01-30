# research-antihal

FastAPI backend for the b2beast research platform with hallucination risk estimation.

## Overview

This is a Python FastAPI application that provides hallucination risk estimation using the HallBayes library. It can be run locally or deployed using Docker.

## Prerequisites

1. Python 3.11 or 3.12
2. Docker and Docker Compose (for containerized deployment)
3. OpenRouter API key ([Get one here](https://openrouter.ai/keys))

## Quick Start

### Option 1: Run with Docker (Recommended)

#### 1. Set up Environment Variables

```bash
cd apps/research-antihal

# Copy the example env file
cp .env.example .env
```

Edit `.env` and add your OpenRouter API key:
```env
OPENROUTER_API_KEY=sk-or-your-actual-key-here
PORT=8000
```

#### 2. Start the Application

```bash
# Build and start with Docker Compose
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

#### 3. Stop the Application

```bash
docker-compose down
```

### Option 2: Run Locally (Development)

#### 1. Create Virtual Environment

```bash
cd apps/research-antihal

# Create venv with Python 3.11 (recommended)
python3.11 -m venv venv
# On Windows: py -3.11 -m venv venv

# Activate the virtual environment
source venv/bin/activate  # On macOS/Linux
# OR
.\venv\Scripts\activate   # On Windows
```

#### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

This will install:
- `fastapi[standard]` - Web framework
- `pydantic` - Data validation
- `uvicorn` - ASGI server
- `python-dotenv` - Environment variable management
- And dependencies for the local `hallbayes` package

#### 3. Set up Environment Variables

```bash
# Copy the example env file
cp .env.example .env
```

Edit `.env` and add your OpenRouter API key:
```env
OPENROUTER_API_KEY=sk-or-your-actual-key-here
PORT=8000
```

#### 4. Start the Development Server

**Option A: Using the run script (easiest)**
```bash
python run.py
```

**Option B: Using uvicorn directly**
```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

**Option C: Running main.py directly**
```bash
cd src
python main.py
```

This will:
- Start a local development server at `http://localhost:8000`
- Watch for file changes and automatically reload
- Show logs in real-time

## Testing the API

Once the server is running (via Docker or locally), test the endpoints:

### Via Browser

- **Interactive API docs**: http://localhost:8000/docs
- **Alternative docs**: http://localhost:8000/redoc
- **Health check**: http://localhost:8000/health

### Via Command Line

```bash
# Health check
curl http://localhost:8000/health

# Get API status
curl http://localhost:8000/api/status

# Estimate hallucination risk
curl -X POST http://localhost:8000/api/hallucinations/estimate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is the capital of France?"}'
```

### Expected Responses

**Health check:**
```json
{"status": "healthy", "service": "research-antihal"}
```

**API status:**
```json
{
  "status": "running",
  "version": "1.0.0",
  "endpoints": ["/health", "/api/hallucinations/estimate", "/api/status"]
}
```

**Hallucination estimate:**
```json
{
  "hallucination_risk": 0.0234,
  "isr": 1.456,
  "info_budget": 8.32
}
```

## Production Deployment

### Deploy with Docker

#### Build and Push to Container Registry

```bash
# Build the production image
docker build -t research-antihal:latest .

# Tag for your registry (e.g., Docker Hub, AWS ECR, Google GCR)
docker tag research-antihal:latest your-registry/research-antihal:latest

# Push to registry
docker push your-registry/research-antihal:latest
```

#### Deploy to Cloud Platform

The Docker container can be deployed to any platform that supports Docker:

- **AWS**: ECS, Fargate, or EC2
- **Google Cloud**: Cloud Run, GKE, or Compute Engine
- **Azure**: Container Instances, AKS, or App Service
- **DigitalOcean**: App Platform or Droplets
- **Heroku**: Container Registry
- **Fly.io**: Docker-based deployments

#### Environment Variables for Production

Make sure to set these environment variables in your deployment platform:

```env
OPENROUTER_API_KEY=your-production-key
PORT=8000
```

#### Example: Deploy to Fly.io

```bash
# Install flyctl
# https://fly.io/docs/hands-on/install-flyctl/

# Login
fly auth login

# Launch app
fly launch

# Set secrets
fly secrets set OPENROUTER_API_KEY=your-key-here

# Deploy
fly deploy
```

### Managing Production

**View logs (Docker):**
```bash
docker-compose logs -f
# Or with container name
docker logs -f research-antihal-api
```

**Stop/Restart:**
```bash
# With Docker Compose
docker-compose restart
docker-compose stop

# With Docker directly
docker restart research-antihal-api
docker stop research-antihal-api
```

**Update deployment:**
```bash
# Rebuild and restart
docker-compose up --build -d
```

## Project Structure

```
research-antihal/
├── src/
│   ├── main.py              # Main FastAPI application
│   └── hallbayes/           # Local HallBayes library for hallucination estimation
│       ├── __init__.py
│       ├── hallucination_toolkit.py
│       ├── htk_backends.py
│       └── ...
├── requirements.txt         # Python dependencies
├── Dockerfile              # Docker container configuration
├── docker-compose.yml      # Docker Compose configuration
├── .dockerignore          # Docker ignore rules
├── .env.example           # Example environment variables
├── .gitignore            # Git ignore rules
├── run.py                # Local development startup script
├── DOCKER_GUIDE.md       # Detailed Docker instructions
└── README.md             # This file
```

## Development

### Adding New Endpoints

Edit `src/main.py` and add your FastAPI routes:

```python
@app.get("/api/my-endpoint")
async def my_endpoint():
    return {"message": "Hello from my endpoint"}
```

### Adding Dependencies

1. Add to `requirements.txt`
2. Rebuild Docker container (if using Docker):

```bash
docker-compose up --build
```

3. Or reinstall locally:

```bash
pip install -r requirements.txt
```

### Adding Environment Variables

1. Add to `.env.example` as documentation
2. Add to your local `.env` file
3. Update `docker-compose.yml` if needed:

```yaml
environment:
  - MY_NEW_VAR=${MY_NEW_VAR}
```

4. Access in your code:

```python
import os
my_var = os.getenv("MY_NEW_VAR")
```

## Configuration

### CORS Configuration

Update the CORS settings in `src/main.py` for production:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Docker Resource Limits

Update `docker-compose.yml` to set resource limits:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

## Troubleshooting

### ModuleNotFoundError: No module named 'hallbayes'

The `hallbayes` package is a local module in `src/hallbayes/`. Make sure:
- You're running from the correct directory
- The `src/hallbayes/` folder exists
- The path setup in `src/main.py` is correct

### Port already in use

**Local development:**
```bash
# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

**Docker:**
```bash
# Change port in docker-compose.yml
ports:
  - "8001:8000"  # Use port 8001 on host
```

### Docker build fails

```bash
# Clean Docker cache
docker-compose down
docker system prune -a

# Rebuild from scratch
docker-compose up --build --force-recreate
```

### Missing OpenRouter API key

**Error:** `OPENROUTER_API_KEY not configured`

**Solution:**
1. Create `.env` file: `cp .env.example .env`
2. Edit `.env` and add your API key
3. Restart the server

### Dependencies not installing

```bash
# Clear pip cache
pip cache purge

# Reinstall
pip install --no-cache-dir -r requirements.txt
```

### Python version issues

The application requires Python 3.11 or 3.12. Check your version:
```bash
python --version
```

If wrong version, create a new venv with the correct Python version.

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Docker Documentation](https://docs.docker.com/)
- [OpenRouter API](https://openrouter.ai/docs)
- [HallBayes Library](./src/hallbayes/README.md)
- [Detailed Docker Guide](./DOCKER_GUIDE.md)

## Support

For issues specific to this application, please check the main b2beast repository issues.

For FastAPI questions, refer to the [FastAPI documentation](https://fastapi.tiangolo.com/).

For Docker questions, refer to the [Docker documentation](https://docs.docker.com/).
