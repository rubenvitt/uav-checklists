from fastapi import HTTPException, UploadFile

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB


async def read_validated_pdf(file: UploadFile) -> bytes:
    """Read and validate an uploaded PDF file, returning raw bytes."""
    pdf_bytes = await file.read()

    if len(pdf_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 20 MB limit")

    if len(pdf_bytes) < 4 or pdf_bytes[:4] != b"%PDF":
        raise HTTPException(status_code=400, detail="File is not a valid PDF")

    return pdf_bytes
