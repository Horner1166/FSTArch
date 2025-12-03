from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from api.utils import get_current_user
from models.models import User, UserRole
from db import get_session

router = APIRouter()

@router.post("/set-moderator/{user_email}")
def set_user_as_moderator(user_email: str, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Сделать пользователя модератором"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")

    target_user = session.exec(select(User).where(User.email == user_email)).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    target_user.role = UserRole.MODERATOR
    session.add(target_user)
    session.commit()
    
    return {"msg": f"Пользователь {user_email} теперь администратор"}

@router.post("/remove-moderator/{user_email}")
def remove_admin_moderator(user_email: str, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Убрать роль модератора"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")

    if current_user.email == user_email:
        raise HTTPException(status_code=400, detail="Нельзя убрать права модератора у себя")

    target_user = session.exec(select(User).where(User.email == user_email)).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    target_user.role = UserRole.USER
    session.add(target_user)
    session.commit()
    
    return {"msg": f"Роль модератора удалена у пользователя {user_email}"}

