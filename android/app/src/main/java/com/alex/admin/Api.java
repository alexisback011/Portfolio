package com.alex.admin;

import android.content.Context;
import android.content.SharedPreferences;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.CookieHandler;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.CookieStore;
import java.net.HttpCookie;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

public final class Api {

    public static final String BASE = "https://portfolio-a6in.onrender.com/api";

    private static final String PREFS_NAME = "alex_admin_auth";
    private static final String COOKIE_KEY = "cookies";
    private static SharedPreferences prefs;

    static {
        CookieHandler.setDefault(new CookieManager(null, CookiePolicy.ACCEPT_ALL));
    }

    public static void init(Context context) {
        prefs = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        restoreCookies();
    }

    public static class ApiException extends Exception {
        private static final long serialVersionUID = 1L;
        public final int status;
        public ApiException(int status, String message) {
            super(message);
            this.status = status;
        }
    }

    private Api() {}

    public static JSONObject login(String email, String password) throws Exception {
        JSONObject body = new JSONObject();
        body.put("email", email);
        body.put("password", password);
        String raw = request("POST", "/auth/login", body.toString());
        return raw == null || raw.isEmpty() ? new JSONObject() : new JSONObject(raw);
    }

    public static JSONObject me() throws Exception {
        String raw = request("GET", "/auth/me", null);
        return raw == null || raw.isEmpty() ? new JSONObject() : new JSONObject(raw);
    }

    public static JSONArray users() throws Exception {
        return new JSONArray(request("GET", "/admin/users", null));
    }

    public static JSONArray messages() throws Exception {
        return new JSONArray(request("GET", "/contact", null));
    }

    public static JSONArray reviews() throws Exception {
        return new JSONArray(request("GET", "/review", null));
    }

    public static JSONArray logins() throws Exception {
        return new JSONArray(request("GET", "/admin/logins", null));
    }

    public static JSONArray otps() throws Exception {
        return new JSONArray(request("GET", "/admin/otps", null));
    }

    public static JSONObject ban(String id) throws Exception {
        return new JSONObject(request("PATCH", "/admin/users/" + id + "/ban", "{}"));
    }

    public static JSONObject unban(String id) throws Exception {
        return new JSONObject(request("PATCH", "/admin/users/" + id + "/unban", "{}"));
    }

    public static void deleteUser(String id) throws Exception {
        request("DELETE", "/admin/users/" + id, null);
    }

    public static void deleteMessage(String id) throws Exception {
        request("DELETE", "/contact/" + id, null);
    }

    public static void deleteReview(String id) throws Exception {
        request("DELETE", "/review/" + id, null);
    }

    public static void deleteLogin(int id) throws Exception {
        request("DELETE", "/admin/logins/" + id, null);
    }

    public static void deleteOtp(int id) throws Exception {
        request("DELETE", "/admin/otps/" + id, null);
    }

    public static JSONObject logout() throws Exception {
        String raw = request("POST", "/auth/logout", null);
        return raw == null || raw.isEmpty() ? new JSONObject() : new JSONObject(raw);
    }

    public static JSONObject apkVersion() throws Exception {
        String raw = request("GET", "/apk/version", null);
        return raw == null || raw.isEmpty() ? new JSONObject() : new JSONObject(raw);
    }

    public static void clearCookies() {
        try {
            CookieHandler ch = CookieHandler.getDefault();
            if (ch instanceof CookieManager) {
                ((CookieManager) ch).getCookieStore().removeAll();
            }
            if (prefs != null) prefs.edit().remove(COOKIE_KEY).apply();
        } catch (Exception ignored) {}
    }

    private static CookieStore cookieStore() {
        CookieHandler ch = CookieHandler.getDefault();
        return (ch instanceof CookieManager) ? ((CookieManager) ch).getCookieStore() : null;
    }

