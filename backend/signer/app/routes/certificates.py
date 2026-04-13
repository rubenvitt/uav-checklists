from fastapi import APIRouter, HTTPException

from app.services.certificate import get_certificate_info

router = APIRouter()


@router.get("/certificates")
async def certificates():
    try:
        info = get_certificate_info()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="No certificate loaded")
    return info
