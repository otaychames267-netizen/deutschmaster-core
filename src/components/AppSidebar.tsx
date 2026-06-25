import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, GraduationCap, PenLine, Mic,
  BookOpen, Headphones, Wrench, FileText,
  BarChart3, CreditCard, Users, Gift,
  Shield, ChevronDown, LogOut, Settings,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface NavItem {
  label: string;
  to: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: { label: string; to: string }[];
}

export function AppSidebar() {
  const { t } = useTranslation();
  const { user, isAdmin, level, signOut } = useAuth();
  const state = useRouterState();
  const pathname = state.location.pathname;

  function isActive(to: string) {
    return pathname === to || pathname.startsWith(to + "/");
  }

  const schriftlichChildren = [
    {
      label: t("sidebar.vorbereitung"),
      to: "/schriftlich/vorbereitung",
      children: [
        { label: `${t("sidebar.lesen")} — Teil 1`, to: "/schriftlich/vorbereitung/lesen/teil-1" },
        { label: `${t("sidebar.lesen")} — Teil 2`, to: "/schriftlich/vorbereitung/lesen/teil-2" },
        { label: `${t("sidebar.lesen")} — Teil 3`, to: "/schriftlich/vorbereitung/lesen/teil-3" },
        { label: `${t("sidebar.hoeren")} — Teil 1`, to: "/schriftlich/vorbereitung/hoeren/teil-1" },
        { label: `${t("sidebar.hoeren")} — Teil 2`, to: "/schriftlich/vorbereitung/hoeren/teil-2" },
        { label: `${t("sidebar.hoeren")} — Teil 3`, to: "/schriftlich/vorbereitung/hoeren/teil-3" },
        { label: `${t("sidebar.sprachbausteine")} — Teil 1`, to: "/schriftlich/vorbereitung/sprachbausteine/teil-1" },
        { label: `${t("sidebar.sprachbausteine")} — Teil 2`, to: "/schriftlich/vorbereitung/sprachbausteine/teil-2" },
        { label: `${t("sidebar.schreiben")} — Beschwerde`, to: "/schriftlich/vorbereitung/schreiben/beschwerde" },
        { label: `${t("sidebar.schreiben")} — Bitte um Info`, to: "/schriftlich/vorbereitung/schreiben/bitte" },
      ],
    },
    {
      label: t("sidebar.pruefung"),
      to: "/schriftlich/pruefung",
      children: [],
    },
  ];

  const muendlichChildren = [
    {
      label: t("sidebar.vorbereitung"),
      to: "/muendlich/vorbereitung",
      children: [
        { label: "Teil 1 — Präsentation",   to: "/muendlich/vorbereitung/teil-1" },
        { label: "Teil 2 — Thema sprechen", to: "/muendlich/vorbereitung/teil-2" },
        { label: "Teil 3 — Gemeinsam planen", to: "/muendlich/vorbereitung/teil-3" },
      ],
    },
    {
      label: t("sidebar.pruefung"),
      to: "/muendlich/pruefung",
      children: [],
    },
  ];

  return (
    <Sidebar collapsible="icon">
      {/* Logo */}
      <SidebarHeader className="border-b border-sidebar-border pb-3">
        <Link to="/dashboard" className="flex items-center gap-2.5 px-2 py-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-between group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              AuraLingovia
            </span>
            {level && (
              <span className="ml-2 shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-primary">
                {level === "TELC_B1" ? "B1" : "B2"}
              </span>
            )}
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin py-2">
        {/* Main nav */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                <Link to="/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>{t("sidebar.dashboard")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/statistik")}>
                <Link to="/statistik">
                  <BarChart3 className="h-4 w-4" />
                  <span>{t("sidebar.statistik")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Schriftlich */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-1.5">
            <PenLine className="h-3.5 w-3.5" />
            {t("sidebar.schriftlich")}
          </SidebarGroupLabel>
          <SidebarMenu>
            {schriftlichChildren.map((item) => (
              <SidebarCollapsibleItem key={item.to} item={item} isActive={isActive} />
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Mündlich */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-1.5">
            <Mic className="h-3.5 w-3.5" />
            {t("sidebar.muendlich")}
          </SidebarGroupLabel>
          <SidebarMenu>
            {muendlichChildren.map((item) => (
              <SidebarCollapsibleItem key={item.to} item={item} isActive={isActive} />
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Account */}
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/billing")}>
                <Link to="/billing">
                  <CreditCard className="h-4 w-4" />
                  <span>{t("sidebar.billing")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/referrals")}>
                <Link to="/referrals">
                  <Gift className="h-4 w-4" />
                  <span>{t("sidebar.referrals")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/security")}>
                <Link to="/security">
                  <Shield className="h-4 w-4" />
                  <span>Security</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Admin */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1.5 text-amber-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin")}>
                  <Link to="/admin">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/users")}>
                  <Link to="/admin/users">
                    <Users className="h-4 w-4" />
                    <span>Users</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/pdf-import")}>
                  <Link to="/admin/pdf-import">
                    <FileText className="h-4 w-4" />
                    <span>PDF Import</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/exams")}>
                  <Link to="/admin/exams">
                    <BookOpen className="h-4 w-4" />
                    <span>Exams</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin/subscriptions")}>
                  <Link to="/admin/subscriptions">
                    <CreditCard className="h-4 w-4" />
                    <span>Subscriptions</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/profile">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                  {user?.email?.[0]?.toUpperCase() ?? "?"}
                </div>
                <span className="truncate text-xs">{user?.email}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function SidebarCollapsibleItem({
  item,
  isActive,
}: {
  item: { label: string; to: string; children: { label: string; to: string }[] };
  isActive: (to: string) => boolean;
}) {
  const [open, setOpen] = useState(isActive(item.to));

  if (!item.children?.length) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive(item.to)}>
          <Link to={item.to}>{item.label}</Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={isActive(item.to)}>
            <span>{item.label}</span>
            <ChevronDown
              className={`ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map((child) => (
              <SidebarMenuSubItem key={child.to}>
                <SidebarMenuSubButton asChild isActive={isActive(child.to)}>
                  <Link to={child.to}>{child.label}</Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
