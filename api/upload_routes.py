from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlmodel import Session
from api.utils import get_current_user
from core.upload_config import upload_file_to_s3
from models.models import User, UserRole
from db import get_session

router = APIRouter()

@router.post("/image")
def upload_image(current_user: User = Depends(get_current_user), session: Session = Depends(get_session), file: UploadFile = File(...)):

    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")

    url = upload_file_to_s3(file)
    return {"url": url}