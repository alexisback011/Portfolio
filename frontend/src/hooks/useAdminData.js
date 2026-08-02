import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "../lib/api";

const endpoints = [
  { key: "messages", url: `${API}/contact` },
  { key: "users", url: `${API}/admin/users` },
  { key: "reviews", url: `${API}/review` },
  { key: "logins", url: `${API}/admin/logins` },
  { key: "otps", url: `${API}/admin/otps` },
];

const useAdminData = (enabled = true) => {
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [logins, setLogins] = useState([]);
  const [loadingLogins, setLoadingLogins] = useState(true);
  const [otps, setOtps] = useState([]);
  const [loadingOtps, setLoadingOtps] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const load = async () => {
      const settled = await Promise.all(
        endpoints.map((e) =>
          axios
            .get(e.url, { withCredentials: true })
            .then((res) => res.data)
            .catch(() => [])
        )
      );
      if (cancelled) return;
      const [m, u, r, l, o] = settled;
      setMessages(m);
      setUsers(u);
      setReviews(r);
      setLogins(l);
      setOtps(o);
    };

    load();
    const interval = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    setLoadingMsgs(true);
    setLoadingUsers(true);
    setLoadingReviews(true);
    setLoadingLogins(true);
    setLoadingOtps(true);
    const done = setTimeout(() => {
      setLoadingMsgs(false);
      setLoadingUsers(false);
      setLoadingReviews(false);
      setLoadingLogins(false);
      setLoadingOtps(false);
    }, 250);
    return () => clearTimeout(done);
  }, [enabled]);

  return {
    messages,
    setMessages,
    loadingMsgs,
    users,
    setUsers,
    loadingUsers,
    reviews,
    setReviews,
    loadingReviews,
    logins,
    setLogins,
    loadingLogins,
    otps,
    setOtps,
    loadingOtps,
  };
};

export default useAdminData;
