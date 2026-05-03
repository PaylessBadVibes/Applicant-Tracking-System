import { LayoutDashboard, Users, ClipboardCheck, Mail, ScrollText, UserCog, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/applicants", label: "Applicants", icon: Users },
  { href: "/trade-tests", label: "Trade Tests", icon: ClipboardCheck },
  { href: "/email-templates", label: "Email Templates", icon: Mail },
  { href: "/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/users", label: "Users", icon: UserCog },
  { href: "/settings", label: "Settings", icon: Settings },
];
