import { Fragment, useState } from "react";
import axios from "axios";
import {
  Users,
  Star,
  Mail,
  History,
  KeyRound,
  Trash2,
  Ban,
  ShieldCheck,
  BadgeCheck,
  Copy,
  ChevronDown,
  Search,
  Hash,
  Fingerprint,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { formatApiErrorDetail } from "@/context/AuthContext";
import { API } from "@/lib/api";
import { cn } from "@/lib/utils";
import useAdminData from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import PageHeader from "./PageHeader";
import StatCard from "./StatCard";
import EmptyState from "./EmptyState";
import ConfirmDialog from "./ConfirmDialog";
import SignupsChart from "./charts/SignupsChart";
import RatingsChart from "./charts/RatingsChart";
import ReviewCrown from "../ReviewCrown";

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString() : "—");
const fmtDateTime = (v) => (v ? new Date(v).toLocaleString() : "—");

const AdminDashboard = ({ page, onNavigate }) => {
  const {
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
  } = useAdminData(true);

  const [expandedUser, setExpandedUser] = useState({});
  const [search, setSearch] = useState("");

  const crownByReviewer = {};
  reviews.forEach((r) => {
    if (r.rank && r.rank <= 3) {
      const key = String(r.name || "").toLowerCase();
      if (!(key in crownByReviewer) || r.rank < crownByReviewer[key]) crownByReviewer[key] = r.rank;
    }
  });
  const reviewCrownFor = (u) => crownByReviewer[String(u?.name || "").toLowerCase()] || null;

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Could not copy.");
    }
  };

  const toggleUserLogins = (id) => {
    setExpandedUser((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const replaceUser = (updated) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  const onBanUser = async (u) => {
    try {
      const { data } = await axios.patch(
        `${API}/admin/users/${u.id}/ban`,
        {},
        { withCredentials: true }
      );
      replaceUser(data);
      toast.success(`${u.name} banned.`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not ban user.");
    }
  };

  const onUnbanUser = async (u) => {
    try {
      const { data } = await axios.patch(
        `${API}/admin/users/${u.id}/unban`,
        {},
        { withCredentials: true }
      );
      replaceUser(data);
      toast.success(`${u.name} unbanned.`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not unban user.");
    }
  };

  const onDeleteUser = async (u) => {
    try {
      await axios.delete(`${API}/admin/users/${u.id}`, { withCredentials: true });
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast.success(`${u.name} deleted.`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not delete user.");
    }
  };

  const onDelete = async (id) => {
    try {
      await axios.delete(`${API}/contact/${id}`, { withCredentials: true });
      setMessages((prev) => prev.filter((m) => m.id !== id));
      toast.success("Message deleted.");
    } catch {
      toast.error("Could not delete message.");
    }
  };

  const onDeleteReview = async (id) => {
    try {
      await axios.delete(`${API}/review/${id}`, { withCredentials: true });
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast.success("Review deleted.");
    } catch {
      toast.error("Could not delete review.");
    }
  };

  const onDeleteLogin = async (id) => {
    try {
      await axios.delete(`${API}/admin/logins/${id}`, { withCredentials: true });
      setLogins((prev) => prev.filter((l) => l.id !== id));
      toast.success("Login record deleted.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not delete login record.");
    }
  };

  const onDeleteOtp = async (id) => {
    try {
      await axios.delete(`${API}/admin/otps/${id}`, { withCredentials: true });
      setOtps((prev) => prev.filter((o) => o.id !== id));
      toast.success("OTP record deleted.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not delete OTP record.");
    }
  };

  const statCards = [
    { key: "profiles", label: "Profiles", icon: Users, count: users.length, loading: loadingUsers },
    { key: "reviews", label: "Reviews", icon: Star, count: reviews.length, loading: loadingReviews },
    { key: "messages", label: "Messages", icon: Mail, count: messages.length, loading: loadingMsgs },
    { key: "logins", label: "Logins", icon: History, count: logins.length, loading: loadingLogins },
    { key: "otps", label: "OTP Codes", icon: KeyRound, count: otps.length, loading: loadingOtps },
  ];

  if (page === "profiles") {
    const filtered = users.filter(
      (u) =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="mx-auto w-full">
        <PageHeader
          eyebrow="Admin"
          title="Registered Profiles"
          description={`${users.length} account${users.length === 1 ? "" : "s"} total. Manage access, copy identifiers and inspect login history.`}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 md:w-72"
            />
          </div>
        </PageHeader>

        <Card className="mt-8" data-testid="profiles-inbox">
          {loadingUsers ? (
            <div className="flex flex-col gap-4 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Users}
                title={search ? "No matching profiles" : "No registered users"}
                description={
                  search
                    ? `Nothing matches "${search}". Try a different name or email.`
                    : "Signups appear here the moment someone creates an account."
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="hidden lg:table-cell">Last login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <Fragment key={u.id}>
                    <TableRow data-testid={`profile-card-${u.id}`}>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="h-9 w-9 border">
                            {u.profile_image ? <AvatarImage src={u.profile_image} alt={u.name} /> : null}
                            <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                              {u.name?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
                              {reviewCrownFor(u) && (
                                <ReviewCrown rank={reviewCrownFor(u)} size={14} className="shrink-0" />
                              )}
                              {!u.is_banned && (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 gap-1 px-1.5 py-0 text-[10px] text-primary"
                                  data-testid={`verified-${u.id}`}
                                >
                                  <BadgeCheck className="h-3 w-3" /> Verified
                                </Badge>
                              )}
                            </div>
                            <a
                              href={`mailto:${u.email}`}
                              className="block max-w-[200px] truncate text-xs text-muted-foreground hover:text-primary"
                            >
                              {u.email}
                            </a>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.is_banned ? (
                          <Badge variant="destructive">Banned</Badge>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Active
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        {fmtDate(u.created_at)}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {fmtDateTime(u.last_login)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`toggle-logins-${u.id}`}
                            onClick={() => toggleUserLogins(u.id)}
                            className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
                          >
                            {u.logins.length} logins
                            <ChevronDown
                              className={cn(
                                "h-3.5 w-3.5 transition-transform",
                                expandedUser[u.id] && "rotate-180"
                              )}
                            />
                          </Button>
                          {u.role === "admin" ? (
                            <Badge variant="outline" className="gap-1">
                              <ShieldCheck className="h-3 w-3 text-secondary" /> Protected
                            </Badge>
                          ) : (
                            <>
                              {u.is_banned ? (
                                <ConfirmDialog
                                  title="Unban user"
                                  description={`Unban ${u.name}? They will be able to log in again.`}
                                  confirmLabel="Unban"
                                  onConfirm={() => onUnbanUser(u)}
                                >
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    data-testid={`unban-${u.id}`}
                                    className="h-7 gap-1 px-2 text-[11px] text-secondary"
                                  >
                                    <ShieldCheck className="h-3.5 w-3.5" /> Unban
                                  </Button>
                                </ConfirmDialog>
                              ) : (
                                <ConfirmDialog
                                  title="Ban user"
                                  description={`Ban ${u.name} (${u.email})? They will be locked out immediately.`}
                                  confirmLabel="Ban"
                                  onConfirm={() => onBanUser(u)}
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    data-testid={`ban-${u.id}`}
                                    className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                                  >
                                    <Ban className="h-3.5 w-3.5" /> Ban
                                  </Button>
                                </ConfirmDialog>
                              )}
                              <ConfirmDialog
                                title="Delete user"
                                description={`Delete ${u.name} (${u.email}) permanently? Their reviews and login history will be removed too.`}
                                confirmLabel="Delete"
                                destructive
                                onConfirm={() => onDeleteUser(u)}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`delete-user-${u.id}`}
                                  aria-label={`Delete ${u.name}`}
                                  className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </ConfirmDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedUser[u.id] && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={6} className="p-0">
                          <div className="border-t bg-muted/20 px-6 py-4">
                            <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                              <div className="flex items-center gap-2">
                                <span className="w-16 shrink-0 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                                  ID
                                </span>
                                <code className="min-w-0 truncate font-mono text-[11px] text-foreground/70">
                                  {u.id}
                                </code>
                                <button
                                  type="button"
                                  data-testid={`copy-id-${u.id}`}
                                  onClick={() => copyToClipboard(u.id, "User ID")}
                                  aria-label="Copy user ID"
                                  className="ml-auto text-muted-foreground hover:text-primary"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-16 shrink-0 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                                  Hash
                                </span>
                                <code className="min-w-0 truncate font-mono text-[11px] text-foreground/70">
                                  {u.password_hash}
                                </code>
                                <button
                                  type="button"
                                  data-testid={`copy-hash-${u.id}`}
                                  onClick={() => copyToClipboard(u.password_hash, "Password hash")}
                                  aria-label="Copy password hash"
                                  className="ml-auto text-muted-foreground hover:text-primary"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-16 shrink-0 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                                  Joined
                                </span>
                                <span className="text-xs text-muted-foreground">{fmtDateTime(u.created_at)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-16 shrink-0 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                                  Logins
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {u.login_count} · last {u.last_login ? fmtDateTime(u.last_login) : "never"}
                                </span>
                              </div>
                            </div>
                            <div className="mt-5 border-t pt-4">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
                                Login history ({u.logins.length})
                              </p>
                              {u.logins.length === 0 ? (
                                <p className="mt-2 text-xs text-muted-foreground">No recorded logins.</p>
                              ) : (
                                <div className="mt-3 flex max-h-56 flex-col gap-3 overflow-y-auto pr-1">
                                  {u.logins.map((l) => (
                                    <div key={l.id} className="text-xs">
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="flex items-center gap-1.5 text-secondary">
                                          <Fingerprint className="h-3 w-3" />
                                          {l.ip_address || "unknown ip"}
                                        </span>
                                        <span className="shrink-0 text-muted-foreground/60">
                                          {fmtDateTime(l.created_at)}
                                        </span>
                                      </div>
                                      {l.device && (
                                        <p className="mt-1 truncate text-muted-foreground/80">{l.device}</p>
                                      )}
                                      {l.user_agent && (
                                        <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/50">
                                          {l.user_agent}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    );
  }

  if (page === "messages") {
    return (
      <div className="mx-auto w-full">
        <PageHeader
          eyebrow="Admin"
          title="Message Inbox"
          description={`${messages.length} submission${messages.length === 1 ? "" : "s"} from the contact form.`}
        />
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="inbox">
          {loadingMsgs ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-6">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="mt-3 h-3 w-40" />
                <Skeleton className="mt-4 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-2/3" />
              </Card>
            ))
          ) : messages.length === 0 ? (
            <div className="md:col-span-2">
              <EmptyState
                icon={Mail}
                title="Inbox empty"
                description="No messages yet. Submissions from the contact form appear here."
              />
            </div>
          ) : (
            messages.map((m) => (
              <Card key={m.id} data-testid={`message-${m.id}`} className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate font-display text-sm font-bold uppercase tracking-tight">
                    {m.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-muted-foreground">{fmtDate(m.created_at)}</span>
                    <ConfirmDialog
                      title="Delete message"
                      description={`Delete the message from ${m.name}? This cannot be undone.`}
                      confirmLabel="Delete"
                      destructive
                      onConfirm={() => onDelete(m.id)}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`delete-${m.id}`}
                        aria-label={`Delete message from ${m.name}`}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ConfirmDialog>
                  </div>
                </div>
                <a
                  href={`mailto:${m.email}`}
                  className="mt-1 block truncate text-xs text-secondary hover:text-primary"
                >
                  {m.email}
                </a>
                <p className="mt-4 text-sm font-light leading-relaxed text-muted-foreground">
                  {m.message}
                </p>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  if (page === "reviews") {
    return (
      <div className="mx-auto w-full">
        <PageHeader
          eyebrow="Admin"
          title="Reviews"
          description={`${reviews.length} review${reviews.length === 1 ? "" : "s"} left by viewers.`}
        />
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="reviews-inbox">
          {loadingReviews ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-6">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="mt-4 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-3/4" />
              </Card>
            ))
          ) : reviews.length === 0 ? (
            <div className="md:col-span-2">
              <EmptyState
                icon={Star}
                title="No reviews yet"
                description="Viewer comments appear here as soon as someone posts one."
              />
            </div>
          ) : (
            reviews.map((r) => (
              <Card key={r.id} data-testid={`admin-review-${r.id}`} className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <span className="min-w-0 truncate font-display text-sm font-bold uppercase tracking-tight">
                      {r.name}
                    </span>
                    {r.rank <= 3 && <ReviewCrown rank={r.rank} size={14} className="shrink-0" />}
                    {r.is_verified && (
                      <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verified member" />
                    )}
                  </span>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={12}
                          strokeWidth={n <= r.rating ? 2 : 1}
                          className={
                            n <= r.rating
                              ? "fill-primary text-primary"
                              : "fill-transparent text-muted-foreground/40"
                          }
                        />
                      ))}
                    </span>
                    <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                      <Heart size={12} className="fill-primary text-primary" /> {r.likes || 0}
                    </span>
                    <ConfirmDialog
                      title="Delete review"
                      description={`Delete the review from ${r.name}? This cannot be undone.`}
                      confirmLabel="Delete"
                      destructive
                      onConfirm={() => onDeleteReview(r.id)}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`delete-review-${r.id}`}
                        aria-label={`Delete review from ${r.name}`}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ConfirmDialog>
                  </div>
                </div>
                <p className="mt-4 text-sm font-light leading-relaxed text-muted-foreground">
                  {r.comment}
                </p>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  if (page === "logins") {
    return (
      <div className="mx-auto w-full">
        <PageHeader
          eyebrow="Admin"
          title="Login Records"
          description="Real-time sign-in activity across the site."
        />
        <Card className="mt-8" data-testid="logins-inbox">
          {loadingLogins ? (
            <div className="flex flex-col gap-4 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-3.5 w-28" />
                </div>
              ))}
            </div>
          ) : logins.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={History}
                title="No login records"
                description="Sign-ins appear here in real time."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden md:table-cell">IP / Device</TableHead>
                  <TableHead className="hidden xl:table-cell">User agent</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logins.map((l) => (
                  <TableRow key={l.id} data-testid={`login-${l.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <ShieldCheck className="h-3.5 w-3.5 text-secondary" />
                        </div>
                        <span className="truncate font-medium">{l.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {l.ip_address || "unknown ip"}
                      {l.device ? ` · ${l.device}` : ""}
                    </TableCell>
                    <TableCell className="hidden max-w-[240px] truncate font-mono text-[11px] text-muted-foreground/60 xl:table-cell">
                      {l.user_agent}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                      {fmtDateTime(l.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <ConfirmDialog
                        title="Delete login record"
                        description={`Delete the login record for ${l.email} from ${fmtDateTime(l.created_at)}? This cannot be undone.`}
                        confirmLabel="Delete"
                        destructive
                        onConfirm={() => onDeleteLogin(l.id)}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`delete-login-${l.id}`}
                          aria-label={`Delete login record for ${l.email}`}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </ConfirmDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    );
  }

  if (page === "otps") {
    return (
      <div className="mx-auto w-full">
        <PageHeader
          eyebrow="Admin"
          title="OTP Codes"
          description="Sign-up and password-reset codes issued in real time."
        />
        <Card className="mt-8" data-testid="otps-inbox">
          {loadingOtps ? (
            <div className="flex flex-col gap-4 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-3.5 w-44" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-3.5 w-24" />
                </div>
              ))}
            </div>
          ) : otps.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={KeyRound}
                title="No OTP records"
                description="Sign-up and password-reset codes appear here."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Hash</TableHead>
                  <TableHead className="hidden lg:table-cell">Attempts</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otps.map((o) => {
                  const expired = new Date(o.expires_at).getTime() < Date.now();
                  const status = o.used
                    ? { label: "Used", cls: "text-primary border-primary/30 bg-primary/10" }
                    : expired
                    ? { label: "Expired", cls: "text-destructive border-destructive/30 bg-destructive/10" }
                    : { label: "Active", cls: "text-secondary border-secondary/30 bg-secondary/10" };
                  return (
                    <TableRow key={o.id} data-testid={`otp-${o.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                            <KeyRound className="h-3.5 w-3.5 text-secondary" />
                          </div>
                          <span className="truncate font-medium">{o.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase">
                          {o.purpose}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
                            status.cls
                          )}
                        >
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell className="hidden max-w-[200px] lg:table-cell">
                        <code className="flex items-center gap-1.5 truncate font-mono text-[11px] text-muted-foreground/70">
                          <Hash className="h-3 w-3 shrink-0" />
                          {o.code_hash}
                        </code>
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {o.attempts}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                        {fmtDateTime(o.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <ConfirmDialog
                          title="Delete OTP record"
                          description={`Delete the ${o.purpose} code for ${o.email} created ${fmtDateTime(o.created_at)}? This cannot be undone.`}
                          confirmLabel="Delete"
                          destructive
                          onConfirm={() => onDeleteOtp(o.id)}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`delete-otp-${o.id}`}
                            aria-label={`Delete OTP record for ${o.email}`}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ConfirmDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        eyebrow="Admin"
        title="Overview"
        description="A live snapshot of the portfolio — accounts, engagement and security codes."
      />

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5" data-testid="db-overview">
        {statCards.map((t) => (
          <StatCard
            key={t.key}
            testId={`stat-${t.key}`}
            label={t.label}
            icon={t.icon}
            value={t.loading ? "…" : t.count}
            onClick={() => onNavigate(t.key)}
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Signups — last 30 days</CardTitle>
            <CardDescription>New account registrations over time.</CardDescription>
          </CardHeader>
          <CardContent>
            <SignupsChart users={users} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Review ratings</CardTitle>
            <CardDescription>Distribution of viewer ratings (1–5 stars).</CardDescription>
          </CardHeader>
          <CardContent>
            <RatingsChart reviews={reviews} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold tracking-tight">Recently joined</h3>
          <Button variant="ghost" size="sm" onClick={() => onNavigate("profiles")} className="gap-1.5">
            View all <Users className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Card className="mt-4">
          {loadingUsers ? (
            <div className="flex flex-col gap-4 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentUsers.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={Users} title="No users yet" description="New signups will appear here." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden md:table-cell">Role</TableHead>
                  <TableHead className="hidden sm:table-cell">Joined</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-8 w-8 border">
                          {u.profile_image ? <AvatarImage src={u.profile_image} alt={u.name} /> : null}
                          <AvatarFallback className="bg-primary text-[11px] font-bold text-primary-foreground">
                            {u.name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-medium">{u.name}</p>
                            {reviewCrownFor(u) && (
                              <ReviewCrown rank={reviewCrownFor(u)} size={14} className="shrink-0" />
                            )}
                            {!u.is_banned && (
                              <Badge
                                variant="outline"
                                className="shrink-0 gap-1 px-1.5 py-0 text-[10px] text-primary"
                              >
                                <BadgeCheck className="h-3 w-3" /> Verified
                              </Badge>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                      {fmtDate(u.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.is_banned ? (
                        <Badge variant="destructive">Banned</Badge>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Active
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
