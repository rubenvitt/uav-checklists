import io
import logging

from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.sign import signers, timestamps
from pyhanko.sign.fields import SigSeedSubFilter
from pyhanko_certvalidator import ValidationContext

from app.config import settings
from app.services.certificate import get_signer

logger = logging.getLogger(__name__)

_tsa_client: timestamps.HTTPTimeStamper | None = None


def _get_tsa_client() -> timestamps.HTTPTimeStamper:
    """Return a cached TSA client instance."""
    global _tsa_client
    if _tsa_client is None:
        _tsa_client = timestamps.HTTPTimeStamper(url=settings.TSA_URL)
    return _tsa_client


async def sign_pdf(
    pdf_bytes: bytes,
    signer_name: str | None = None,
    signer_email: str | None = None,
) -> bytes:
    """Sign a PDF with PAdES B-LTA and return the signed bytes."""
    signer = get_signer()
    if signer is None:
        raise RuntimeError("Signing certificate not loaded")

    writer = IncrementalPdfFileWriter(io.BytesIO(pdf_bytes))

    sig_metadata = signers.PdfSignatureMetadata(
        field_name="Signature",
        md_algorithm="sha256",
        subfilter=SigSeedSubFilter.PADES,
        use_pades_lta=True,
        embed_validation_info=True,
        validation_context=ValidationContext(allow_fetching=True),
        reason=f"Signed by {signer_name}" if signer_name else None,
        contact_info=signer_email,
    )

    output = await signers.async_sign_pdf(
        writer,
        sig_metadata,
        signer=signer,
        timestamper=_get_tsa_client(),
    )

    output.seek(0)
    return output.read()
