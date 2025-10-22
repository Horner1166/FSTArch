from pydantic import BaseModel, EmailStr

class RequestCodeSchema(BaseModel):
    email: EmailStr

class ConfirmCodeSchema(BaseModel):
    email: EmailStr
    code: str

class LoginCodeVerifySchema(BaseModel):
    email: EmailStr
    code: str