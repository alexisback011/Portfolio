from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import base64
import asyncio
import logging
import threading
import uuid
import hmac
import hashlib
import secrets
import smtplib
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from email.message import EmailMessage
from typing import AsyncIterator, List

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from sqlalchemy import String, Integer, Boolean, DateTime, select, text, delete
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


class OtpRecord(Base):
    __tablename__ = "otp_records"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    purpose: Mapped[str] = mapped_column(String(20), nullable=False)
    code_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
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


SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM = os.environ.get("SMTP_FROM", SMTP_USER or "no-reply@portfolio.app")
SITE_NAME = os.environ.get("SITE_NAME", "Alex Portfolio")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "").strip()
SITE_URL = os.environ.get("SITE_URL", "").strip() or (
    f"https://{FRONTEND_URL}" if FRONTEND_URL else "")
EMAIL_ACCENT = os.environ.get("EMAIL_ACCENT", "#ff0059")
EMAIL_SECONDARY = os.environ.get("EMAIL_SECONDARY", "#00ffff")
EMAIL_FOOTER = os.environ.get(
    "EMAIL_FOOTER",
    f"&copy; {datetime.now(timezone.utc).year} {SITE_NAME} &mdash; "
    f"If you didn't request this, you can safely ignore this email.")

# Transactional email API (Render free tier blocks outbound SMTP).
# EMAIL_PROVIDER: comma-separated, tried in order.
# Options: "smtp" | "sendgrid" | "brevo"  (e.g. "brevo,sendgrid")
EMAIL_PROVIDER = os.environ.get("EMAIL_PROVIDER", "smtp").strip().lower()
EMAIL_API_KEY = os.environ.get("EMAIL_API_KEY", "")
EMAIL_FROM = os.environ.get("EMAIL_FROM", SMTP_FROM)
EMAIL_SENDER_NAME = os.environ.get("EMAIL_SENDER_NAME", "Alex")

OTP_LENGTH = int(os.environ.get("OTP_LENGTH", "6"))
OTP_TTL_MINUTES = int(os.environ.get("OTP_TTL_MINUTES", "10"))
OTP_MAX_ATTEMPTS = int(os.environ.get("OTP_MAX_ATTEMPTS", "5"))
OTP_RESEND_COOLDOWN_SECONDS = int(os.environ.get("OTP_RESEND_COOLDOWN_SECONDS", "60"))
# When enabled, the generated code is logged so admins can test without
# checking email. Enabled by default in dev, off in production (opt-in).
OTP_LOG_CODES = os.environ.get("OTP_LOG_CODES", "1" if IS_DEV else "0").strip().lower() in (
    "1", "true", "yes")


def is_admin_email(email: str) -> bool:
    configured = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    return bool(configured) and email.lower() == configured


# ---- NSFW content moderation ----
NSFW_IMAGE_ENFORCE = os.environ.get("NSFW_IMAGE_ENFORCE", "1").strip().lower() not in (
    "0", "false", "no")
NSFW_IMAGE_THRESHOLD = float(os.environ.get("NSFW_IMAGE_THRESHOLD", "0.5"))

_profanity_instance = None
_profanity_lock = threading.Lock()


def _get_profanity():
    global _profanity_instance
    if _profanity_instance is None:
        with _profanity_lock:
            if _profanity_instance is None:
                from better_profanity import profanity
                _profanity_instance = profanity
    return _profanity_instance


def name_contains_profanity(name: str) -> bool:
    return _get_profanity().contains_profanity(name)


def check_name_clean(name: str) -> None:
    if name_contains_profanity(name):
        raise HTTPException(status_code=400, detail="Name contains inappropriate language")


_nude_detector_instance = None
_nude_detector_lock = threading.Lock()

NSFW_EXPOSED_CLASSES = {
    "BUTTOCKS_EXPOSED",
    "FEMALE_BREAST_EXPOSED",
    "FEMALE_GENITALIA_EXPOSED",
    "MALE_BREAST_EXPOSED",
    "ANUS_EXPOSED",
    "MALE_GENITALIA_EXPOSED",
}


