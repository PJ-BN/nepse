from pydantic import BaseModel, Field

# Deliberately loose (no email-validator dependency): one @, a dot in the domain, no spaces.
EMAIL_PATTERN = r"^\s*[^@\s]+@[^@\s]+\.[^@\s]+\s*$"


class RegisterIn(BaseModel):
    email: str = Field(max_length=254, pattern=EMAIL_PATTERN)
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
