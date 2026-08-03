"""One-time Spotify OAuth helper for the "Now Playing" widget.

Runs a local redirect server, opens Spotify's authorize page, exchanges the
authorization code, and prints the refresh token to paste into your
environment (backend/.env locally + Render env vars).

Usage (from the backend directory):
    python scripts/get_spotify_token.py --client-id xxx --client-secret yyy

Or set SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET in the environment first and
omit the flags. Scopes requested:
    user-read-currently-playing user-read-recently-played

Prereq: create an app at https://developer.spotify.com/dashboard and add this
redirect URI to the app's settings:
    http://127.0.0.1:8888/callback
"""
import argparse
import base64
import sys
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer

TOKEN_URL = "https://accounts.spotify.com/api/token"
AUTHORIZE_URL = "https://accounts.spotify.com/authorize"
SCOPES = "user-read-currently-playing user-read-recently-played"

code_received = threading.Event()
auth_code = None


class CallbackHandler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        global auth_code
        if "code=" in self.path:
            auth_code = self.path.split("code=", 1)[1].split("&", 1)[0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(
                b"<h2>Authorized \u2713</h2><p>You can close this tab.</p>"
            )
            code_received.set()
        else:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Missing code")
        threading.Thread(target=self.server.shutdown, daemon=True).start()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--client-id", default=None)
    parser.add_argument("--client-secret", default=None)
    parser.add_argument("--redirect-port", type=int, default=8888)
    args = parser.parse_args()

    client_id = args.client_id or __import__("os").environ.get(
        "SPOTIFY_CLIENT_ID", "")
    client_secret = args.client_secret or __import__("os").environ.get(
        "SPOTIFY_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        print("Missing Client ID / Secret. Pass --client-id/--client-secret or set "
              "SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET.")
        sys.exit(1)

    redirect_uri = f"http://127.0.0.1:{args.redirect_port}/callback"

    server = HTTPServer(("127.0.0.1", args.redirect_port), CallbackHandler)
    auth_url = (f"{AUTHORIZE_URL}?client_id={client_id}"
                f"&response_type=code&redirect_uri={redirect_uri}"
                f"&scope={SCOPES.replace(' ', '%20')}&show_dialog=true")
    print("Opening Spotify authorization page in your browser...")
    print("If the tab doesn't open, visit:\n" + auth_url)
    webbrowser.open(auth_url)
    server.serve_forever()

    if not auth_code:
        print("No authorization code received.")
        sys.exit(1)

    try:
        import requests
    except ImportError:
        print("requests is required: pip install -r requirements.txt")
        sys.exit(1)

    basic = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    resp = requests.post(
        TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "code": auth_code,
            "redirect_uri": redirect_uri,
        },
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout=30,
    )
    if resp.status_code != 200:
        print(f"Token exchange failed: {resp.status_code} {resp.text}")
        sys.exit(1)

    payload = resp.json()
    print("\n" + "=" * 60)
    print("Add these to backend/.env AND your Render service env vars:")
    print("=" * 60)
    print(f'SPOTIFY_CLIENT_ID="{client_id}"')
    print(f'SPOTIFY_CLIENT_SECRET="{client_secret}"')
    print(f'SPOTIFY_REFRESH_TOKEN="{payload.get("refresh_token", "")}"')
    print("=" * 60)
    print("Keep the refresh token secret - never commit it.")


if __name__ == "__main__":
    main()