def _get_nude_detector():
    global _nude_detector_instance
    if _nude_detector_instance is None:
        with _nude_detector_lock:
            if _nude_detector_instance is None:
                from nudenet import NudeDetector
                _nude_detector_instance = NudeDetector()
    return _nude_detector_instance


def _image_is_nsfw(detections: list) -> bool:
    return any(
        d.get("class") in NSFW_EXPOSED_CLASSES
        and float(d.get("score", 0)) >= NSFW_IMAGE_THRESHOLD
        for d in detections
    )


def _detect_image_nsfw_sync(image_bytes: bytes) -> bool:
    detector = _get_nude_detector()
    with _nude_detector_lock:
        detections = detector.detect(image_bytes)
    return _image_is_nsfw(detections)


def _decode_data_url(data_url: str) -> bytes:
    if "," not in data_url:
        raise ValueError("invalid data URL")
    return base64.b64decode(data_url.split(",", 1)[1])


async def moderate_image(data_url: str) -> bool:
    raw = _decode_data_url(data_url)
    return await asyncio.to_thread(_detect_image_nsfw_sync, raw)


def generate_otp() -> str:
    return f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"


def hash_otp(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def _send_via_sendgrid(to_email: str, subject: str, body: str, html: str = "") -> bool:
    if not EMAIL_API_KEY:
        logger.warning("SendGrid email skipped: EMAIL_API_KEY not set")
        return False
    import requests
    content = [{"type": "text/plain", "value": body}]
    if html:
        content.append({"type": "text/html", "value": html})
    try:
        r = requests.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={"Authorization": f"Bearer {EMAIL_API_KEY}",
                     "Content-Type": "application/json"},
            json={
                "personalizations": [{"to": [{"email": to_email}]}],
                "from": {"email": EMAIL_FROM, "name": EMAIL_SENDER_NAME},
                "subject": subject,
                "content": content,
            },
            timeout=15,
        )
        if r.status_code in (200, 201, 202):
            return True
        logger.warning("SendGrid rejected email (%s): %s", r.status_code, r.text[:500])
        return False
    except Exception as e:
        logger.warning("SendGrid email failed: %s", e)
        return False


def _send_via_brevo(to_email: str, subject: str, body: str, html: str = "") -> bool:
    if not EMAIL_API_KEY:
        logger.warning("Brevo email skipped: EMAIL_API_KEY not set")
        return False
    import requests
    payload = {
        "sender": {"email": EMAIL_FROM, "name": EMAIL_SENDER_NAME},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": body,
    }
    if html:
        payload["htmlContent"] = html
    try:
        r = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={"api-key": EMAIL_API_KEY,
                     "Content-Type": "application/json"},
            json=payload,
            timeout=15,
        )
        if r.status_code in (200, 201, 202):
            return True
        logger.warning("Brevo rejected email (%s): %s", r.status_code, r.text[:500])
        return False
    except Exception as e:
        logger.warning("Brevo email failed: %s", e)
        return False


def _send_via_smtp(to_email: str, subject: str, body: str, html: str = "") -> bool:
    if not (SMTP_HOST and SMTP_USER):
        return False
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{EMAIL_SENDER_NAME} <{SMTP_FROM}>"
    msg["To"] = to_email
    msg.set_content(body)
    if html:
        msg.add_alternative(html, subtype="html")
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        logger.warning("Failed to send email: %s", e)
        return False


def _provider_chain() -> list:
    providers = [p.strip().lower() for p in EMAIL_PROVIDER.split(",") if p.strip()]
    if "smtp" not in providers and "sendgrid" not in providers and "brevo" not in providers:
        providers = ["smtp"]
    return providers


def send_email(to_email: str, subject: str, body: str, html: str = "") -> bool:
    senders = {
        "sendgrid": _send_via_sendgrid,
        "brevo": _send_via_brevo,
        "smtp": _send_via_smtp,
    }
    providers = _provider_chain()
    for provider in providers:
        try:
            if senders[provider](to_email, subject, body, html):
                return True
        except Exception as e:  # defensive: one sender must never break the chain
            logger.warning("Email provider %s raised: %s", provider, e)
    logger.warning("All email providers failed for %s", to_email)
    return False


