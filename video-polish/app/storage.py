import logging

import boto3
from botocore.client import Config

from app.config import settings

logger = logging.getLogger(__name__)


def _client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def upload(local_path: str, key: str) -> None:
    logger.info("[r2] upload %s → %s/%s", local_path, settings.r2_bucket, key)
    _client().upload_file(local_path, settings.r2_bucket, key)


def public_url(key: str) -> str:
    return f"{settings.r2_public_url.rstrip('/')}/{key}"


def presigned_url(key: str, expires_in: int = 300, filename: str | None = None) -> str:
    params: dict = {"Bucket": settings.r2_bucket, "Key": key}
    if filename:
        params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'
    return _client().generate_presigned_url(
        "get_object",
        Params=params,
        ExpiresIn=expires_in,
    )
