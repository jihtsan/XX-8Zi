from pydantic import BaseModel, Field


class CustomerLogin(BaseModel):
    phone: str = Field(min_length=6, max_length=24)
    password: str = Field(min_length=8, max_length=128)


class CustomerRegister(CustomerLogin):
    sms_code: str = Field(min_length=4, max_length=12)


class AdminLogin(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=8, max_length=128)


class CustomerOut(BaseModel):
    id: int
    phone: str
    active: bool
