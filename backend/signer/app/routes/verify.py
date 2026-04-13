import io
import logging

from fastapi import APIRouter, HTTPException, UploadFile
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign.validation import (
    async_validate_pdf_signature,
    async_validate_pdf_timestamp,
)
from pyhanko_certvalidator import ValidationContext

from app.routes import read_validated_pdf

logger = logging.getLogger(__name__)

router = APIRouter()


def _extract_signer_name(sig) -> str:
    """Extract signer name from /Name field or certificate subject."""
    name = sig.sig_object.get("/Name")
    if name:
        return str(name)
    try:
        cert = sig.signer_cert
        cn = cert.subject.native.get("common_name")
        if cn:
            return cn
        org = cert.subject.native.get("organization_name")
        if org:
            return org
        return cert.subject.human_friendly
    except Exception:
        pass
    return "Unbekannt"


def _is_doc_timestamp(sig) -> bool:
    """Check if a signature is a document timestamp (not a user signature)."""
    try:
        return sig.sig_object.get("/Type") == "/DocTimeStamp"
    except Exception:
        return False


def _collect_trust_roots(sig) -> list:
    """Collect certificates from the signature as potential trust roots."""
    roots = []
    try:
        roots.append(sig.signer_cert)
    except Exception:
        pass
    try:
        for cert in sig.other_embedded_certs:
            roots.append(cert)
    except Exception:
        pass
    return roots


@router.post("/verify")
async def verify(file: UploadFile):
    pdf_bytes = await read_validated_pdf(file)

    try:
        reader = PdfFileReader(io.BytesIO(pdf_bytes))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid PDF file")

    embedded_sigs = list(reader.embedded_signatures)
    if not embedded_sigs:
        return {"valid": False, "signatures": []}

    signatures = []
    has_valid_signature = False
    has_any_signature = False

    for sig in embedded_sigs:
        is_timestamp = _is_doc_timestamp(sig)

        try:
            extra_roots = _collect_trust_roots(sig)
            vc = ValidationContext(
                allow_fetching=True,
                extra_trust_roots=extra_roots,
            )
            if is_timestamp:
                status = await async_validate_pdf_timestamp(sig, vc)
            else:
                status = await async_validate_pdf_signature(sig, vc)

            timestamp_dt = None
            if is_timestamp:
                ts = getattr(status, 'timestamp', None)
                if ts:
                    timestamp_dt = ts.isoformat()
            else:
                dt = getattr(status, 'signer_reported_dt', None)
                if dt:
                    timestamp_dt = dt.isoformat()

            sig_info = {
                "signer": _extract_signer_name(sig),
                "timestamp": timestamp_dt,
                "level": "Dokument-Zeitstempel" if is_timestamp else _get_pades_level(sig),
                "intact": status.intact,
                "valid": status.valid,
                "trusted": status.trusted,
                "isTimestamp": is_timestamp,
            }

            if not is_timestamp:
                has_any_signature = True
                if status.intact and status.valid:
                    has_valid_signature = True

            signatures.append(sig_info)
        except Exception:
            logger.exception("Failed to validate signature")

            # For document timestamps, a validation failure is non-critical
            if is_timestamp:
                signatures.append(
                    {
                        "signer": _extract_signer_name(sig),
                        "timestamp": None,
                        "level": "Dokument-Zeitstempel",
                        "intact": False,
                        "valid": False,
                        "trusted": False,
                        "isTimestamp": True,
                        "note": "Zeitstempel konnte nicht validiert werden",
                    }
                )
            else:
                has_any_signature = True
                signatures.append(
                    {
                        "signer": _extract_signer_name(sig),
                        "timestamp": None,
                        "level": _get_pades_level(sig),
                        "intact": False,
                        "valid": False,
                        "trusted": False,
                        "isTimestamp": False,
                    }
                )

    return {
        "valid": has_valid_signature if has_any_signature else False,
        "signatures": signatures,
    }


def _get_pades_level(sig) -> str:
    """Determine the PAdES conformance level of a signature."""
    try:
        sub_filter = sig.sig_object.get("/SubFilter")
        if sub_filter == "/ETSI.CAdES.detached":
            return "PAdES-B-LTA"
        elif sub_filter == "/adbe.pkcs7.detached":
            return "PAdES-B"
        return str(sub_filter) if sub_filter else "Unbekannt"
    except Exception:
        return "Unbekannt"