    private static void persistCookies() {
        try {
            CookieStore store = cookieStore();
            if (store == null || prefs == null) return;
            List<HttpCookie> all = store.getCookies();
            StringBuilder sb = new StringBuilder();
            for (HttpCookie c : all) {
                if (c.hasExpired()) continue;
                if (sb.length() > 0) sb.append('\n');
                sb.append(c.getName()).append('\t')
                    .append(c.getValue() == null ? "" : c.getValue()).append('\t')
                    .append(c.getDomain() == null ? "" : c.getDomain()).append('\t')
                    .append(c.getPath() == null ? "/" : c.getPath()).append('\t')
                    .append(c.getSecure() ? "1" : "0").append('\t')
                    .append(c.getMaxAge());
            }
            prefs.edit().putString(COOKIE_KEY, sb.toString()).apply();
        } catch (Exception ignored) {}
    }

    private static void restoreCookies() {
        try {
            String raw = prefs == null ? "" : prefs.getString(COOKIE_KEY, "");
            if (raw == null || raw.length() == 0) return;
            CookieStore store = cookieStore();
            if (store == null) return;
            String[] lines = raw.split("\n");
            for (String line : lines) {
                String[] p = line.split("\t");
                if (p.length < 5) continue;
                HttpCookie c = new HttpCookie(p[0], p[1]);
                c.setDomain(p[2]);
                c.setPath(p[3]);
                c.setSecure(p[4].equals("1"));
                try { c.setMaxAge(Long.parseLong(p[5])); } catch (Exception e) { c.setMaxAge(-1); }
                store.add(new URI((c.getSecure() ? "https" : "http") + "://" + p[2] + p[3]), c);
            }
        } catch (Exception ignored) {}
    }

    private static boolean refresh() {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(BASE + "/auth/refresh").openConnection();
            c.setRequestMethod("POST");
            c.setConnectTimeout(10000);
            c.setReadTimeout(10000);
            int code = c.getResponseCode();
            c.disconnect();
            if (code >= 200 && code < 300) {
                persistCookies();
                return true;
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private static String request(String method, String path, String jsonBody) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(BASE + path).openConnection();
        c.setRequestMethod(method);
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setRequestProperty("Accept", "application/json");
        c.setUseCaches(false);
        c.setDoInput(true);
        if (jsonBody != null) {
            c.setRequestProperty("Content-Type", "application/json");
            c.setDoOutput(true);
            OutputStream os = c.getOutputStream();
            os.write(jsonBody.getBytes("UTF-8"));
            os.close();
        }
        int code = c.getResponseCode();
        boolean setCookie = c.getHeaderField("Set-Cookie") != null;
        String body = readAll(c);
        c.disconnect();
        if (setCookie) persistCookies();
        if (code == 401) {
            if (refresh()) {
                return request(method, path, jsonBody);
            }
            throw new ApiException(401, "Session expired. Sign in again.");
        }
        if (code >= 200 && code < 300) {
            return body;
        }
        throw new ApiException(code, parseError(body, code));
    }

    private static String readAll(HttpURLConnection c) {
        try {
            InputStream in;
            try {
                in = c.getInputStream();
            } catch (IOException e) {
                in = c.getErrorStream();
            }
            if (in == null) return "";
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
            in.close();
            return out.toString("UTF-8");
        } catch (Exception e) {
            return "";
        }
    }

    private static String parseError(String body, int code) {
        if (body != null && body.length() > 0) {
            try {
                JSONObject o = new JSONObject(body);
                if (o.has("detail")) {
                    Object d = o.get("detail");
                    if (d instanceof String) {
                        String s = (String) d;
                        return s.length() == 0 ? ("Error " + code) : s.substring(0, 1).toUpperCase() + s.substring(1);
                    }
                    if (d instanceof JSONArray && ((JSONArray) d).length() > 0) {
                        JSONObject first = ((JSONArray) d).optJSONObject(0);
                        if (first != null && first.has("msg")) return first.getString("msg");
                    }
                }
                if (o.has("msg")) {
                    String s = o.getString("msg");
                    return s.length() == 0 ? ("Error " + code) : s;
                }
            } catch (Exception ignored) {}
        }
        return "Server error (" + code + ")";
    }
}
