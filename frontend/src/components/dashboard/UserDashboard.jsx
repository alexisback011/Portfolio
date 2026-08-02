import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Star,
  Camera,
  Save,
  Pencil,
  Trash2,
  Plus,
  Quote,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, formatApiErrorDetail } from "@/context/AuthContext";
import { API } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import PageHeader from "./PageHeader";
import EmptyState from "./EmptyState";
import ConfirmDialog from "./ConfirmDialog";

const EASE = [0.85, 0, 0.15, 1];

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const resizeImage = (dataUrl, maxSize = 512) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

const StarRating = ({ value, onChange, size = 22, disabled = false }) => (
  <div className="flex items-center gap-1.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        aria-label={`${n} star${n > 1 ? "s" : ""}`}
        onClick={() => onChange?.(n)}
        disabled={disabled}
        className="transition-transform hover:scale-125 disabled:pointer-events-none"
      >
        <Star
          size={size}
          strokeWidth={n <= value ? 2 : 1}
          className={n <= value ? "fill-primary text-primary" : "fill-transparent text-muted-foreground/40"}
        />
      </button>
    ))}
  </div>
);

const UserDashboard = ({ page, onNavigate }) => {
  const { user, updateProfileImage, updateProfile } = useAuth();
  const fileRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [pForm, setPForm] = useState({ name: "", email: "", currentPassword: "", newPassword: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [review, setReview] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [myReviews, setMyReviews] = useState([]);
  const [loadingMyReviews, setLoadingMyReviews] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ rating: 5, comment: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (user) setPForm((f) => ({ ...f, name: user.name || "", email: user.email || "" }));
  }, [user]);

  const loadMyReviews = async () => {
    try {
      const { data } = await axios.get(`${API}/review/me`, { withCredentials: true });
      setMyReviews(data);
    } catch {
      setMyReviews([]);
    } finally {
      setLoadingMyReviews(false);
    }
  };

  useEffect(() => {
    loadMyReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const raw = await readAsDataUrl(file);
      const small = await resizeImage(raw);
      await updateProfileImage(small);
      toast.success("Profile picture updated.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not update profile picture.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onSaveProfile = async (e) => {
    e.preventDefault();
    const fields = { name: pForm.name.trim(), email: pForm.email.trim() };
    if (pForm.newPassword) {
      if (pForm.newPassword.length < 6) {
        toast.error("New password must be at least 6 characters.");
        return;
      }
      fields.password = pForm.newPassword;
    }
    if (pForm.currentPassword || fields.password || pForm.email.trim() !== user?.email) {
      fields.current_password = pForm.currentPassword;
    }
    setSavingProfile(true);
    try {
      await updateProfile(fields);
      setPForm((f) => ({ ...f, currentPassword: "", newPassword: "" }));
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const onSubmitReview = async (e) => {
    e.preventDefault();
    if (!review.comment.trim()) {
      toast.error("Please add a comment.");
      return;
    }
    setSubmittingReview(true);
    try {
      await axios.post(
        `${API}/review`,
        { rating: review.rating, comment: review.comment },
        { withCredentials: true }
      );
      setReview({ rating: 5, comment: "" });
      loadMyReviews();
      toast.success("Review posted. Thanks for the feedback!");
    } catch {
      toast.error("Could not post review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const onStartEdit = (r) => {
    setEditingId(r.id);
    setEditForm({ rating: r.rating, comment: r.comment });
  };

  const onSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.comment.trim()) {
      toast.error("Please add a comment.");
      return;
    }
    setSavingEdit(true);
    try {
      const { data } = await axios.patch(
        `${API}/review/${editingId}`,
        { rating: editForm.rating, comment: editForm.comment },
        { withCredentials: true }
      );
      setMyReviews((prev) => prev.map((r) => (r.id === data.id ? data : r)));
      setEditingId(null);
      toast.success("Review updated.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not update review.");
    } finally {
      setSavingEdit(false);
    }
  };

  const onDeleteMyReview = async (id) => {
    try {
      await axios.delete(`${API}/review/${id}`, { withCredentials: true });
      setMyReviews((prev) => prev.filter((r) => r.id !== id));
      toast.success("Review deleted.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not delete review.");
    }
  };

  if (page === "manage") {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <PageHeader
          eyebrow="Account"
          title="Manage Profile"
          description="Update your name, email and password."
        />
        <Card className="mt-8" data-testid="manage-profile-panel">
          <CardHeader>
            <CardTitle>Profile details</CardTitle>
            <CardDescription>
              Your current password is required to change your email or set a new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={onSaveProfile}
              data-testid="manage-profile-form"
              className="grid grid-cols-1 gap-6 md:grid-cols-2"
            >
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </label>
                <Input
                  name="name"
                  value={pForm.name}
                  onChange={(e) => setPForm((f) => ({ ...f, name: e.target.value }))}
                  data-testid="manage-name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </label>
                <Input
                  type="email"
                  name="email"
                  value={pForm.email}
                  onChange={(e) => setPForm((f) => ({ ...f, email: e.target.value }))}
                  data-testid="manage-email"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Current Password
                </label>
                <Input
                  type="password"
                  name="currentPassword"
                  value={pForm.currentPassword}
                  onChange={(e) => setPForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  placeholder="Required to change email or password"
                  data-testid="manage-current-password"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  New Password
                </label>
                <Input
                  type="password"
                  name="newPassword"
                  value={pForm.newPassword}
                  onChange={(e) => setPForm((f) => ({ ...f, newPassword: e.target.value }))}
                  placeholder="Leave blank to keep current"
                  data-testid="manage-new-password"
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  type="submit"
                  disabled={savingProfile}
                  data-testid="manage-save"
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {savingProfile ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (page === "review") {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <PageHeader
          eyebrow="Reviews"
          title="Submit Review"
          description="Leave a rating and comment about the work."
        />
        <Card className="mt-8" data-testid="dashboard-review-section">
          <CardHeader>
            <CardTitle>Your feedback</CardTitle>
            <CardDescription>Share what you think — it helps a lot.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={onSubmitReview}
              data-testid="dashboard-review-form"
              className="flex flex-col gap-6"
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Rating
                </span>
                <div className="mt-3" data-testid="dashboard-review-rating">
                  <StarRating value={review.rating} onChange={(n) => setReview((f) => ({ ...f, rating: n }))} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Comment
                </label>
                <Textarea
                  value={review.comment}
                  onChange={(e) => setReview((f) => ({ ...f, comment: e.target.value }))}
                  rows={4}
                  placeholder="What did you think?"
                  data-testid="dashboard-review-comment"
                />
              </div>
              <div>
                <Button
                  type="submit"
                  disabled={submittingReview}
                  data-testid="dashboard-review-submit"
                  className="gap-2"
                >
                  {submittingReview ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                  ) : (
                    <>
                      <Star className="h-4 w-4" /> Post Review
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (page === "my-reviews") {
    return (
      <div className="mx-auto w-full max-w-3xl" data-testid="my-reviews-section">
        <PageHeader
          eyebrow="Reviews"
          title="My Reviews"
          description="Edit or delete the reviews you have posted."
        >
          <Badge variant="secondary" className="gap-1">
            <Star className="h-3 w-3 text-primary" />
            {myReviews.length} {myReviews.length === 1 ? "review" : "reviews"}
          </Badge>
        </PageHeader>

        <div className="mt-8 flex flex-col gap-4" data-testid="my-reviews">
          {loadingMyReviews ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="p-6">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="mt-4 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </Card>
            ))
          ) : myReviews.length === 0 ? (
            <EmptyState
              icon={Quote}
              title="No reviews yet"
              description="You haven't posted any reviews yet. When you do, they will show up here."
            />
          ) : (
            myReviews.map((r) =>
              editingId === r.id ? (
                <Card key={r.id} className="p-6">
                  <form onSubmit={onSaveEdit} data-testid={`edit-review-${r.id}`}>
                    <div className="flex items-center justify-between">
                      <StarRating value={editForm.rating} onChange={(n) => setEditForm((f) => ({ ...f, rating: n }))} size={20} />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                        Editing
                      </span>
                    </div>
                    <Textarea
                      value={editForm.comment}
                      onChange={(e) => setEditForm((f) => ({ ...f, comment: e.target.value }))}
                      rows={3}
                      data-testid={`edit-comment-${r.id}`}
                      className="mt-4"
                    />
                    <div className="mt-4 flex items-center gap-3">
                      <Button
                        type="submit"
                        disabled={savingEdit}
                        data-testid={`edit-save-${r.id}`}
                        size="sm"
                        className="gap-1.5"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {savingEdit ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Card>
              ) : (
                <Card
                  key={r.id}
                  data-testid={`my-review-${r.id}`}
                  className="p-6"
                >
                  <div className="flex items-center justify-between gap-4">
                    <StarRating value={r.rating} size={14} disabled />
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`edit-review-btn-${r.id}`}
                        onClick={() => onStartEdit(r)}
                        className="h-7 gap-1.5 px-2 text-[11px]"
                      >
                        <Pencil className="h-3.5 w-3.5 text-secondary" /> Edit
                      </Button>
                      <ConfirmDialog
                        title="Delete review"
                        description="Delete this review permanently? This cannot be undone."
                        confirmLabel="Delete"
                        destructive
                        onConfirm={() => onDeleteMyReview(r.id)}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`delete-my-review-${r.id}`}
                          aria-label="Delete review"
                          className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </ConfirmDialog>
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-light leading-relaxed text-muted-foreground">
                    &quot;{r.comment}&quot;
                  </p>
                </Card>
              )
            )
          )}
        </div>
      </div>
    );
  }

  const firstName = (user.name || "there").split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        eyebrow="Account"
        title={`Welcome back, ${firstName}.`}
        description="Manage your profile and share your thoughts from one place."
      >
        <Badge variant="secondary" className="gap-1.5">
          <BadgeCheck className="h-3.5 w-3.5 text-primary" />
          {user.role === "admin" ? "Verified Administrator" : "Verified Member"}
        </Badge>
      </PageHeader>

      <Card className="mt-8">
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:p-8">
          <div className="relative shrink-0">
            <Avatar className="h-20 w-20 border-2 border-border" data-testid="profile-avatar">
              {user.profile_image ? (
                <AvatarImage src={user.profile_image} alt={`${user.name} profile`} />
              ) : null}
              <AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">
                {user.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              data-testid="profile-avatar-input"
              onChange={onFileChange}
            />
            <button
              type="button"
              data-testid="profile-avatar-upload"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Change profile picture"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground border-2 border-card hover:bg-primary/80 transition-colors disabled:opacity-60"
            >
              {uploading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
              Signed in
            </p>
            <h2
              data-testid="profile-name"
              className="mt-2 inline-flex items-center gap-2 break-words font-display text-2xl font-bold tracking-tight md:text-3xl"
            >
              {user.name}
              <BadgeCheck className="h-5 w-5 shrink-0 text-destructive" aria-label="Verified member" />
            </h2>
            <p data-testid="profile-email" className="mt-2 break-words text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
          <div className="md:ml-auto">
            <Button variant="outline" onClick={() => onNavigate("review")} className="gap-2">
              <Plus className="h-4 w-4" /> Write a review
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Reviews posted
          </p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums">{myReviews.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Account
          </p>
          <p className="mt-2 font-display text-xl font-bold uppercase tracking-tight">
            {user.role}
          </p>
        </Card>
        <Card className="flex flex-col justify-between p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Status
          </p>
          <p className="mt-2 inline-flex items-center gap-2 font-display text-lg font-bold">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Active
          </p>
        </Card>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold tracking-tight">Recent reviews</h3>
          {myReviews.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onNavigate("my-reviews")} className="gap-1.5">
              View all <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {loadingMyReviews ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="mt-3 h-3.5 w-full" />
              </Card>
            ))
          ) : myReviews.length === 0 ? (
            <EmptyState
              icon={Quote}
              title="Nothing here yet"
              description="You haven't posted any reviews. Click below to leave your first one."
            />
          ) : (
            myReviews.slice(0, 3).map((r) => (
              <Card key={r.id} className="p-5">
                <div className="flex items-center justify-between">
                  <StarRating value={r.rating} size={13} disabled />
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-light text-muted-foreground">
                  &quot;{r.comment}&quot;
                </p>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
