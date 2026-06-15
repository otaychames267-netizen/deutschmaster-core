import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, GraduationCap, User, CreditCard, Shield, Bell, Settings, LogOut, LifeBuoy, PenLine, Mic, ClipboardList, BarChart3, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { t } = useTranslation();
  const { isAdmin, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => p === "/dashboard" ? currentPath === p : currentPath.startsWith(p);

  const study = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/schriftlich", icon: PenLine, label: "Schriftlich" },
    { to: "/muendlich", icon: Mic, label: "Mündlich" },
    { to: "/pruefung", icon: ClipboardList, label: "Prüfungssimulation" },
    { to: "/statistik", icon: BarChart3, label: "Statistik" },
    { to: "/referrals", icon: UserPlus, label: "Freunde einladen" },
  ];
  const account = [
    { to: "/profile", icon: User, label: "Profil" },
    { to: "/billing", icon: CreditCard, label: t("nav.billing") },
    { to: "/security", icon: Shield, label: "Einstellungen" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
    { to: "/help", icon: LifeBuoy, label: "Help & Support" },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2 font-bold">
          <GraduationCap className="h-6 w-6 text-accent shrink-0" />
          {!collapsed && <span className="truncate">DeutschMaster</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Lernen</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {study.map((it) => (
                <SidebarMenuItem key={it.to}>
                  <SidebarMenuButton asChild isActive={isActive(it.to)} tooltip={it.label}>
                    <Link to={it.to}><it.icon className="h-4 w-4" /><span>{it.label}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Konto</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {account.map((it) => (
                <SidebarMenuItem key={it.to}>
                  <SidebarMenuButton asChild isActive={isActive(it.to)} tooltip={it.label}>
                    <Link to={it.to}><it.icon className="h-4 w-4" /><span>{it.label}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin")} tooltip={t("nav.admin")}>
                    <Link to="/admin"><Settings className="h-4 w-4" /><span>{t("nav.admin")}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut().then(() => (window.location.href = "/"))} tooltip={t("nav.logout")}>
              <LogOut className="h-4 w-4" /><span>{t("nav.logout")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}