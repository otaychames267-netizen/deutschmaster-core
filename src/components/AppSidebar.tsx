import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, GraduationCap, User, CreditCard, Bell, Settings, LogOut, PenLine, Mic, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
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
  const { theme, toggle } = useTheme();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => p === "/dashboard" ? currentPath === p : currentPath.startsWith(p);

  const menu = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  ];
  const modules = [
    { to: "/schriftlich", icon: PenLine, label: "Schriftlich" },
    { to: "/muendlich", icon: Mic, label: "Mündlich" },
  ];
  const account = [
    { to: "/profile", icon: User, label: "Profil" },
    { to: "/billing", icon: CreditCard, label: "Abrechnung" },
    { to: "/security", icon: Settings, label: "Einstellungen" },
    { to: "/notifications", icon: Bell, label: "Benachrichtigungen" },
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
          <SidebarGroupLabel>Menü</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menu.map((it) => (
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
          <SidebarGroupLabel>Prüfungsmodule</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {modules.map((it) => (
                <SidebarMenuItem key={it.to}>
                  <SidebarMenuButton asChild isActive={isActive(it.to)} tooltip={it.label} className="font-medium">
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
              <SidebarMenuItem>
                <SidebarMenuButton onClick={toggle} tooltip={theme === "dark" ? "Light Mode" : "Dark Mode"}>
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
            <SidebarMenuButton onClick={() => signOut().then(() => (window.location.href = "/"))} tooltip="Abmelden">
              <LogOut className="h-4 w-4" /><span>Abmelden</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}