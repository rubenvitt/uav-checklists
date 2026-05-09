from fastapi import APIRouter

from app.services.certificate import get_signer

router = APIRouter()


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "certificate_loaded": get_signer() is not None,
    }
