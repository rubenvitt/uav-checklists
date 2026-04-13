import io
import logging

from fastapi import APIRouter, HTTPException, UploadFile
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign.validation import validate_pdf_signature
from pyhanko_certvalidator import ValidationContext

from app.routes import read_validated_pdf

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/verify")
async def verify(file: UploadFile):
    pdf_bytes = await read_validated_pdf(file)

    try:
        reader = PdfFileReader(io.BytesIO(pdf_bytes))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid PDF file")

    embedded_sigs = reader.embedded_signatures
    if not embedded_sigs:
        return {"valid": False, "signatures": []}

    signatures = []
    all_valid = True

    for sig in embedded_sigs:
        try:
            vc = ValidationContext(allow_fetching=True)
            status = validate_pdf_signature(sig, vc)

            name = sig.sig_object.get("/Name")
            sig_info = {
                "signer": str(name) if name else "Unknown",
                "timestamp": (
                    status.signer_reported_dt.isoformat()
                    if status.signer_reported_dt
                    else None
                ),
                "level": _get_sig_level(sig),
                "intact": status.intact,
                "valid": status.valid,
                "trusted": status.trusted,
            }

            if not status.valid:
                all_valid = False

            signatures.append(sig_info)
        except Exception:
            logger.exception("Failed to validate signature")
            signatures.append(
                {
                    "signer": "Unknown",
                    "timestamp": None,
                    "level": "Unknown",
                    "intact": False,
                    "valid": False,
                    "trusted": False,
                }
            )
            all_valid = False

    return {"valid": all_valid, "signatures": signatures}


def _get_sig_level(sig) -> str:
    """Determine the PAdES conformance level of a signature."""
    try:
        sub_filter = sig.sig_object.get("/SubFilter")
        if sub_filter == "/ETSI.CAdES.detached":
            if sig.sig_object.get("/Type") == "/DocTimeStamp":
                return "PAdES-T"
            return "PAdES-B-LTA"
        elif sub_filter == "/adbe.pkcs7.detached":
            return "PAdES-B"
        return str(sub_filter) if sub_filter else "Unknown"
    except Exception:
        return "Unknown"
