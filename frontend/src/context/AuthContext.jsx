import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API } from "../lib/api";
const AuthContext = createContext(null);

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null=checking, false=guest, object=auth
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(data);
    } catch {
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const { data } = await axios.post(
      `${API}/auth/login`,
      { email, password },
      { withCredentials: true }
    );
    setUser(data);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await axios.post(
      `${API}/auth/register`,
      { name, email, password },
      { withCredentials: true }
    );
    setUser(data);
    return data;
  };

  const requestSignupOtp = async (name, email, password) => {
    const { data } = await axios.post(
      `${API}/auth/request-signup-otp`,
      { name, email, password },
      { withCredentials: true }
    );
    return data;
  };

  const verifySignupOtp = async (name, email, password, otp) => {
    const { data } = await axios.post(
      `${API}/auth/verify-signup-otp`,
      { name, email, password, otp },
      { withCredentials: true }
    );
    setUser(data);
    return data;
  };

  const requestResetOtp = async (email) => {
    const { data } = await axios.post(
      `${API}/auth/request-reset-otp`,
      { email },
      { withCredentials: true }
    );
    return data;
  };

  const resetPassword = async (email, otp, new_password) => {
    const { data } = await axios.post(
      `${API}/auth/reset-password`,
      { email, otp, new_password },
      { withCredentials: true }
    );
    return data;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch {
      /* ignore */
    }
    setUser(false);
  };

  const updateProfileImage = async (profileImage) => {
    const { data } = await axios.patch(
      `${API}/auth/me`,
      { profile_image: profileImage },
      { withCredentials: true }
    );
    setUser((u) => (u ? { ...u, profile_image: data.profile_image } : u));
    return data;
  };

  const updateProfile = async (fields) => {
    const { data } = await axios.patch(`${API}/auth/me`, fields, { withCredentials: true });
    setUser((u) => (u ? { ...u, ...data } : u));
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        checkAuth,
        updateProfileImage,
        updateProfile,
        requestSignupOtp,
        verifySignupOtp,
        requestResetOtp,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
