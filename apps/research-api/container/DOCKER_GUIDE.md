# Docker Setup Guide for research-antihal

This guide covers running the research-antihal API using Docker.

## Prerequisites

1. Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
2. Docker Compose (included with Docker Desktop)
3. OpenRouter API key ([Get one here](https://openrouter.ai/keys))

## Quick Start

### 1. Set up Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and add your OpenRouter API key:

```env
OPENROUTER_API_KEY=sk-or-your-actual-key-here
PORT=8000
```

### 2. Run with Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

The API will be available at:
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### 3. Stop the Container

```bash
docker-compose down
```

## Alternative: Run with Docker Only

If you prefer not to use Docker Compose:

```bash
# Build the image
docker build -t research-antihal .

# Run the container
docker run -p 8000:8000 --env-file .env research-antihal

# Or with inline environment variables
docker run -p 8000:8000 -e OPENROUTER_API_KEY=your-key-here research-antihal
```

## Local Development (Without Docker)

### 1. Create Virtual Environment

```bash
# Create venv with Python 3.11
python3.11 -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Set up Environment

```bash
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY
```

### 4. Run the Server

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

## Testing the API

### Health Check
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "healthy", "service": "research-antihal"}
```

### API Status
```bash
curl http://localhost:8000/api/status
```

### Estimate Hallucinations
```bash
curl -X POST http://localhost:8000/api/hallucinations/estimate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is the capital of France?"}'
```

### Interactive API Documentation

Visit http://localhost:8000/docs in your browser for interactive API documentation with Swagger UI.

## Production Deployment

### Environment Variables

For production, configure these environment variables:

- `OPENROUTER_API_KEY`: Your OpenRouter API key (required)
- `PORT`: Port to run the server on (default: 8000)

### CORS Configuration

Update CORS settings in `src/main.py` for production:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Deploy to Container Registry

```bash
# Tag the image
docker tag research-antihal your-registry/research-antihal:latest

# Push to registry
docker push your-registry/research-antihal:latest
```

## Troubleshooting

### Container won't start

Check logs:
```bash
docker-compose logs -f
```

### Port already in use

Change the port in `.env` or in `docker-compose.yml`:
```yaml
ports:
  - "8001:8000"  # Use port 8001 on host
```

### API key not working

Make sure your `.env` file is in the correct location and contains the correct API key:
```bash
cat .env
```

### Health check failing

Check if the application is running:
```bash
docker ps
docker logs research-antihal-api
```

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Docker Documentation](https://docs.docker.com/)
- [OpenRouter API](https://openrouter.ai/docs)
