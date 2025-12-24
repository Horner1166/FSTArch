from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from api.utils import get_current_user
from models.models import User, UserRole
from db import get_session

router = APIRouter()

@router.post("/users/:id/[.post]")
def change_moder_role(user_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Сделать пользователя модератором или убрать роль модератора"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")

    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Нельзя изменить права модератора у себя")

    target_user = session.exec(select(User).where(User.id == user_id)).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if target_user.role == UserRole.MODERATOR:
        target_user.role = UserRole.USER

    elif target_user.role == UserRole.USER:
        target_user.role = UserRole.MODERATOR

    else:
        raise HTTPException(status_code=400, detail="Нельзя изменить роль для пользователя с другой ролью")

    session.add(target_user)
    session.commit()

    return {"msg": f"Пользователь {target_user.username} теперь {'модератор' if target_user.role == UserRole.MODERATOR else 'не модератор'}"}