def build_email_html(title: str, message: str, code: str = "") -> str:
    code_html = ""
    if code:
        code_html = (
            f'<p style="margin:0 0 10px 0;color:#9ca3af;font-size:13px;'
            f'text-transform:uppercase;letter-spacing:2px;">Your verification code</p>'
            f'<div style="background:#000000;border:1px solid #2a2a2a;'
            f'border-left:3px solid {EMAIL_ACCENT};border-radius:4px;'
            f'padding:18px 12px;font-size:30px;letter-spacing:12px;text-align:center;'
            f'font-weight:700;color:{EMAIL_SECONDARY};font-family:'
            f"'JetBrains Mono',Menlo,Consolas,monospace;margin:0 0 16px 0;"
            f'box-shadow:0 0 24px {EMAIL_ACCENT}33;">{code}</div>'
            f'<p style="margin:0 0 16px 0;color:#6b7280;font-size:12px;'
            f'font-family:\'JetBrains Mono\',Menlo,Consolas,monospace;">'
            f'&gt; expires in {OTP_TTL_MINUTES} minutes</p>'
        )
    return (
        f'<!DOCTYPE html><html><body style="margin:0;padding:0;'
        f'background:#050505;font-family:'
        f"'JetBrains Mono',Menlo,Consolas,monospace;"
        f'-webkit-font-smoothing:antialiased;">'
        f'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" '
        f'style="background:#050505;padding:40px 16px;"><tr><td align="center">'
        f'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" '
        f'style="max-width:500px;background:#0b0b0b;border:1px solid #1f1f1f;'
        f'border-radius:8px;overflow:hidden;">'
        f'<tr><td style="background:#000000;padding:22px 26px;'
        f'border-bottom:2px solid {EMAIL_ACCENT};">'
        f'<div style="color:#fafafa;font-size:19px;font-weight:800;'
        f'font-family:\'Unbounded\',\'Arial Black\',sans-serif;'
        f'text-transform:uppercase;letter-spacing:1px;">'
        f'{SITE_NAME}<span style="color:{EMAIL_ACCENT};">.</span></div>'
        f'<div style="color:#00ffff;font-size:10px;text-transform:uppercase;'
        f'letter-spacing:4px;margin-top:6px;">secure mailbox &gt;&gt;</div></td></tr>'
        f'<tr><td style="padding:28px 26px;">'
        f'<h1 style="margin:0 0 14px 0;color:#fafafa;font-size:20px;'
        f'font-weight:800;text-transform:uppercase;letter-spacing:1px;'
        f'font-family:\'Unbounded\',\'Arial Black\',sans-serif;">{title}</h1>'
        f'<p style="margin:0 0 20px 0;color:#9ca3af;font-size:14px;'
        f'line-height:1.7;">{message}</p>'
        f'{code_html}'
        f'</td></tr>'
        f'<tr><td style="padding:18px 26px;border-top:1px solid #1f1f1f;'
        f'background:#070707;">'
        f'<div style="color:#525252;font-size:11px;line-height:1.7;'
        f'font-family:\'JetBrains Mono\',Menlo,Consolas,monospace;">{EMAIL_FOOTER}</div>'
        f'</td></tr></table></td></tr></table></body></html>'
    )


async def issue_otp(db: AsyncSession, email: str, purpose: str) -> str:
    code = generate_otp()
    await db.execute(delete(OtpRecord).where(
        OtpRecord.email == email, OtpRecord.purpose == purpose))
    db.add(OtpRecord(
        email=email,
        purpose=purpose,
        code_hash=hash_otp(code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES),
    ))
    await db.commit()
    if OTP_LOG_CODES:
        logger.info("OTP %s issued for %s (purpose=%s)", code, email, purpose)
    return code


