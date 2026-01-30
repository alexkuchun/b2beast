from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import sys
from io import StringIO
import traceback

app = FastAPI(
    title="Python Executor API",
    description="API for executing Python code securely",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this based on your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CodeExecutionRequest(BaseModel):
    code: str
    timeout: Optional[int] = 30  # seconds
    context: Optional[Dict[str, Any]] = None


class CodeExecutionResponse(BaseModel):
    success: bool
    output: Optional[str] = None
    error: Optional[str] = None
    return_value: Optional[Any] = None


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Python Executor API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "python_version": sys.version,
        "platform": sys.platform
    }


@app.post("/execute", response_model=CodeExecutionResponse)
async def execute_code(request: CodeExecutionRequest):
    """
    Execute Python code and return the output.

    WARNING: This is a basic implementation. In production, you should:
    - Add proper sandboxing
    - Implement resource limits
    - Add authentication/authorization
    - Validate code before execution
    """

    # Capture stdout and stderr
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    redirected_output = StringIO()
    redirected_error = StringIO()

    try:
        # Redirect stdout and stderr
        sys.stdout = redirected_output
        sys.stderr = redirected_error

        # Prepare execution context
        exec_context = request.context or {}

        # Execute the code
        exec(request.code, exec_context)

        # Get the output
        output = redirected_output.getvalue()
        error_output = redirected_error.getvalue()

        # Check if there's a return value
        return_value = exec_context.get('__result__', None)

        return CodeExecutionResponse(
            success=True,
            output=output if output else None,
            error=error_output if error_output else None,
            return_value=return_value
        )

    except Exception as e:
        # Capture the full traceback
        error_traceback = traceback.format_exc()

        return CodeExecutionResponse(
            success=False,
            output=redirected_output.getvalue() if redirected_output.getvalue() else None,
            error=f"{str(e)}\n\n{error_traceback}"
        )

    finally:
        # Restore stdout and stderr
        sys.stdout = old_stdout
        sys.stderr = old_stderr


@app.post("/eval")
async def evaluate_expression(request: CodeExecutionRequest):
    """
    Evaluate a Python expression and return the result.
    """
    try:
        # Prepare execution context
        exec_context = request.context or {}

        # Evaluate the expression
        result = eval(request.code, exec_context)

        return CodeExecutionResponse(
            success=True,
            return_value=result
        )

    except Exception as e:
        error_traceback = traceback.format_exc()

        return CodeExecutionResponse(
            success=False,
            error=f"{str(e)}\n\n{error_traceback}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
