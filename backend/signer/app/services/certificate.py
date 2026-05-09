from pathlib import Path

from pyhanko.sign import signers as pyhanko_signers

from app.config import settings

_signer: pyhanko_signers.SimpleSigner | None = None


def load_signer() -> pyhanko_signers.SimpleSigner:
    """Load the PKCS#12 signing certificate and cache it."""
    global _signer

    cert_path = Path(settings.CERT_PATH)
    if not cert_path.exists():
        raise FileNotFoundError(f"Certificate not found: {cert_path}")

    passphrase = settings.CERT_PASSWORD.encode() if settings.CERT_PASSWORD else None

    _signer = pyhanko_signers.SimpleSigner.load_pkcs12(
        pfx_file=str(cert_path),
        passphrase=passphrase,
    )
    return _signer


def get_signer() -> pyhanko_signers.SimpleSigner | None:
    """Return the cached signer instance."""
    return _signer


def get_certificate_info() -> dict:
    """Extract certificate metadata from the loaded signer."""
    if _signer is None:
        raise RuntimeError("No certificate loaded")

    cert = _signer.signing_cert

    return {
        "subject": cert.subject.human_friendly,
        "issuer": cert.issuer.human_friendly,
        "not_before": cert.not_valid_before.isoformat(),
        "not_after": cert.not_valid_after.isoformat(),
        "serial": str(cert.serial_number),
        "fingerprint": cert.sha256.hex(),
    }