async def _otp_cooldown_remaining(db: AsyncSession, email: str, purpose: str) -> int:
    rec = await db.scalar(select(OtpRecord)
                          .where(OtpRecord.email == email,
                                 OtpRecord.purpose == purpose)
                          .order_by(OtpRecord.created_at.desc()))
    if not rec:
        return 0
    last_sent = _utc_naive(rec.created_at)
    elapsed = (datetime.now(timezone.utc).replace(tzinfo=None) - last_sent).total_seconds()
    return max(0, OTP_RESEND_COOLDOWN_SECONDS - int(elapsed))


def _utc_naive(dt: datetime) -> datetime:
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


async def verify_otp(db: AsyncSession, email: str, purpose: str, code: str) -> bool:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    rec = await db.scalar(select(OtpRecord)
                          .where(OtpRecord.email == email,
                                 OtpRecord.purpose == purpose,
                                 OtpRecord.used == False)
                          .order_by(OtpRecord.created_at.desc()))
    if not rec or _utc_naive(rec.expires_at) < now or rec.attempts >= OTP_MAX_ATTEMPTS:
        return False
    if not hmac.compare_digest(hash_otp(code), rec.code_hash):
        rec.attempts += 1
        await db.commit()
        return False
    rec.used = True
    await db.commit()
    return True


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
    name: str | None = Field(default=None, min_length=1, max_length=80)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)
    current_password: str | None = Field(default=None, max_length=128)
    profile_image: str | None = Field(default=None, max_length=2000)


class RequestSignupOtpInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class VerifySignupInput(BaseModel):
    email: EmailStr
    otp: str = Field(default="", max_length=6)
    name: str = Field(..., min_length=1, max_length=80)
    password: str = Field(..., min_length=6, max_length=128)


class RequestResetOtpInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6, max_length=128)


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
    check_name_clean(input.name)
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


@api_router.post("/auth/request-signup-otp")
async def request_signup_otp(input: RequestSignupOtpInput, db: AsyncSession = Depends(get_db)):
    email = input.email.lower()
    check_name_clean(input.name)
    existing = await db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if is_admin_email(email):
        return {"message": "Admin accounts don't require email verification",
                "email": email, "skip_otp": True}
    remaining = await _otp_cooldown_remaining(db, email, "signup")
    if remaining > 0:
        raise HTTPException(
            status_code=429,
            detail=f"Please wait {remaining}s before requesting another code")
    code = await issue_otp(db, email, "signup")
    subject = f"Verify your email — {SITE_NAME}"
    body = (f"Your verification code for {SITE_NAME} is: {code}\n"
            f"It expires in {OTP_TTL_MINUTES} minutes.")
    html = build_email_html(
        "Verify your email",
        f"Use the code below to finish creating your account on {SITE_NAME}.",
        code)
    sent = send_email(email, subject, body, html)
    if not sent and not IS_DEV:
        raise HTTPException(status_code=500, detail="Could not send verification email")
    resp = {"message": "Verification code sent", "email": email}
    if IS_DEV and not sent:
        resp["dev_otp"] = code
        logger.info("Dev OTP for %s: %s", email, code)
    return resp


