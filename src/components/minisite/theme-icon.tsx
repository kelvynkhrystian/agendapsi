"use client";

import React from "react";
import {
  Heart,
  HandHeart,
  HeartHandshake,
  Brain,
  Smile,
  Sparkles,
  Flower2,
  Flower,
  Leaf,
  Calendar,
  CalendarDays,
  Clock,
  Users,
  UserCheck,
  Shield,
  ShieldCheck,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Target,
  Star,
  Award,
  Activity,
  Home,
  MapPin,
  Video,
} from "lucide-react";

export const ICON_MAP: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Heart,
  HandHeart,
  HeartHandshake,
  Brain,
  Smile,
  Sparkles,
  Flower2,
  Flower,
  Leaf,
  Calendar,
  CalendarDays,
  Clock,
  Users,
  UserCheck,
  Shield,
  ShieldCheck,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Target,
  Star,
  Award,
  Activity,
  Home,
  MapPin,
  Video,
};

interface ThemeIconProps {
  iconName?: string;
  customIconUrl?: string | null;
  className?: string;
  strokeWidth?: number;
  alt?: string;
}

export function ThemeIcon({
  iconName = "Sparkles",
  customIconUrl,
  className = "h-5 w-5",
  strokeWidth,
  alt = "Ícone",
}: ThemeIconProps) {
  if (customIconUrl) {
    return (
      <img
        src={customIconUrl}
        alt={alt}
        className={`${className} object-contain`}
      />
    );
  }

  const IconComponent = ICON_MAP[iconName] || Sparkles;
  return <IconComponent className={className} {...(strokeWidth !== undefined ? { strokeWidth } : {})} />;
}
