from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from typing import AsyncIterator, List

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from sqlalchemy import String, Integer, Boolean, DateTime, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from starlette.middleware.cors import CORSMiddleware


def _normalize_db_url(url: str) -> str:
    url = url.strip()
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://"):]
    if url.startswith("sqlite://"):
        return "sqlite+aiosqlite" + url[len("sqlite"):]
    return url


DATABASE_URL = _normalize_db_url(
    os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./portfolio.db")
)

_engine_kwargs = {"echo": False}
if DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False, "timeout": 30}

engine = create_async_engine(DATABASE_URL, **_engine_kwargs)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="user")
    is_banned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    profile_image: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )


class ContactMessage(Base):
    __tablename__ = "contact_messages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(String(4000), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )


class Review(Base):
    __tablename__ = "reviews"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    profile_image: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str] = mapped_column(String(1000), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )


class LoginRecord(Base):
    __tablename__ = "login_records"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    device: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )


JWT_ALGORITHM = "HS256"
IS_DEV = (
    os.environ.get("APP_ENV", "development") == "development"
    and os.environ.get("RENDER") != "true"
)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=not IS_DEV,
                        samesite="lax" if IS_DEV else "none", max_age=900, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=not IS_DEV,
                        samesite="lax" if IS_DEV else "none", max_age=604800, path="/")


def get_client_ip(request: Request) -> str | None:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else None


def parse_user_agent(ua: str | None) -> str:
    if not ua:
        return "Unknown device"
    ua_l = ua.lower()
    os_label = "Unknown OS"
    for token, label in [
        ("windows", "Windows"),
        ("iphone", "iOS"),
        ("ipad", "iPadOS"),
        ("mac os", "macOS"),
        ("android", "Android"),
        ("linux", "Linux"),
    ]:
        if token in ua_l:
            os_label = label
            break
    browser = "Unknown browser"
    for token, label in [
        ("edg/", "Edge"),
        ("opr/", "Opera"),
        ("chrome", "Chrome"),
        ("firefox", "Firefox"),
        ("safari", "Safari"),
    ]:
        if token in ua_l:
            browser = label
            break
    device_type = (
        "Mobile"
        if any(t in ua_l for t in ("mobile", "iphone", "ipad", "android"))
        else "Desktop"
    )
    return f"{browser} · {os_label} · {device_type}"


async def record_login(db: AsyncSession, user: User, request: Request):
    ua = request.headers.get("user-agent")
    db.add(LoginRecord(
        user_id=user.id,
        email=user.email,
        ip_address=get_client_ip(request),
        user_agent=ua,
        device=parse_user_agent(ua),
    ))
    await db.commit()


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        async with engine.begin() as conn:
            await conn.execute(text("ALTER TABLE users ADD COLUMN profile_image VARCHAR(2000)"))
    except Exception:
        pass
    try:
        async with engine.begin() as conn:
            await conn.execute(text("ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT 0"))
    except Exception:
        pass
    try:
        async with engine.begin() as conn:
            await conn.execute(text("ALTER TABLE reviews ADD COLUMN user_id INTEGER"))
    except Exception:
        pass
    try:
        async with engine.begin() as conn:
            await conn.execute(text("ALTER TABLE reviews ADD COLUMN profile_image VARCHAR(2000)"))
    except Exception:
        pass
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    if not admin_email or not admin_password:
        logger.info("ADMIN_EMAIL/ADMIN_PASSWORD not set; skipping admin seed")
        return
    async with SessionLocal() as session:
        admin = await session.scalar(select(User).where(User.email == admin_email))
        if admin is None:
            session.add(User(name="Admin", email=admin_email,
                             password_hash=hash_password(admin_password), role="admin"))
            await session.commit()
            logger.info("Seeded admin user")
        else:
            changed = False
            if not verify_password(admin_password, admin.password_hash):
                admin.password_hash = hash_password(admin_password)
                changed = True
            if admin.role != "admin":
                admin.role = "admin"
                changed = True
            if changed:
                await session.commit()
                logger.info("Updated admin user")


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    yield
    await engine.dispose()


logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")


class RegisterInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class RefreshInput(BaseModel):
    refresh_token: str


class UpdateProfileInput(BaseModel):
    profile_image: str | None = Field(default=None, max_length=2000)


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str = "user"
    is_banned: bool = False
    profile_image: str | None = None


class AuthOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    role: str = "user"
    is_banned: bool = False
    profile_image: str | None = None
    access_token: str
    refresh_token: str


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    message: str = Field(..., min_length=1, max_length=4000)


class ContactOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    message: str
    created_at: datetime


class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=1, max_length=1000)


class ReviewOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    profile_image: str | None = None
    rating: int
    comment: str
    created_at: datetime


class LoginRecordOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: int
    email: str
    ip_address: str | None
    user_agent: str | None
    device: str | None
    created_at: datetime


class AdminUserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    role: str
    is_banned: bool
    profile_image: str | None
    password_hash: str
    created_at: datetime
    login_count: int
    last_login: datetime | None
    logins: List[LoginRecordOut]


