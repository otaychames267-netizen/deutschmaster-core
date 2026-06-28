import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, GraduationCap, PenLine, Mic,
  BarChart3, Gift, LogOut,
  Users, FileText, BookOpen, CreditCard,
  LayoutGrid, Star, Shield,
  TrendingUp, Settings2, Megaphone, ScrollText,
  Tag, ClipboardList, HardDrive, DollarSign,
  Search, Bell, User, HelpCircle,
  ChevronRight, Upload, Headphones, Wrench,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

type NavColor = "blue" | "rose" | "amber" | "violet" | "default";

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  color?: NavColor;
  badge?: string;
}

const COLOR_MAP: Record<NavColor, { activeClass: string; iconClass: string; glow: string }> = {
  blue: {
    activeClass: "bg-blue-500/12 text-blue-600 dark:text-blue-400 font-semibold border-l-2 border-blue-500 rounded-l-none pl-[calc(0.75rem-2px)]",
    iconClass: "text-blue-500",
    glow: "shadow-[0_0_12px_rgba(59,130,246,0.25)]",
  },
  rose: {
    activeClass: "bg-rose-500/12 text-rose-600 dark:text-rose-400 font-semibold border-l-2 border-rose-500 rounded-l-none pl-[calc(0.75rem-2px)]",
    iconClass: "text-rose-500",
    glow: "shadow-[0_0_12px_rgba(244,63,94,0.25)]",
  },
  amber: {
    activeClass: "bg-amber-500/12 text-amber-600 dark:text-amber-400 font-semibold border-l-2 border-amber-500 rounded-l-none pl-[calc(0.75rem-2px)]",
    iconClass: "text-amber-500",
    glow: "",
  },
  violet: {
    activeClass: "bg-violet-500/12 text-violet-600 dark:text-violet-400 font-semibold border-l-2 border-violet-500 rounded-l-none pl-[calc(0.75rem-2px)]",
    iconClass: "text-violet-500",
    glow: "",
  },
  default: {
    activeClass: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
    iconClass: "",
    glow: "",
  },
};

function NavItem({ to, label, icon: Icon, active, color = "default", badge }: NavItemProps) {
  const c = COLOR_MAP[color];
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active}>
        <Link
          to={to}
          className={`relative gap-3 transition-all duration-150 ${
            active
              ? `${c.activeClass} ${c.glow}`
              : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
          }`}
        >
          <Icon className={`h-4 w-4 shrink-0 transition-colors ${active ? c.iconClass : ""}`} />
          <span className="group-data-[collapsible=icon]:hidden flex-1">{label}</span>
          {badge && (
            <span className="group-data-[collapsible=icon]:hidden ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground leading-none">
              {badge}
            </span>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="px-3 pb-1.5 pt-2 group-data-[collapsible=icon]:hidden">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-sidebar-foreground/35">
        {children}
      </p>
    </div>
  );
}

// ── Collapsible import section ───────────────────────────────────────────────

