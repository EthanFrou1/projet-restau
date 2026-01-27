from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_BCRYPT_MAX_BYTES = 72

def hash_password(password: str) -> str:
    # bcrypt limite à 72 bytes => on tronque proprement
    pw = password.encode("utf-8")
    if len(pw) > _BCRYPT_MAX_BYTES:
        pw = pw[:_BCRYPT_MAX_BYTES]
    return pwd_context.hash(pw.decode("utf-8", errors="ignore"))

def verify_password(password: str, hashed_password: str) -> bool:
    pw = password.encode("utf-8")
    if len(pw) > _BCRYPT_MAX_BYTES:
        pw = pw[:_BCRYPT_MAX_BYTES]
    return pwd_context.verify(pw.decode("utf-8", errors="ignore"), hashed_password)
