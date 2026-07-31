"""Backend API tests for Alex portfolio: auth + contact"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if "REACT_APP_BACKEND_URL" in os.environ else "https://anime-alex-hub.preview.emergentagent.com"
ADMIN_EMAIL = "admin@alex.dev"
ADMIN_PASSWORD = "admin123"


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

        # duplicate register
        r = client.post(f"{BASE_URL}/api/auth/register",
                        json={"name": "dup", "email": email, "password": "pass1234"})
        assert r.status_code == 400

        # logout clears cookies
        r = client.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200
        # after logout, /me should be 401
        fresh = requests.Session()
        r = fresh.get(f"{BASE_URL}/api/auth/me")
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
    def test_review_post_and_list_public(self):
        payload = {"name": "TEST Fan", "rating": 5,
                   "comment": f"love the work {uuid.uuid4().hex[:6]}"}
        r = requests.post(f"{BASE_URL}/api/review", json=payload)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["comment"] == payload["comment"]
        assert created["rating"] == 5
        assert "id" in created

        r = requests.get(f"{BASE_URL}/api/review")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert any(m["id"] == created["id"] for m in items)

    def test_review_validation(self):
        r = requests.post(f"{BASE_URL}/api/review",
                          json={"name": "", "rating": 0, "comment": ""})
        assert r.status_code == 422
        r = requests.post(f"{BASE_URL}/api/review",
                          json={"name": "x", "rating": 6, "comment": "ok"})
        assert r.status_code == 422

    def test_review_delete_admin_only(self, admin_client):
        payload = {"name": "DELETE REVIEW", "rating": 1, "comment": "remove me"}
        created = requests.post(f"{BASE_URL}/api/review", json=payload).json()

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
