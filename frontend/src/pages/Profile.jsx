import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import UserDashboard from "../components/dashboard/UserDashboard";
import AdminDashboard from "../components/dashboard/AdminDashboard";

const ACCOUNT_PAGES = ["manage", "review", "my-reviews"];

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState("overview");

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  if (loading) return null;
  if (!user || !user.id) return null;

  const isAdmin = user.role === "admin";
  const isReviewHiddenUser = user.email?.toLowerCase() === "susnata.011@gmail.com";

  return (
    <DashboardLayout
      user={user}
      isAdmin={isAdmin}
      page={page}
      onNavigate={setPage}
      hideReviews={isReviewHiddenUser}
    >
      {ACCOUNT_PAGES.includes(page) || !isAdmin ? (
        <UserDashboard page={page} onNavigate={setPage} />
      ) : (
        <AdminDashboard page={page} onNavigate={setPage} />
      )}
    </DashboardLayout>
  );
};

export default Profile;
