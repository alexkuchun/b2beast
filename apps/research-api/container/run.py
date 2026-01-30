"""
Simple startup script for local development
"""
import os
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

if __name__ == "__main__":
    # Load environment variables from .env file if it exists
    from dotenv import load_dotenv
    
    # Load .env from project root
    env_path = project_root / ".env"
    load_dotenv(env_path)
    
    import uvicorn
    
    # Get port from environment variable or default to 8000
    port = int(os.getenv("PORT", "8000"))
    
    print(f"🚀 Starting research-antihal API on http://localhost:{port}")
    print(f"📚 API docs available at http://localhost:{port}/docs")
    print(f"💚 Health check at http://localhost:{port}/health")
    print(f"🔧 Using hallbayes from: {project_root / 'src' / 'hallbayes'}")
    
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,  # Enable auto-reload in development
    )