interface ImportGroupProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  iconColor: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function ImportGroup({ label, icon: Icon, color, iconColor, open, onToggle, children }: ImportGroupProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={onToggle}
        className={`gap-3 transition-all duration-150 group-data-[collapsible=icon]:hidden ${
          open
            ? "text-sidebar-foreground font-semibold"
            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
        }`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${open ? iconColor : ""}`} />
        <span className="flex-1">{label}</span>
        <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""} text-sidebar-foreground/40`} />
      </SidebarMenuButton>
      {open && (
        <SidebarMenuSub className="ml-3 border-l border-sidebar-border/50 pl-0">
          {children}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}

function ImportSubItem({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={active}>
        <Link
          to={to}
          className={`text-xs transition-all duration-150 ${
            active
              ? "text-amber-600 dark:text-amber-400 font-semibold"
              : "text-sidebar-foreground/55 hover:text-sidebar-foreground"
          }`}
        >
          {label}
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

// ── Collapsible "Import PDFs" root section ───────────────────────────────────

interface ImportRootProps {
  pathname: string;
}

function ImportPDFsSection({ pathname }: ImportRootProps) {
  const isAnyImport = pathname.startsWith("/admin/import");

  const [open, setOpen] = useState(isAnyImport);
  const [lesenOpen, setLesenOpen]   = useState(pathname.includes("/import/lesen"));
  const [horenOpen, setHorenOpen]   = useState(pathname.includes("/import/horen"));
  const [sbOpen,    setSbOpen]      = useState(pathname.includes("/import/sprachbausteine"));

  function isActive(to: string) {
    return pathname === to || pathname.startsWith(to + "/");
  }

  return (
    <SidebarMenuItem>
      {/* Root toggle */}
      <SidebarMenuButton
        onClick={() => setOpen(p => !p)}
        className={`gap-3 transition-all duration-150 ${
          isAnyImport
            ? "text-amber-600 dark:text-amber-400 font-semibold"
            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
        }`}
      >
        <Upload className={`h-4 w-4 shrink-0 ${isAnyImport ? "text-amber-500" : ""}`} />
        <span className="group-data-[collapsible=icon]:hidden flex-1">Import PDFs</span>
        <ChevronRight className={`group-data-[collapsible=icon]:hidden h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""} text-sidebar-foreground/40`} />
      </SidebarMenuButton>

      {/* Sub-tree */}
      {open && (
        <SidebarMenuSub className="group-data-[collapsible=icon]:hidden ml-3 border-l border-sidebar-border/50 pl-0 space-y-0.5">

          {/* ── Lesen ── */}
          <ImportGroup
            label="Lesen"
            icon={BookOpen}
            color="amber"
            iconColor="text-amber-500"
            open={lesenOpen}
            onToggle={() => setLesenOpen(p => !p)}
          >
            <ImportSubItem to="/admin/import/lesen-1" label="Teil 1 — Überschriften" active={isActive("/admin/import/lesen-1")} />
            <ImportSubItem to="/admin/import/lesen-2" label="Teil 2 — Lesetext"      active={isActive("/admin/import/lesen-2")} />
            <ImportSubItem to="/admin/import/lesen-3" label="Teil 3 — Anzeigen"      active={isActive("/admin/import/lesen-3")} />
          </ImportGroup>

          {/* ── Hören ── */}
          <ImportGroup
            label="Hören"
            icon={Headphones}
            color="amber"
            iconColor="text-amber-500"
            open={horenOpen}
            onToggle={() => setHorenOpen(p => !p)}
          >
            <ImportSubItem to="/admin/import/horen-1" label="Teil 1" active={isActive("/admin/import/horen-1")} />
            <ImportSubItem to="/admin/import/horen-2" label="Teil 2" active={isActive("/admin/import/horen-2")} />
            <ImportSubItem to="/admin/import/horen-3" label="Teil 3" active={isActive("/admin/import/horen-3")} />
          </ImportGroup>

          {/* ── Sprachbausteine ── */}
          <ImportGroup
            label="Sprachbausteine"
            icon={Wrench}
            color="amber"
            iconColor="text-amber-500"
            open={sbOpen}
            onToggle={() => setSbOpen(p => !p)}
          >
            <ImportSubItem to="/admin/import/sprachbausteine-1" label="Teil 1" active={isActive("/admin/import/sprachbausteine-1")} />
            <ImportSubItem to="/admin/import/sprachbausteine-2" label="Teil 2" active={isActive("/admin/import/sprachbausteine-2")} />
          </ImportGroup>

        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}

// ── Main sidebar ─────────────────────────────────────────────────────────────

export function AppSidebar() {
  const { user, isAdmin, level, signOut } = useAuth();
  const state = useRouterState();
  const pathname = state.location.pathname;

  function isActive(to: string) {
    if (to === "/dashboard") return pathname === "/dashboard";
    if (to === "/admin") return pathname === "/admin";
    return pathname === to || pathname.startsWith(to + "/");
  }

  const levelBadge = level === "TELC_B1" ? "B1" : level === "TELC_B2" ? "B2" : null;
  const displayName = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0]
    ?? user?.email?.split("@")[0]
    ?? "You";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <Sidebar collapsible="icon">
      {/* ── Logo ──────────────────────────────────────────────── */}
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-sm shadow-primary/30">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-between group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-black tracking-tight text-sidebar-foreground">
              AuraLingovia
            </span>
            {levelBadge && (
              <span className="ml-2 shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary ring-1 ring-primary/20">
                {levelBadge}
              </span>
            )}
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-1">

        {/* ── Main ─────────────────────────────────────────────── */}
        <SidebarGroup className="py-1">
          <SidebarMenu>
            <NavItem to="/dashboard" label="Dashboard" icon={LayoutDashboard} active={isActive("/dashboard")} />
            <NavItem to="/search"    label="Search"    icon={Search}          active={isActive("/search")}    />
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        {/* ── Exam Preparation ─────────────────────────────────── */}
        <SidebarGroup className="py-1">
          <SectionLabel>Exam Preparation</SectionLabel>
          <SidebarMenu>
            {/* Schriftlich */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/schriftlich")}>
                <Link to="/schriftlich" className={`relative gap-3 transition-all duration-150 ${
                  isActive("/schriftlich")
                    ? `${COLOR_MAP.blue.activeClass} ${COLOR_MAP.blue.glow}`
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                }`}>
                  <PenLine className={`h-4 w-4 shrink-0 ${isActive("/schriftlich") ? "text-blue-500" : ""}`} />
                  <span className="group-data-[collapsible=icon]:hidden flex-1 font-medium">Schriftlich</span>
                  <Star className={`h-3 w-3 shrink-0 group-data-[collapsible=icon]:hidden transition-colors ${isActive("/schriftlich") ? "fill-blue-500 text-blue-500" : "fill-amber-400 text-amber-400"}`} />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Mündlich */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/muendlich")}>
                <Link to="/muendlich" className={`relative gap-3 transition-all duration-150 ${
                  isActive("/muendlich")
                    ? `${COLOR_MAP.rose.activeClass} ${COLOR_MAP.rose.glow}`
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                }`}>
                  <Mic className={`h-4 w-4 shrink-0 ${isActive("/muendlich") ? "text-rose-500" : ""}`} />
                  <span className="group-data-[collapsible=icon]:hidden flex-1 font-medium">Mündlich</span>
                  <Star className={`h-3 w-3 shrink-0 group-data-[collapsible=icon]:hidden transition-colors ${isActive("/muendlich") ? "fill-rose-500 text-rose-500" : "fill-amber-400 text-amber-400"}`} />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        {/* ── Progress & Community ──────────────────────────────── */}
        <SidebarGroup className="py-1">
          <SectionLabel>Progress</SectionLabel>
          <SidebarMenu>
            <NavItem to="/statistik" label="Statistics"       icon={BarChart3}  active={isActive("/statistik")} />
            <NavItem to="/referrals" label="Referral Program" icon={Gift}        active={isActive("/referrals")} />
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        {/* ── Account ──────────────────────────────────────────── */}
        <SidebarGroup className="py-1">
          <SectionLabel>Account</SectionLabel>
          <SidebarMenu>
            <NavItem to="/profile"       label="Profile"        icon={User}        active={isActive("/profile")}       />
            <NavItem to="/billing"       label="Billing"        icon={CreditCard}  active={isActive("/billing")}       />
            <NavItem to="/notifications" label="Notifications"  icon={Bell}        active={isActive("/notifications")} />
            <NavItem to="/security"      label="Security"       icon={Shield}      active={isActive("/security")}      />
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        {/* ── Support ──────────────────────────────────────────── */}
        <SidebarGroup className="py-1">
          <SectionLabel>Support</SectionLabel>
          <SidebarMenu>
            <NavItem to="/help" label="Help Center" icon={HelpCircle} active={isActive("/help")} />
          </SidebarMenu>
        </SidebarGroup>

        {/* ── Admin ────────────────────────────────────────────── */}
        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup className="py-1">
              <SectionLabel>Admin</SectionLabel>
              <SidebarMenu>
                <NavItem to="/admin"                label="Overview"       icon={LayoutGrid}    active={isActive("/admin")}                color="amber" />
                <NavItem to="/admin/users"          label="Users"          icon={Users}          active={isActive("/admin/users")}          color="amber" />
                <NavItem to="/admin/subscriptions"  label="Subscriptions"  icon={CreditCard}     active={isActive("/admin/subscriptions")}  color="amber" />
                <NavItem to="/admin/analytics"      label="Analytics"      icon={TrendingUp}     active={isActive("/admin/analytics")}      color="amber" />
                <NavItem to="/admin/exams"          label="Exams"          icon={BookOpen}       active={isActive("/admin/exams")}          color="amber" />
                <NavItem to="/admin/pdf-import"     label="PDF Library"    icon={FileText}       active={isActive("/admin/pdf-import")}     color="amber" />
                <NavItem to="/admin/payments"       label="Payments"       icon={DollarSign}     active={isActive("/admin/payments")}       color="amber" />
                <NavItem to="/admin/coupons"        label="Coupons"        icon={Tag}            active={isActive("/admin/coupons")}        color="amber" />
                <NavItem to="/admin/announcements"  label="Announcements"  icon={Megaphone}      active={isActive("/admin/announcements")}  color="amber" />
                <NavItem to="/admin/reports"        label="Reports"        icon={ClipboardList}  active={isActive("/admin/reports")}        color="amber" />
                <NavItem to="/admin/audit-logs"     label="Audit Logs"     icon={ScrollText}     active={isActive("/admin/audit-logs")}     color="amber" />
                <NavItem to="/admin/backup"         label="Backups"        icon={HardDrive}      active={isActive("/admin/backup")}         color="amber" />
                <NavItem to="/admin/roles"          label="Roles"          icon={Shield}         active={isActive("/admin/roles")}          color="amber" />
                <NavItem to="/admin/settings"       label="Settings"       icon={Settings2}      active={isActive("/admin/settings")}       color="amber" />

                {/* Collapsible Import PDFs */}
                <ImportPDFsSection pathname={pathname} />
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* ── Footer: User card + Sign out ─────────────────────── */}
      <SidebarFooter className="border-t border-sidebar-border py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/profile" className="gap-3 hover:bg-sidebar-accent/60 transition-colors">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/40 to-primary/20 text-[10px] font-black text-primary ring-1 ring-primary/20">
                  {initials}
                </div>
                <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-xs font-semibold text-sidebar-foreground">{displayName}</span>
                  <span className="truncate text-[10px] text-sidebar-foreground/45">{user?.email}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="gap-2 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/5 transition-colors">
              <LogOut className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden text-xs">Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
