import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  Star,
  PenLine,
  Users,
  Mail,
  History,
  KeyRound,
  Menu,
  LogOut,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const buildNav = (isAdmin, hideReviews) => {
  const items = isAdmin
    ? [
        { key: "review", label: "Submit Review", icon: Star, testId: "user-tab-review" },
        { key: "my-reviews", label: "My Reviews", icon: PenLine, testId: "user-tab-my-reviews" },
      ]
    : [
        { key: "overview", label: "Overview", icon: LayoutDashboard },
        { key: "manage", label: "Manage Profile", icon: Settings, testId: "user-tab-manage" },
        { key: "review", label: "Submit Review", icon: Star, testId: "user-tab-review" },
        { key: "my-reviews", label: "My Reviews", icon: PenLine, testId: "user-tab-my-reviews" },
      ];
  if (hideReviews) {
    return items.filter((i) => i.key !== "review" && i.key !== "my-reviews");
  }
  return items;
};

const buildAdminNav = () => [
  {
    label: "Admin",
    items: [
      { key: "overview", label: "Overview", icon: LayoutDashboard },
      { key: "manage", label: "Manage Profile", icon: Settings, testId: "user-tab-manage" },
      { key: "profiles", label: "Registered Profiles", icon: Users, testId: "tab-profiles" },
      { key: "messages", label: "Messages", icon: Mail, testId: "tab-messages" },
      { key: "reviews", label: "Reviews", icon: Star, testId: "tab-reviews" },
      { key: "logins", label: "Logins", icon: History, testId: "tab-logins" },
      { key: "otps", label: "OTP Codes", icon: KeyRound, testId: "tab-otps" },
    ],
  },
];

const DashboardLayout = ({ user, isAdmin, page, onNavigate, hideReviews, children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const onLogout = async () => {
    await logout();
    toast.success("Signed out.");
    navigate("/");
  };

  const groups = (
    isAdmin
      ? [
          { label: "Admin", items: buildAdminNav()[0].items },
          { label: "Account", items: buildNav(true, hideReviews) },
        ]
      : [{ label: "Account", items: buildNav(false, hideReviews) }]
  ).filter((g) => g.items.length > 0);

  const NavItem = ({ item, onSelect }) => {
    const Icon = item.icon;
    const active = page === item.key;
    return (
      <button
        type="button"
        data-testid={item.testId}
        onClick={() => {
          onNavigate(item.key);
          onSelect?.();
        }}
        className={cn(
          "group relative flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
      >
        {active && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />}
        <Icon
          className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")}
        />
        <span className="min-w-0 truncate">{item.label}</span>
      </button>
    );
  };

  const SidebarBody = ({ onSelect }) => (
    <div className="flex flex-col gap-1">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
            {group.label}
          </p>
          {group.items.map((item) => (
            <NavItem key={item.key} item={item} onSelect={onSelect} />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="dashboard relative min-h-[100vh] min-h-[100dvh] bg-background text-foreground">
      <div className="noise-overlay" />
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.18]" />

      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open navigation"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="dashboard-surface w-72 p-0">
                <div className="flex h-16 items-center border-b px-5">
                  <button
                    type="button"
                    data-testid="profile-home"
                    onClick={() => navigate("/")}
                    className="font-display text-base font-black uppercase tracking-tight"
                  >
                    ALEX<span className="text-primary">.</span>
                  </button>
                </div>
                <div className="px-3 py-4">
                  <SidebarBody
                    onSelect={() => {
                      setOpen(false);
                    }}
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 border-t p-4">
                  <button
                    type="button"
                    data-testid="logout-btn"
                    onClick={onLogout}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </SheetContent>
            </Sheet>

            <button
              type="button"
              data-testid="profile-home"
              onClick={() => navigate("/")}
              className="font-display text-base font-black uppercase tracking-tight hover:text-primary transition-colors"
            >
              ALEX<span className="text-primary">.</span>
            </button>

            <Separator orientation="vertical" className="hidden h-6 sm:block" />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground sm:block">
              {isAdmin ? "Admin Console" : "Dashboard"}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60"
              >
                <Avatar className="h-8 w-8 border">
                  {user.profile_image ? (
                    <AvatarImage src={user.profile_image} alt={user.name} />
                  ) : null}
                  <AvatarFallback className="bg-primary text-[11px] font-bold text-primary-foreground">
                    {user.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[160px] truncate text-sm font-medium md:block">
                  {user.name}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dashboard-surface w-56">
              <DropdownMenuLabel className="truncate">{user.name}</DropdownMenuLabel>
              <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/")}>
                <ExternalLink /> View site
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid="logout-btn"
                onClick={onLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px]">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 border-r px-3 py-6 lg:block">
          <SidebarBody />
          <div className="absolute inset-x-3 bottom-6">
            <p className="rounded-md border border-dashed px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground/60">
              {isAdmin ? "Administrator" : "Member"} access
            </p>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-5 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
