from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    CERT_PATH: str = "/certs/signing.p12"
    CERT_PASSWORD: str = ""
    TSA_URL: str = "http://timestamp.digicert.com"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    model_config = {"env_prefix": "SIGNER_"}


settings = Settings()
