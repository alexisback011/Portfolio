"""Backend API tests for Alex portfolio: auth + contact"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if "REACT_APP_BACKEND_URL" in os.environ else "https://anime-alex-hub.preview.emergentagent.com"
ADMIN_EMAIL = "admin@alex.dev"
ADMIN_PASSWORD = "admin123"

TINY_JPEG_DATA_URL = ("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAQABADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCeiiivkD6o/9k=")


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def admin_client(client):
    r = client.post(f"{BASE_URL}/api/auth/login",
                    json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return client


# ---------- Auth tests ----------
class TestAuth:
    def test_login_admin_success(self, client):
        r = client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        assert "id" in data
        # httpOnly cookies set
        assert "access_token" in r.cookies
        assert "refresh_token" in r.cookies
        # tokens in body (for native apps)
        assert data["access_token"]
        assert data["refresh_token"]

    def test_refresh_token_endpoint(self, client):
        # login via cookie path, take refresh token from body
        r = client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        refresh = r.json()["refresh_token"]
        assert refresh

        # use it to mint a new access token (no cookies)
        r = requests.post(f"{BASE_URL}/api/auth/refresh-token",
                          json={"refresh_token": refresh})
        assert r.status_code == 200, r.text
        new_access = r.json()["access_token"]
        assert new_access

        # new access token works
        r = requests.get(f"{BASE_URL}/api/auth/me",
                         headers={"Authorization": f"Bearer {new_access}"})
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_refresh_token_invalid(self, client):
        r = requests.post(f"{BASE_URL}/api/auth/refresh-token",
                          json={"refresh_token": "garbage.token.value"})
        assert r.status_code == 401

    def test_update_profile_image(self, admin_client):
        data_url = TINY_JPEG_DATA_URL
        r = admin_client.patch(f"{BASE_URL}/api/auth/me",
                               json={"profile_image": data_url})
        assert r.status_code == 200, r.text
        assert r.json()["profile_image"] == data_url

        # persisted on /auth/me
        r = admin_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["profile_image"] == data_url

        # clearing works
        r = admin_client.patch(f"{BASE_URL}/api/auth/me", json={"profile_image": ""})
        assert r.status_code == 200
        assert r.json()["profile_image"] is None

    def test_update_profile_image_requires_auth(self, client):
        r = requests.patch(f"{BASE_URL}/api/auth/me", json={"profile_image": "x"})
        assert r.status_code == 401

    def test_update_profile_image_invalid(self, admin_client):
        r = admin_client.patch(f"{BASE_URL}/api/auth/me",
                               json={"profile_image": "not-an-image"})
        assert r.status_code == 422

    def test_update_profile_fields(self, client):
        email = f"EDIT_{uuid.uuid4().hex[:8]}@test.dev"
        r = client.post(f"{BASE_URL}/api/auth/register",
                        json={"name": "OLD NAME", "email": email, "password": "pass1234"})
        assert r.status_code == 200
        expected = email.lower()

        # change name (no password needed)
        r = client.patch(f"{BASE_URL}/api/auth/me", json={"name": "NEW NAME"})
        assert r.status_code == 200, r.text
        assert r.json()["name"] == "NEW NAME"

        # change email (needs current password)
        new_email = f"edit_{uuid.uuid4().hex[:8]}@test.dev"
        r = client.patch(f"{BASE_URL}/api/auth/me",
                         json={"email": new_email})
        assert r.status_code == 400
        assert "password" in r.json()["detail"].lower()

        r = client.patch(f"{BASE_URL}/api/auth/me",
                         json={"email": new_email, "current_password": "wrongpass"})
        assert r.status_code == 400

        r = client.patch(f"{BASE_URL}/api/auth/me",
                         json={"email": new_email, "current_password": "pass1234"})
        assert r.status_code == 200, r.text
        assert r.json()["email"] == new_email.lower()

        # email uniqueness
        r = client.patch(f"{BASE_URL}/api/auth/me",
                         json={"email": ADMIN_EMAIL, "current_password": "pass1234"})
        assert r.status_code == 400

        # change password (needs current password), old pass stops working
        r = client.patch(f"{BASE_URL}/api/auth/me",
                         json={"password": "newpass99", "current_password": "pass1234"})
        assert r.status_code == 200, r.text

        fresh = requests.Session()
        r = fresh.post(f"{BASE_URL}/api/auth/login",
                       json={"email": new_email.lower(), "password": "pass1234"})
        assert r.status_code == 401
        r = fresh.post(f"{BASE_URL}/api/auth/login",
                       json={"email": new_email.lower(), "password": "newpass99"})
        assert r.status_code == 200
        assert r.json()["name"] == "NEW NAME"


# ---------- Email OTP tests ----------
class TestEmailOtp:
    def _request_signup(self, email):
        r = requests.post(f"{BASE_URL}/api/auth/request-signup-otp",
                          json={"name": "OTP USER", "email": email, "password": "pass1234"})
        assert r.status_code == 200, r.text
        return r.json()

    def test_signup_otp_flow(self):
        email = f"otp_{uuid.uuid4().hex[:8]}@test.dev"
        data = self._request_signup(email)
        assert "dev_otp" in data, "expected dev OTP in dev mode"

        # wrong code fails
        r = requests.post(f"{BASE_URL}/api/auth/verify-signup-otp",
                          json={"email": email, "otp": "000000",
                                "name": "OTP USER", "password": "pass1234"})
        assert r.status_code == 400

        # correct code creates account and signs in
        r = requests.post(f"{BASE_URL}/api/auth/verify-signup-otp",
                          json={"email": email, "otp": data["dev_otp"],
                                "name": "OTP USER", "password": "pass1234"})
        assert r.status_code == 200, r.text
        resp = r.json()
        assert resp["email"] == email.lower()
        assert resp["role"] == "user"
        assert resp["access_token"]

        # same code cannot be reused
        r = requests.post(f"{BASE_URL}/api/auth/verify-signup-otp",
                          json={"email": email, "otp": data["dev_otp"],
                                "name": "OTP USER", "password": "pass1234"})
        assert r.status_code == 400

    def test_signup_otp_existing_email(self):
        # requesting a signup OTP for an already-used email is allowed
        r = requests.post(f"{BASE_URL}/api/auth/request-signup-otp",
                          json={"name": "X", "email": ADMIN_EMAIL, "password": "pass1234"})
        assert r.status_code == 200
        assert r.json().get("skip_otp") is True

    def test_reset_password_flow(self):
        email = f"reset_{uuid.uuid4().hex[:8]}@test.dev"
        session = requests.Session()
        r = session.post(f"{BASE_URL}/api/auth/register",
                         json={"name": "RESET ME", "email": email, "password": "pass1234"})
        assert r.status_code == 200

        r = requests.post(f"{BASE_URL}/api/auth/request-reset-otp",
                          json={"email": email})
        assert r.status_code == 200, r.text
        otp = r.json()["dev_otp"]

        # wrong code fails
        r = requests.post(f"{BASE_URL}/api/auth/reset-password",
                          json={"email": email, "otp": "000000", "new_password": "newpass77"})
        assert r.status_code == 400

        # correct code resets password
        r = requests.post(f"{BASE_URL}/api/auth/reset-password",
                          json={"email": email, "otp": otp, "new_password": "newpass77"})
        assert r.status_code == 200, r.text

        # old password no longer works, new one does
        fresh = requests.Session()
        assert fresh.post(f"{BASE_URL}/api/auth/login",
                          json={"email": email, "password": "pass1234"}).status_code == 401
        r = fresh.post(f"{BASE_URL}/api/auth/login",
                       json={"email": email, "password": "newpass77"})
        assert r.status_code == 200

    def test_reset_otp_unknown_email(self):
        r = requests.post(f"{BASE_URL}/api/auth/request-reset-otp",
                          json={"email": "nobody@test.dev"})
        assert r.status_code == 404


# ---------- Admin users / login records tests ----------
class TestAdminUsers:
    def test_admin_users_requires_auth(self, client):
        r = requests.get(f"{BASE_URL}/api/admin/users")
        assert r.status_code == 401

    def test_admin_users_requires_admin_role(self, client):
        email = f"TEST_{uuid.uuid4().hex[:8]}@test.dev"
        r = client.post(f"{BASE_URL}/api/auth/register",
                        json={"name": "REGULAR", "email": email, "password": "pass1234"})
        assert r.status_code == 200
        r = client.get(f"{BASE_URL}/api/admin/users")
        assert r.status_code == 403

    def test_admin_users_lists_profiles_and_logins(self, admin_client):
        email = f"TEST_{uuid.uuid4().hex[:8]}@test.dev"
        fresh = requests.Session()
        r = fresh.post(f"{BASE_URL}/api/auth/register",
                       json={"name": "PROFILE MAN", "email": email, "password": "pass1234"})
        assert r.status_code == 200
        uid = r.json()["id"]

        r = admin_client.get(f"{BASE_URL}/api/admin/users")
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)
        profile = next(u for u in items if u["id"] == uid)
        assert profile["email"] == email.lower()
        assert profile["name"] == "PROFILE MAN"
        assert profile["role"] == "user"
        assert profile["password_hash"]
        assert profile["login_count"] >= 1
        assert profile["last_login"] is not None
        assert len(profile["logins"]) >= 1
        rec = profile["logins"][0]
        assert rec["ip_address"]
        assert rec["user_agent"]
        assert rec["device"]

# ---------- Admin ban / moderation tests ----------
class TestAdminBan:
    def _register_user(self):
        email = f"BAN_{uuid.uuid4().hex[:8]}@test.dev"
        session = requests.Session()
        r = session.post(f"{BASE_URL}/api/auth/register",
                         json={"name": "BAN ME", "email": email, "password": "pass1234"})
        assert r.status_code == 200
        return session, r.json()

    def test_ban_requires_admin(self):
        session, reg = self._register_user()
        r = session.patch(f"{BASE_URL}/api/admin/users/{reg['id']}/ban")
        assert r.status_code == 403

    def test_ban_unban_flow(self, admin_client):
        session, reg = self._register_user()
        uid = reg["id"]
        email = reg["email"]

        # ban
        r = admin_client.patch(f"{BASE_URL}/api/admin/users/{uid}/ban")
        assert r.status_code == 200, r.text
        assert r.json()["is_banned"] is True

        # banned user cannot log in
        fresh = requests.Session()
        r = fresh.post(f"{BASE_URL}/api/auth/login",
                       json={"email": email, "password": "pass1234"})
        assert r.status_code == 403
        assert "banned" in r.json()["detail"].lower()

        # existing session is revoked too
        r = session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 403

        # banned user cannot refresh token
        r = requests.post(f"{BASE_URL}/api/auth/refresh-token",
                          json={"refresh_token": reg["refresh_token"]})
        assert r.status_code == 403

        # admin users list reflects the ban
        r = admin_client.get(f"{BASE_URL}/api/admin/users")
        profile = next(u for u in r.json() if u["id"] == uid)
        assert profile["is_banned"] is True

        # unban restores access
        r = admin_client.patch(f"{BASE_URL}/api/admin/users/{uid}/unban")
        assert r.status_code == 200, r.text
        assert r.json()["is_banned"] is False

        fresh2 = requests.Session()
        r = fresh2.post(f"{BASE_URL}/api/auth/login",
                        json={"email": email, "password": "pass1234"})
        assert r.status_code == 200

    def test_cannot_ban_admin(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/users")
        admin = next(u for u in r.json() if u["role"] == "admin")
        r = admin_client.patch(f"{BASE_URL}/api/admin/users/{admin['id']}/ban")
        assert r.status_code == 400

    def test_ban_missing_user_404(self, admin_client):
        r = admin_client.patch(f"{BASE_URL}/api/admin/users/99999999/ban")
        assert r.status_code == 404

    def test_delete_user(self, client, admin_client):
        session, reg = self._register_user()
        uid = reg["id"]

        # delete requires admin
        r = session.delete(f"{BASE_URL}/api/admin/users/{uid}")
        assert r.status_code == 403

        # admin deletes
        r = admin_client.delete(f"{BASE_URL}/api/admin/users/{uid}")
        assert r.status_code == 200, r.text

        # gone from list
        r = admin_client.get(f"{BASE_URL}/api/admin/users")
        assert all(u["id"] != uid for u in r.json())

        # deleting again -> 404
        r = admin_client.delete(f"{BASE_URL}/api/admin/users/{uid}")
        assert r.status_code == 404

    def test_cannot_delete_admin(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/users")
        admin = next(u for u in r.json() if u["role"] == "admin")
        r = admin_client.delete(f"{BASE_URL}/api/admin/users/{admin['id']}")
        assert r.status_code == 400

    def test_login_invalid(self, client):
        r = client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_me_unauth(self, client):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_register_me_logout_flow(self, client):
        email = f"TEST_{uuid.uuid4().hex[:8]}@test.dev"
        expected = email.lower()
        r = client.post(f"{BASE_URL}/api/auth/register",
                        json={"name": "TEST User", "email": email, "password": "pass1234"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == expected
        assert data["role"] == "user"
        assert "access_token" in client.cookies

        # /me works with cookie
        r = client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == expected

        # same email can create another account
        r = client.post(f"{BASE_URL}/api/auth/register",
                        json={"name": "dup", "email": email, "password": "pass1234"})
        assert r.status_code == 200, r.text
        assert r.json()["email"] == expected
        assert r.json()["id"] != data["id"]

        # logout clears cookies
        r = client.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200
        # after logout, /me should be 401
        fresh = requests.Session()
        r = fresh.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_same_email_multiple_accounts(self, client):
        email = f"multi_{uuid.uuid4().hex[:8]}@test.dev"
        r1 = client.post(f"{BASE_URL}/api/auth/register",
                         json={"name": "First", "email": email, "password": "pass1111"})
        assert r1.status_code == 200, r1.text
        id1 = r1.json()["id"]

        r2 = client.post(f"{BASE_URL}/api/auth/register",
                         json={"name": "Second", "email": email, "password": "pass2222"})
        assert r2.status_code == 200, r2.text
        id2 = r2.json()["id"]
        assert id1 != id2

        # each password signs into its own account
        s1 = requests.Session()
        r = s1.post(f"{BASE_URL}/api/auth/login",
                    json={"email": email, "password": "pass1111"})
        assert r.status_code == 200, r.text
        assert r.json()["id"] == id1
        assert r.json()["name"] == "First"

        s2 = requests.Session()
        r = s2.post(f"{BASE_URL}/api/auth/login",
                    json={"email": email, "password": "pass2222"})
        assert r.status_code == 200, r.text
        assert r.json()["id"] == id2
        assert r.json()["name"] == "Second"

        # wrong password still rejected
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": email, "password": "nope"})
        assert r.status_code == 401

    def test_bearer_token_works(self, client):
        # Login and manually extract access_token cookie for Bearer test
        r = client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        token = r.cookies.get("access_token")
        assert token
        r = requests.get(f"{BASE_URL}/api/auth/me",
                         headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL


# ---------- Contact tests ----------
class TestContact:
    def test_contact_get_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/contact")
        assert r.status_code == 401

    def test_contact_post_public_and_admin_can_read(self, admin_client):
        payload = {"name": "TEST Visitor", "email": "visitor@test.dev",
                   "message": f"hello {uuid.uuid4().hex[:6]}"}
        # public post (no auth)
        r = requests.post(f"{BASE_URL}/api/contact", json=payload)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["message"] == payload["message"]
        assert "id" in created

        # admin can list
        r = admin_client.get(f"{BASE_URL}/api/contact")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert any(m["message"] == payload["message"] for m in items)

    def test_contact_post_validation(self):
        r = requests.post(f"{BASE_URL}/api/contact",
                          json={"name": "", "email": "bad", "message": ""})
        assert r.status_code == 422

    def test_contact_delete_admin_only(self, admin_client):
        payload = {"name": "DELETE ME", "email": "delete@test.dev",
                   "message": f"to be deleted {uuid.uuid4().hex[:6]}"}
        created = requests.post(f"{BASE_URL}/api/contact", json=payload).json()

        # unauth delete -> 401
        r = requests.delete(f"{BASE_URL}/api/contact/{created['id']}")
        assert r.status_code == 401

        # admin delete -> 200
        r = admin_client.delete(f"{BASE_URL}/api/contact/{created['id']}")
        assert r.status_code == 200, r.text

        # gone from list
        r = admin_client.get(f"{BASE_URL}/api/contact")
        assert r.status_code == 200
        assert all(m["id"] != created["id"] for m in r.json())

        # deleting again -> 404
        r = admin_client.delete(f"{BASE_URL}/api/contact/{created['id']}")
        assert r.status_code == 404


# ---------- Review tests ----------
class TestReview:
    def _review_user(self):
        email = f"REV_{uuid.uuid4().hex[:8]}@test.dev"
        session = requests.Session()
        r = session.post(f"{BASE_URL}/api/auth/register",
                         json={"name": "REVIEW FAN", "email": email, "password": "pass1234"})
        assert r.status_code == 200
        return session, r.json()

    def test_review_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/review",
                          json={"rating": 5, "comment": "no auth"})
        assert r.status_code == 401

    def test_review_post_and_list_public(self):
        session, reg = self._review_user()
        payload = {"rating": 5, "comment": f"love the work {uuid.uuid4().hex[:6]}"}
        r = session.post(f"{BASE_URL}/api/review", json=payload)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["comment"] == payload["comment"]
        assert created["rating"] == 5
        assert "id" in created
        # name and profile come from the signed-in user
        assert created["name"] == "REVIEW FAN"
        assert "profile_image" in created

        # list is still public
        r = requests.get(f"{BASE_URL}/api/review")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert any(m["id"] == created["id"] for m in items)

    def test_review_validation(self):
        session, _ = self._review_user()
        r = session.post(f"{BASE_URL}/api/review",
                         json={"rating": 0, "comment": ""})
        assert r.status_code == 422
        r = session.post(f"{BASE_URL}/api/review",
                         json={"rating": 6, "comment": "ok"})
        assert r.status_code == 422

    def test_review_delete_admin_only(self, admin_client):
        session, _ = self._review_user()
        payload = {"rating": 1, "comment": "remove me"}
        created = session.post(f"{BASE_URL}/api/review", json=payload).json()

        # unauth delete -> 401
        r = requests.delete(f"{BASE_URL}/api/review/{created['id']}")
        assert r.status_code == 401

        # admin delete -> 200
        r = admin_client.delete(f"{BASE_URL}/api/review/{created['id']}")
        assert r.status_code == 200, r.text

        # gone from list
        r = requests.get(f"{BASE_URL}/api/review")
        assert all(m["id"] != created["id"] for m in r.json())

        # deleting again -> 404
        r = admin_client.delete(f"{BASE_URL}/api/review/{created['id']}")
        assert r.status_code == 404

    def test_my_reviews_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/review/me")
        assert r.status_code == 401

    def test_my_reviews_and_edit(self):
        session, reg = self._review_user()
        created = session.post(f"{BASE_URL}/api/review",
                               json={"rating": 4, "comment": "edit me"}).json()

        # my list shows it
        r = session.get(f"{BASE_URL}/api/review/me")
        assert r.status_code == 200
        assert any(m["id"] == created["id"] for m in r.json())

        # edit own review
        r = session.patch(f"{BASE_URL}/api/review/{created['id']}",
                          json={"rating": 2, "comment": "edited now"})
        assert r.status_code == 200, r.text
        updated = r.json()
        assert updated["rating"] == 2
        assert updated["comment"] == "edited now"

        # another user cannot edit it
        other, _ = self._review_user()
        r = other.patch(f"{BASE_URL}/api/review/{created['id']}",
                        json={"rating": 5, "comment": "hijack"})
        assert r.status_code == 403

        # editing a missing review -> 404
        r = session.patch(f"{BASE_URL}/api/review/nope",
                          json={"rating": 5, "comment": "x"})
        assert r.status_code == 404

    def test_my_reviews_delete(self):
        session, _ = self._review_user()
        created = session.post(f"{BASE_URL}/api/review",
                               json={"rating": 3, "comment": "delete me"}).json()

        # owner can delete their own review
        r = session.delete(f"{BASE_URL}/api/review/{created['id']}")
        assert r.status_code == 200, r.text

        # gone from my list and public list
        r = session.get(f"{BASE_URL}/api/review/me")
        assert all(m["id"] != created["id"] for m in r.json())
        r = requests.get(f"{BASE_URL}/api/review")
        assert all(m["id"] != created["id"] for m in r.json())

        # another user cannot delete it
        other, _ = self._review_user()
        owned = session.post(f"{BASE_URL}/api/review",
                             json={"rating": 4, "comment": "mine"}).json()
        r = other.delete(f"{BASE_URL}/api/review/{owned['id']}")
        assert r.status_code == 403

        # deleting a missing review -> 404
        r = session.delete(f"{BASE_URL}/api/review/nope")
        assert r.status_code == 404


# ---------- NSFW moderation tests ----------
class TestNsfwModeration:
    def test_request_otp_rejects_profane_name(self, client):
        email = f"nsfw_{uuid.uuid4().hex[:8]}@test.dev"
        r = client.post(f"{BASE_URL}/api/auth/request-signup-otp",
                        json={"name": "Fuckface", "email": email, "password": "pass1234"})
        assert r.status_code == 400
        assert "inappropriate" in r.json()["detail"].lower()

    def test_register_rejects_profane_name(self, client):
        email = f"nsfw2_{uuid.uuid4().hex[:8]}@test.dev"
        r = client.post(f"{BASE_URL}/api/auth/register",
                        json={"name": "Shithead", "email": email, "password": "pass1234"})
        assert r.status_code == 400

    def test_update_me_rejects_profane_name(self, client):
        email = f"nsfw3_{uuid.uuid4().hex[:8]}@test.dev"
        r = client.post(f"{BASE_URL}/api/auth/register",
                        json={"name": "GOOD NAME", "email": email, "password": "pass1234"})
        assert r.status_code == 200
        r = client.patch(f"{BASE_URL}/api/auth/me", json={"name": "Damn fucker"})
        assert r.status_code == 400
        assert "inappropriate" in r.json()["detail"].lower()

    def test_verify_otp_rejects_profane_name(self, client):
        email = f"nsfw4_{uuid.uuid4().hex[:8]}@test.dev"
        r = client.post(f"{BASE_URL}/api/auth/request-signup-otp",
                        json={"name": "GOOD NAME", "email": email, "password": "pass1234"})
        assert r.status_code == 200
        r = client.post(f"{BASE_URL}/api/auth/verify-signup-otp",
                        json={"name": "Fuckface", "email": email,
                              "password": "pass1234", "otp": r.json().get("dev_otp", "")})
        assert r.status_code == 400

    def test_profile_image_benign_passes(self, admin_client):
        r = admin_client.patch(f"{BASE_URL}/api/auth/me",
                               json={"profile_image": TINY_JPEG_DATA_URL})
        assert r.status_code == 200, r.text
        assert r.json()["profile_image"] == TINY_JPEG_DATA_URL

    def test_profile_image_non_image_still_422(self, admin_client):
        r = admin_client.patch(f"{BASE_URL}/api/auth/me", json={"profile_image": "not-an-image"})
        assert r.status_code == 422


class TestNsfwDecisionLogic:
    def test_exposed_class_flagged(self):
        from server import _image_is_nsfw
        assert _image_is_nsfw([{"class": "FEMALE_BREAST_EXPOSED", "score": 0.9}])
        assert _image_is_nsfw([{"class": "MALE_GENITALIA_EXPOSED", "score": 0.55}])
        assert _image_is_nsfw([{"class": "ANUS_EXPOSED", "score": 0.5}])

    def test_benign_not_flagged(self):
        from server import _image_is_nsfw
        assert not _image_is_nsfw([])
        assert not _image_is_nsfw([{"class": "FACE_FEMALE", "score": 0.99}])
        assert not _image_is_nsfw([{"class": "FEET_EXPOSED", "score": 0.99}])
        assert not _image_is_nsfw([{"class": "FEMALE_BREAST_EXPOSED", "score": 0.2}])


# ---------- OTP customization tests ----------
class TestOtpCustomization:
    def test_signup_otp_resend_cooldown(self):
        email = f"cooldown_{uuid.uuid4().hex[:8]}@test.dev"
        r = requests.post(f"{BASE_URL}/api/auth/request-signup-otp",
                          json={"name": "COOLDOWN USER", "email": email, "password": "pass1234"})
        assert r.status_code == 200, r.text
        r = requests.post(f"{BASE_URL}/api/auth/request-signup-otp",
                          json={"name": "COOLDOWN USER", "email": email, "password": "pass1234"})
        assert r.status_code == 429, r.text
        assert "wait" in r.json()["detail"].lower()

    def test_reset_otp_resend_cooldown(self):
        email = f"reset_cd_{uuid.uuid4().hex[:8]}@test.dev"
        r = requests.post(f"{BASE_URL}/api/auth/register",
                          json={"name": "CD USER", "email": email, "password": "pass1234"})
        assert r.status_code == 200
        r = requests.post(f"{BASE_URL}/api/auth/request-reset-otp", json={"email": email})
        assert r.status_code == 200, r.text
        r = requests.post(f"{BASE_URL}/api/auth/request-reset-otp", json={"email": email})
        assert r.status_code == 429, r.text

    def test_signup_otp_after_cooldown_waits(self):
        # cooldown only blocks resend, not first request from a fresh email
        email = f"fresh_{uuid.uuid4().hex[:8]}@test.dev"
        r = requests.post(f"{BASE_URL}/api/auth/request-signup-otp",
                          json={"name": "FRESH USER", "email": email, "password": "pass1234"})
        assert r.status_code == 200, r.text
        assert "dev_otp" in r.json()

    def test_generate_otp_respects_length(self):
        from server import generate_otp, OTP_LENGTH
        code = generate_otp()
        assert len(code) == OTP_LENGTH
        assert code.isdigit()

    def test_email_html_branded(self):
        from server import build_email_html
        html = build_email_html("Verify your email", "hello", "123456")
        assert "Alex Portfolio" in html
        assert "123456" in html
        assert "#ff0059" in html
        assert "#00ffff" in html
        assert "expires in" in html

    def test_provider_chain(self):
        from server import _provider_chain, EMAIL_PROVIDER, EMAIL_SENDER_NAME
        assert "smtp" in _provider_chain()
        assert EMAIL_PROVIDER  # non-empty in any config
        assert EMAIL_SENDER_NAME  # display name configured
