from typing import Any, Optional
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Optional[Any] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    content = {
        "error": {
            "code": exc.code,
            "message": exc.message,
        }
    }
    if exc.details is not None:
        content["error"]["details"] = exc.details
    return JSONResponse(status_code=exc.status_code, content=content)


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = exc.errors()
    clean_errors = []
    for err in errors:
        loc = " -> ".join([str(l) for l in err.get("loc", [])])
        msg = err.get("msg", "Validation error")
        clean_errors.append(f"{loc}: {msg}")
    
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters.",
                "details": clean_errors,
            }
        },
    )


async def generic_http_error_handler(request: Request, exc: HTTPException) -> JSONResponse:
    code = "HTTP_ERROR"
    if exc.status_code == 401:
        code = "UNAUTHENTICATED"
    elif exc.status_code == 403:
        code = "FORBIDDEN"
    elif exc.status_code == 404:
        code = "NOT_FOUND"

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": code,
                "message": str(exc.detail),
            }
        },
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Avoid leaking internal stack traces or database info in production
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred during processing. Please try again later.",
            }
        },
    )
