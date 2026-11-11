"use client";

import React, { useEffect, useRef } from "react";
import type { IconHandle } from "pulsoicon-react";
import {
  Activity,
  Award,
  Brain,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Flower,
  Flower2,
  HandHeart,
  Heart,
  HeartHandshake,
  Home,
  Leaf,
  MapPin,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Shield,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  Target,
  UserCheck,
  Users,
  Video,
} from "pulsoicon-react";

type AnimatedPulsoComponent = React.ForwardRefExoticComponent<
  {
    className?: string;
    strokeWidth?: number;
    size?: number | string;
    animated?: boolean;
    autoAnimated?: boolean;
  } & React.RefAttributes<IconHandle>
>;

const STEP_ICON_MAP: Record<string, AnimatedPulsoComponent> = {
  Calendar,
  CalendarDays,
  ClipboardCheck,
  MessagesSquare,
  MessageSquare,
  MessageCircle,
  HandHeart,
  HeartHandshake,
  Heart,
  Brain,
  Smile,
  Sparkles,
  Flower2,
  Flower,
  Leaf,
  Clock,
  Users,
  UserCheck,
  Shield,
  ShieldCheck,
  Target,
  Star,
  Award,
  Activity,
  Home,
  MapPin,
  Video,
  CheckCircle2,
};

export function ComoFuncionaStepIcon({
  iconName,
  stepIndex,
  className = "h-6 w-6",
}: {
  iconName?: string;
  stepIndex: number;
  className?: string;
}) {
  const iconRef = useRef<IconHandle>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const fallbackByIndex = [CalendarDays, MessagesSquare, HandHeart];
  const Icon =
    (iconName && STEP_ICON_MAP[iconName]) ||
    fallbackByIndex[stepIndex % fallbackByIndex.length] ||
    Calendar;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let isInView = false;
    let isHovered = false;
    let cancelled = false;
    let initialTimer: ReturnType<typeof setTimeout> | null = null;
    let staggerTimer: ReturnType<typeof setTimeout> | null = null;
    let cycleTimer: ReturnType<typeof setInterval> | null = null;

    const triggerParent = wrap.closest("[data-icon-trigger]") || wrap;

    const runMotion = async () => {
      if (cancelled || isHovered || !isInView || !iconRef.current) return;
      try {
        await iconRef.current.stopAnimation();
        if (!cancelled && !isHovered && isInView) {
          await iconRef.current.startAnimation();
        }
      } catch {
        // Ignore unmount interruptions
      }
    };

    const handleEnter = () => {
      isHovered = true;
    };
    const handleLeave = () => {
      isHovered = false;
    };

    triggerParent.addEventListener("pointerenter", handleEnter);
    triggerParent.addEventListener("pointerleave", handleLeave);

    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              const entry = entries[0];
              if (!entry) return;
              isInView = entry.isIntersecting;
              if (isInView) {
                if (initialTimer) clearTimeout(initialTimer);
                initialTimer = setTimeout(() => {
                  void runMotion();
                }, 320 + stepIndex * 260);
              }
            },
            { threshold: 0.25 }
          )
        : null;

    if (observer) {
      observer.observe(wrap);
    } else {
      isInView = true;
      initialTimer = setTimeout(() => {
        void runMotion();
      }, 320 + stepIndex * 260);
    }

    cycleTimer = setInterval(() => {
      if (isInView && !isHovered) {
        if (staggerTimer) clearTimeout(staggerTimer);
        staggerTimer = setTimeout(() => {
          void runMotion();
        }, stepIndex * 260);
      }
    }, 3600);

    return () => {
      cancelled = true;
      if (initialTimer) clearTimeout(initialTimer);
      if (staggerTimer) clearTimeout(staggerTimer);
      if (cycleTimer) clearInterval(cycleTimer);
      observer?.disconnect();
      triggerParent.removeEventListener("pointerenter", handleEnter);
      triggerParent.removeEventListener("pointerleave", handleLeave);
    };
  }, [stepIndex, iconName]);

  return (
    <div
      ref={wrapRef}
      className="como-funciona-icon-wrap w-13 h-13 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold shadow-2xs"
    >
      <Icon ref={iconRef} className={className} />
    </div>
  );
}
