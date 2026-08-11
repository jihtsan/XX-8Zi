from pathlib import Path, PurePosixPath
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from .config import get_settings

IMAGE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def media_url(storage_key: str | None) -> str | None:
    if not storage_key:
        return None
    return f"/media/{storage_key}"


def media_root() -> Path:
    root = get_settings().media_path
    root.mkdir(parents=True, exist_ok=True)
    return root


def resolve_storage_key(storage_key: str) -> Path:
    key = PurePosixPath(storage_key)
    if key.is_absolute() or ".." in key.parts or not key.parts:
        raise ValueError("无效的图片存储路径")
    root = media_root()
    target = (root / Path(*key.parts)).resolve()
    if root not in target.parents:
        raise ValueError("无效的图片存储路径")
    return target


def _matches_signature(content_type: str, data: bytes) -> bool:
    if content_type == "image/jpeg":
        return data.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return data.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/webp":
        return len(data) >= 12 and data.startswith(b"RIFF") and data[8:12] == b"WEBP"
    return False


async def save_product_image(product_id: int, upload: UploadFile) -> str:
    content_type = upload.content_type or ""
    extension = IMAGE_EXTENSIONS.get(content_type)
    if not extension:
        raise HTTPException(status_code=415, detail="仅支持 JPG、PNG 或 WebP 图片")

    maximum = get_settings().max_image_bytes
    data = await upload.read(maximum + 1)
    if len(data) > maximum:
        raise HTTPException(status_code=413, detail="图片不能超过 8MB")
    if not _matches_signature(content_type, data):
        raise HTTPException(status_code=415, detail="图片文件内容与格式不匹配")

    storage_key = f"products/{product_id}/{uuid4().hex}{extension}"
    target = resolve_storage_key(storage_key)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(f"{target.suffix}.uploading")
    temporary.write_bytes(data)
    temporary.replace(target)
    return storage_key


def remove_product_image(storage_key: str) -> None:
    target = resolve_storage_key(storage_key)
    if target.exists() and target.is_file():
        target.unlink()