def user_public(user: User) -> dict:
    return {"id": str(user.id), "name": user.name, "email": user.email, "role": user.role,
            "is_banned": user.is_banned, "profile_image": user.profile_image}


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.get(User, int(payload["sub"]))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user.is_banned:
            raise HTTPException(status_code=403, detail="Account is banned")
        return user_public(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@api_router.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/")
async def index():
    return {"message": "Alex portfolio API", "docs": "/docs", "health": "/api/"}


@api_router.post("/auth/register", response_model=AuthOut)
async def register(input: RegisterInput, request: Request, response: Response,
                   db: AsyncSession = Depends(get_db)):
    email = input.email.lower()
    try:
        user = User(name=input.name, email=email,
                    password_hash=hash_password(input.password), role="user")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(user.id)
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    await record_login(db, user, request)
    return {**user_public(user), "access_token": access, "refresh_token": refresh}


@api_router.post("/auth/login", response_model=AuthOut)
async def login(input: LoginInput, request: Request, response: Response,
                db: AsyncSession = Depends(get_db)):
    email = input.email.lower()
    user = await db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(input.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.is_banned:
        raise HTTPException(status_code=403, detail="Account is banned")
    uid = str(user.id)
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    await record_login(db, user, request)
    return {**user_public(user), "access_token": access, "refresh_token": refresh}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}


@api_router.get("/auth/me", response_model=UserOut)
async def me(current=Depends(get_current_user)):
    return current


@api_router.patch("/auth/me", response_model=UserOut)
async def update_me(input: UpdateProfileInput, current=Depends(get_current_user),
                    db: AsyncSession = Depends(get_db)):
    user = await db.get(User, int(current["id"]))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    pi = (input.profile_image or "").strip()
    if pi and not (pi.startswith("data:image/") or pi.startswith("http://") or pi.startswith("https://")):
        raise HTTPException(status_code=422, detail="profile_image must be a data:image URL or http(s) URL")
    user.profile_image = pi or None
    await db.commit()
    await db.refresh(user)
    return user_public(user)


@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.get(User, int(payload["sub"]))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user.is_banned:
            raise HTTPException(status_code=403, detail="Account is banned")
        access = create_access_token(str(user.id), user.email)
        response.set_cookie("access_token", access, httponly=True, secure=not IS_DEV,
                            samesite="lax" if IS_DEV else "none", max_age=900, path="/")
        return {"message": "refreshed"}
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@api_router.post("/auth/refresh-token")
async def refresh_token(input: RefreshInput, db: AsyncSession = Depends(get_db)):
    token = input.refresh_token.strip()
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.get(User, int(payload["sub"]))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user.is_banned:
            raise HTTPException(status_code=403, detail="Account is banned")
        access = create_access_token(str(user.id), user.email)
        return {"access_token": access}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@api_router.post("/contact", response_model=ContactOut)
async def create_contact(input: ContactCreate, db: AsyncSession = Depends(get_db)):
    msg = ContactMessage(name=input.name, email=input.email, message=input.message)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return {"id": msg.id, "name": msg.name, "email": msg.email,
            "message": msg.message, "created_at": msg.created_at}


@api_router.get("/contact", response_model=List[ContactOut])
async def list_contacts(admin=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    stmt = select(ContactMessage).order_by(ContactMessage.created_at.desc()).limit(1000)
    rows = (await db.scalars(stmt)).all()
    return [{"id": m.id, "name": m.name, "email": m.email,
             "message": m.message, "created_at": m.created_at} for m in rows]


@api_router.delete("/contact/{message_id}")
async def delete_contact(message_id: str, admin=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    msg = await db.get(ContactMessage, message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    await db.delete(msg)
    await db.commit()
    return {"message": "Message deleted"}


@api_router.post("/review", response_model=ReviewOut)
async def create_review(input: ReviewCreate, current=Depends(get_current_user),
                        db: AsyncSession = Depends(get_db)):
    user = await db.get(User, int(current["id"]))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    review = Review(name=user.name, rating=input.rating, comment=input.comment.strip(),
                    user_id=user.id, profile_image=user.profile_image)
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return {"id": review.id, "name": review.name, "rating": review.rating,
            "comment": review.comment, "created_at": review.created_at,
            "profile_image": review.profile_image}


@api_router.get("/review", response_model=List[ReviewOut])
async def list_reviews(db: AsyncSession = Depends(get_db)):
    stmt = select(Review).order_by(Review.created_at.desc()).limit(200)
    rows = (await db.scalars(stmt)).all()
    return [{"id": r.id, "name": r.name, "rating": r.rating,
             "comment": r.comment, "created_at": r.created_at,
             "profile_image": r.profile_image} for r in rows]


@api_router.delete("/review/{review_id}")
async def delete_review(review_id: str, admin=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    review = await db.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    await db.delete(review)
    await db.commit()
    return {"message": "Review deleted"}


async def build_admin_user(db: AsyncSession, u: User) -> dict:
    records = (await db.scalars(
        select(LoginRecord)
        .where(LoginRecord.user_id == u.id)
        .order_by(LoginRecord.created_at.desc())
        .limit(100)
    )).all()
    return {
        "id": str(u.id),
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "is_banned": u.is_banned,
        "profile_image": u.profile_image,
        "password_hash": u.password_hash,
        "created_at": u.created_at,
        "login_count": len(records),
        "last_login": records[0].created_at if records else None,
        "logins": [
            {"id": r.id, "email": r.email, "ip_address": r.ip_address,
             "user_agent": r.user_agent, "device": r.device, "created_at": r.created_at}
            for r in records
        ],
    }


@api_router.get("/admin/users", response_model=List[AdminUserOut])
async def list_users(admin=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    stmt = select(User).order_by(User.created_at.desc())
    users = (await db.scalars(stmt)).all()
    return [await build_admin_user(db, u) for u in users]


@api_router.patch("/admin/users/{user_id}/ban", response_model=AdminUserOut)
async def ban_user(user_id: int, admin=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot ban an admin")
    user.is_banned = True
    await db.commit()
    await db.refresh(user)
    return await build_admin_user(db, user)


@api_router.patch("/admin/users/{user_id}/unban", response_model=AdminUserOut)
async def unban_user(user_id: int, admin=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_banned = False
    await db.commit()
    await db.refresh(user)
    return await build_admin_user(db, user)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
