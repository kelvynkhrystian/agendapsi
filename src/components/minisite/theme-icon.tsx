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
  Clock,
  Users,
  UserCheck,
  Shield,
  ShieldCheck,
  MessageCircle,
  MessageSquare,
  Target,
  Star,
  Award,
  Activity,
  Home,
  MapPin,
  Video,
} from "lucide-react";

export const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
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
  Clock,
  Users,
  UserCheck,
  Shield,
  ShieldCheck,
  MessageCircle,
  MessageSquare,
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
  alt?: string;
}

export function ThemeIcon({
  iconName = "Sparkles",
  customIconUrl,
  className = "h-5 w-5",
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
  return <IconComponent className={className} />;
}
