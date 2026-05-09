import logging

from fastapi import APIRouter, Header, HTTPException, UploadFile
from fastapi.responses import Response

from app.routes import read_validated_pdf
from app.services.signing import sign_pdf

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/sign")
async def sign(
    file: UploadFile,
    x_signer_name: str | None = Header(default=None),
    x_signer_email: str | None = Header(default=None),
):
    if file.content_type and file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="File must be a PDF")

    pdf_bytes = await read_validated_pdf(file)

    try:
        signed = await sign_pdf(
            pdf_bytes,
            signer_name=x_signer_name,
            signer_email=x_signer_email,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except ConnectionError:
        raise HTTPException(status_code=503, detail="TSA server unreachable")
    except Exception:
        logger.exception("Signing failed")
        raise HTTPException(status_code=500, detail="Signing failed")

    return Response(
        content=signed,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=signed.pdf"},
    )