@api_router.post("/auth/verify-signup-otp", response_model=AuthOut)
async def verify_signup_otp(input: VerifySignupInput, request: Request, response: Response,
                            db: AsyncSession = Depends(get_db)):
    email = input.email.lower()
    check_name_clean(input.name)
    if not is_admin_email(email) and not await verify_otp(db, email, "signup", input.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
    existing = await db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(name=input.name, email=email,
                password_hash=hash_password(input.password), role="user")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    uid = str(user.id)
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    await record_login(db, user, request)
    return {**user_public(user), "access_token": access, "refresh_token": refresh}


@api_router.post("/auth/request-reset-otp")
async def request_reset_otp(input: RequestResetOtpInput, db: AsyncSession = Depends(get_db)):
    email = input.email.lower()
    user = await db.scalar(select(User).where(User.email == email))
    if not user:
        raise HTTPException(status_code=404, detail="No account found with that email")
    remaining = await _otp_cooldown_remaining(db, email, "reset")
    if remaining > 0:
        raise HTTPException(
            status_code=429,
            detail=f"Please wait {remaining}s before requesting another code")
    code = await issue_otp(db, email, "reset")
    subject = f"Reset your password — {SITE_NAME}"
    body = (f"Your password reset code for {SITE_NAME} is: {code}\n"
            f"It expires in {OTP_TTL_MINUTES} minutes.")
    html = build_email_html(
        "Reset your password",
        f"Use the code below to reset your password for {SITE_NAME}.",
        code)
    sent = send_email(email, subject, body, html)
    if not sent and not IS_DEV:
        raise HTTPException(status_code=500, detail="Could not send reset email")
    resp = {"message": "Reset code sent", "email": email}
    if IS_DEV and not sent:
        resp["dev_otp"] = code
        logger.info("Dev reset OTP for %s: %s", email, code)
    return resp


@api_router.post("/auth/reset-password")
async def reset_password(input: ResetPasswordInput, db: AsyncSession = Depends(get_db)):
    email = input.email.lower()
    if not await verify_otp(db, email, "reset", input.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    user = await db.scalar(select(User).where(User.email == email))
    if not user:
        raise HTTPException(status_code=404, detail="No account found with that email")
    user.password_hash = hash_password(input.new_password)
    await db.commit()
    return {"message": "Password updated. You can now sign in."}


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
    if input.email is not None or input.password is not None:
        if not input.current_password or not verify_password(input.current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
    if input.name is not None:
        new_name = input.name.strip()
        if new_name:
            check_name_clean(new_name)
            user.name = new_name
    if input.email is not None:
        new_email = input.email.lower()
        existing = await db.scalar(select(User).where(User.email == new_email, User.id != user.id))
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        user.email = new_email
    if input.password:
        user.password_hash = hash_password(input.password)
    if input.profile_image is not None:
        pi = input.profile_image.strip()
        if pi and not (pi.startswith("data:image/") or pi.startswith("http://") or pi.startswith("https://")):
            raise HTTPException(status_code=422, detail="profile_image must be a data:image URL or http(s) URL")
        if pi and pi.startswith("data:image/"):
            if NSFW_IMAGE_ENFORCE:
                try:
                    nsfw = await moderate_image(pi)
                except Exception as e:
                    logger.warning("Image moderation failed: %s", e)
                    raise HTTPException(status_code=400,
                                        detail="Image could not be verified. Please try again.")
                if nsfw:
                    raise HTTPException(status_code=400,
                                        detail="Profile picture contains inappropriate content")
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


@api_router.get("/review/me", response_model=List[ReviewOut])
async def my_reviews(current=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    uid = int(current["id"])
    stmt = select(Review).where(Review.user_id == uid).order_by(Review.created_at.desc())
    rows = (await db.scalars(stmt)).all()
    return [{"id": r.id, "name": r.name, "rating": r.rating,
             "comment": r.comment, "created_at": r.created_at,
             "profile_image": r.profile_image} for r in rows]


@api_router.patch("/review/{review_id}", response_model=ReviewOut)
async def update_review(review_id: str, input: ReviewCreate,
                        current=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    review = await db.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    user = await db.get(User, int(current["id"]))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if review.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="You can only edit your own reviews")
    review.rating = input.rating
    review.comment = input.comment.strip()
    review.name = user.name
    review.profile_image = user.profile_image
    await db.commit()
    await db.refresh(review)
    return {"id": review.id, "name": review.name, "rating": review.rating,
            "comment": review.comment, "created_at": review.created_at,
            "profile_image": review.profile_image}


@api_router.delete("/review/{review_id}")
async def delete_review(review_id: str, current=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    review = await db.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    user = await db.get(User, int(current["id"]))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if review.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="You can only delete your own reviews")
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


@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: int, admin=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete an admin")
    await db.execute(delete(LoginRecord).where(LoginRecord.user_id == user.id))
    await db.execute(delete(Review).where(Review.user_id == user.id))
    await db.delete(user)
    await db.commit()
    return {"message": "User deleted"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
