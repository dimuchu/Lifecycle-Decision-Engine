import {
  LayoutDashboard,
  BrainCircuit,
  FlaskConical,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
}

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "AI Summary",
    url: "#",
    icon: BrainCircuit,
  },
  {
    title: "Hypotheses",
    url: "#",
    icon: FlaskConical,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
];
