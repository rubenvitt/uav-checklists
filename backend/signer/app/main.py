import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routes import certificates, health, sign, verify
from app.services.certificate import load_signer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        signer = load_signer()
        logger.info(
            "Certificate loaded: %s", signer.signing_cert.subject.human_friendly
        )
    except FileNotFoundError:
        logger.warning("No signing certificate found - service will start without it")
    except Exception:
        logger.exception("Failed to load signing certificate")
    yield


app = FastAPI(
    title="UAV Checklists PDF Signer",
    description="PAdES B-LTA PDF signing microservice",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(sign.router)
app.include_router(certificates.router)
app.include_router(verify.router)
