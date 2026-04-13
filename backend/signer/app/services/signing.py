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


def _build_validation_context(signer: signers.SimpleSigner) -> ValidationContext:
    """Build a ValidationContext that trusts the signing certificate.

    Uses extra_trust_roots to ADD the signing cert without replacing the
    system CA store — this is critical because the TSA certificate chain
    (e.g. DigiCert) needs the system root CAs for validation.
    """
    extra_roots = [signer.signing_cert]
    if signer.cert_registry:
        for cert in signer.cert_registry:
            if cert.ca:
                extra_roots.append(cert)
    return ValidationContext(
        extra_trust_roots=extra_roots,
        allow_fetching=True,
    )


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
        validation_context=_build_validation_context(signer),
        name=signer_name or None,
        reason=f"Signiert von {signer_name}" if signer_name else None,
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
