from fastapi import HTTPException, status

def auth_error(code: str, message: str, status_code=status.HTTP_401_UNAUTHORIZED):
    raise HTTPException(
        status_code=status_code,
        detail={
            "error": code,
            "message": message,
        },
    )
