"""
research-antihal: FastAPI backend
"""
import os
import sys
from pathlib import Path

# Add the src directory to Python path to find hallbayes module
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from hallbayes import OpenAIItem, OpenAIPlanner
from hallbayes.htk_backends import OpenRouterBackend
from pydantic import BaseModel

# Create FastAPI app
app = FastAPI(
    title="Research Antihal API",
    description="Backend API for research-antihal",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this based on your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "research-antihal"}


# Example data model
class ResearchQuery(BaseModel):
    prompt: str
    api_key: str  # API key passed in request body



@app.post("/api/hallucinations/estimate")
async def estimate_hallucinations(body: ResearchQuery):
    # Get API key from request body
    print(f"[Antihal] Received request with api_key present: {bool(body.api_key)}")
    print(f"[Antihal] API key starts with: {body.api_key[:10] if body.api_key else 'None'}...")

    api_key = body.api_key
    if not api_key:
        raise HTTPException(status_code=400, detail="api_key is required in request body")
    
    backend = OpenRouterBackend(
        model="google/gemini-2.5-flash-lite",
        http_referer="https://github.com/leochlon/hallbayes",
        x_title="HallBayes Test Script",
        api_key=api_key
    )
    planner = OpenAIPlanner(backend, temperature=0.3)

    item = OpenAIItem(
        prompt=body.prompt,
        n_samples=3,
        m=4,
        skeleton_policy="closed_book"
    )

    metrics = planner.run(
        [item], 
        h_star=0.05,           # Target 5% hallucination max
        isr_threshold=1.0,     # Standard ISR gate
        margin_extra_bits=0.2, # Safety margin
        B_clip=12.0,          # Clipping bound
        clip_mode="one-sided" # Conservative mode
    )

    for m in metrics:
        print("\n" + "="*60)
        print(f"Decision: {'✅ ANSWER' if m.decision_answer else '⛔ REFUSE'}")
        print(f"Hallucination Risk: {m.roh_bound*100:.2f}% (max bound)")
        print(f"ISR (Info Sufficiency Ratio): {m.isr:.3f}")
        print(f"Information Budget (Δ̄): {m.delta_bar:.2f} nats")
        print(f"Bits to Trust (B2T): {m.b2t:.3f} nats")
        print(f"Prior Probability (avg): {m.q_avg:.3f}")
        print(f"Prior Probability (conservative): {m.q_conservative:.3f}")
        if m.rationale:
            print(f"\nRationale: {m.rationale}")
        print("="*60)
    return {
        "hallucination_risk": m.roh_bound,
        "isr": m.isr,
        "info_budget": m.delta_bar
    }


# Example GET endpoint
@app.get("/api/status")
async def get_status():
    """Get API status"""
    return {
        "status": "running",
        "version": "1.0.0",
        "endpoints": [
            "/health",
            "/api/hallucinations/estimate",
            "/api/status"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment variable or default to 8000
    port = int(os.getenv("PORT", "8000"))
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,  # Enable auto-reload in development
    )
