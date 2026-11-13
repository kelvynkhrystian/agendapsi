"use client";

import * as React from "react";
import * as fm from "framer-motion";

export * from "framer-motion";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/**
 * Wrapper seguro sobre `useAnimation()` / `useAnimationControls()` do Framer Motion / Motion.
 *
 * Contorna a condição de corrida do `pulsoicon-react` em que eventos `pointerenter`,
 * `pointerleave`, `focusin` ou `focusout` disparam `controls.start()` imediatamente antes
 * da montagem completa ou durante a desmontagem (quando o React já limpou o `useLayoutEffect`
 * interno do Framer Motion antes do cleanup do `useEffect` de listeners DOM).
 */
function useSafeAnimationControls() {
  const rawControls = fm.useAnimation();
  const isMountedRef = React.useRef(false);
  const queuedCallRef = React.useRef<{
    definition: Parameters<typeof rawControls.start>[0];
    transitionOverride?: Parameters<typeof rawControls.start>[1];
  } | null>(null);

  useIsomorphicLayoutEffect(() => {
    isMountedRef.current = true;
    const queued = queuedCallRef.current;
    queuedCallRef.current = null;
    if (queued !== null) {
      Promise.resolve().then(() => {
        if (!isMountedRef.current) return;
        try {
          void Promise.resolve(
            rawControls.start(queued.definition, queued.transitionOverride)
          ).catch(() => {});
        } catch {
          // Ignora silenciosamente se o componente desmontar antes da microtask
        }
      });
    }
    return () => {
      isMountedRef.current = false;
      queuedCallRef.current = null;
    };
  }, [rawControls]);

  return React.useMemo(() => {
    const safeStart: typeof rawControls.start = (definition, transitionOverride) => {
      if (!isMountedRef.current) {
        queuedCallRef.current = { definition, transitionOverride };
        return Promise.resolve([]);
      }
      try {
        return Promise.resolve(
          rawControls.start(definition, transitionOverride)
        ).catch(() => []);
      } catch {
        return Promise.resolve([]);
      }
    };

    const safeSet: typeof rawControls.set = (definition) => {
      if (!isMountedRef.current) return;
      try {
        return rawControls.set(definition);
      } catch {
        return;
      }
    };

    const safeStop: typeof rawControls.stop = () => {
      try {
        return rawControls.stop();
      } catch {
        return;
      }
    };

    const safeMount: typeof rawControls.mount = () => {
      const cleanup = rawControls.mount();
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
        cleanup();
      };
    };

    return {
      subscribe: rawControls.subscribe,
      start: safeStart,
      set: safeSet,
      stop: safeStop,
      mount: safeMount,
    };
  }, [rawControls]);
}

const motion = fm.motion;
const m = fm.m;
const useAnimation = useSafeAnimationControls;
const useAnimationControls = useSafeAnimationControls;

export { m, motion, useAnimation, useAnimationControls };
