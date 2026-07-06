"use client";

import { BugReportForm } from "@/components/bug-reporting-form";
import { FindContent } from "@/components/find/find-content";
import { FindContext } from "@/components/find/find-provider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { User } from "@/generated/prisma/browser";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useTranslations } from "next-intl";
import { use, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Find's shell: a custom dialog that morphs open from the header trigger and
 * morphs back into it on close (the Vercel Find pattern).
 *
 * Isolation: the background surface (`panel`) and the foreground content are
 * SIBLINGS — the panel animates its rect while the content sits fixed at the
 * final rect and only crossfades, so text never stretches mid-flight.
 *
 * Asymmetry: the close animation doesn't reverse the open. It first
 * collapses the panel to the input bar's shape, then flies that back into
 * the trigger — similar shapes, so the border never visibly malforms.
 */

const PANEL_WIDTH = 640;
const INPUT_BAR_HEIGHT = 56;
const LIST_HEIGHT = 368;
const FOOTER_HEIGHT = 36;
const PANEL_HEIGHT = INPUT_BAR_HEIGHT + LIST_HEIGHT + FOOTER_HEIGHT;
const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN_OUT = "cubic-bezier(0.45, 0, 0.2, 1)";

type Rect = { top: number; left: number; width: number; height: number };

function px(n: number): string {
  return `${n}px`;
}

function desktopRect(): Rect {
  const width = Math.min(PANEL_WIDTH, window.innerWidth - 32);
  return {
    top: Math.max(48, Math.round(window.innerHeight * 0.12)),
    left: Math.round((window.innerWidth - width) / 2),
    width,
    height: PANEL_HEIGHT,
  };
}

function applyRect(el: HTMLElement, rect: Rect): void {
  el.style.top = px(rect.top);
  el.style.left = px(rect.left);
  el.style.width = px(rect.width);
  el.style.height = px(rect.height);
}

function rectFrames(rect: Rect): Record<string, string> {
  return {
    top: px(rect.top),
    left: px(rect.left),
    width: px(rect.width),
    height: px(rect.height),
  };
}

export function FindDialog({ user }: { user: User | null }) {
  const { open, setOpen, triggerRef } = use(FindContext);
  const [present, setPresent] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const isMobile = useIsMobile();
  const t = useTranslations("dashboard.find");

  // Radix's Portal mounts its subtree one commit after `present` flips, so
  // plain refs are still null when the layout effect first runs. Callback
  // refs held in state re-fire the effect once the nodes actually exist.
  const [overlayNode, setOverlayNode] = useState<HTMLDivElement | null>(null);
  const [panelNode, setPanelNode] = useState<HTMLDivElement | null>(null);
  const [contentNode, setContentNode] = useState<HTMLDivElement | null>(null);
  const animationsRef = useRef<Animation[]>([]);

  useEffect(() => {
    if (open) setPresent(true);
  }, [open]);

  // Keep the fixed rects honest across window resizes while open.
  useEffect(() => {
    if (!present) return;
    function onResize() {
      if (!panelNode || !contentNode || window.innerWidth < 768) return;
      const fin = desktopRect();
      applyRect(panelNode, fin);
      applyRect(contentNode, fin);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [present, panelNode, contentNode]);

  useLayoutEffect(() => {
    if (!present) return;
    const overlay = overlayNode;
    const panel = panelNode;
    const content = contentNode;
    const trigger = triggerRef.current;
    if (!overlay || !panel || !content) return;

    for (const anim of animationsRef.current) anim.cancel();
    animationsRef.current = [];

    const mobile = window.innerWidth < 768;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let fin: Rect | null = null;
    if (!mobile) {
      fin = desktopRect();
      applyRect(panel, fin);
      applyRect(content, fin);
    }

    const animations = animationsRef.current;
    function play(
      el: HTMLElement,
      keyframes: Keyframe[],
      options: KeyframeAnimationOptions
    ) {
      const anim = el.animate(keyframes, { fill: "both", ...options });
      animations.push(anim);
      return anim;
    }

    if (open) {
      if (trigger) trigger.style.opacity = "0";
      if (reduceMotion) return;

      const trig = !mobile && trigger ? trigger.getBoundingClientRect() : null;

      if (trig && fin) {
        play(
          panel,
          [
            rectFrames({
              top: trig.top,
              left: trig.left,
              width: trig.width,
              height: trig.height,
            }),
            rectFrames(fin),
          ],
          { duration: 240, easing: EASE_OUT_EXPO }
        );
      } else {
        play(panel, [{ opacity: 0 }, { opacity: 1 }], {
          duration: 150,
          easing: "ease-out",
        });
      }
      play(
        content,
        [
          { opacity: 0, transform: "translateY(4px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 180, delay: 50, easing: EASE_OUT_EXPO }
      );
      // Paired with the panel morph: same clock, same curve.
      play(overlay, [{ opacity: 0 }, { opacity: 1 }], {
        duration: 240,
        easing: EASE_OUT_EXPO,
      });
      return;
    }

    // Closing.
    function finish() {
      if (trigger) trigger.style.opacity = "";
      setPresent(false);
    }

    if (reduceMotion) {
      finish();
      return;
    }

    play(content, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 90,
      easing: "ease-out",
    });
    play(overlay, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 240,
      easing: "ease-out",
    });

    const trig = !mobile && trigger ? trigger.getBoundingClientRect() : null;
    const exit =
      trig && fin
        ? play(
            panel,
            [
              { ...rectFrames(fin) },
              {
                ...rectFrames({ ...fin, height: INPUT_BAR_HEIGHT }),
                offset: 0.45,
              },
              rectFrames({
                top: trig.top,
                left: trig.left,
                width: trig.width,
                height: trig.height,
              }),
            ],
            { duration: 240, easing: EASE_IN_OUT }
          )
        : play(panel, [{ opacity: 1 }, { opacity: 0 }], {
            duration: 150,
            easing: "ease-in",
          });

    exit.finished.then(finish).catch(() => {
      // Interrupted by a reopen: the enter effect took over.
    });
  }, [open, present, overlayNode, panelNode, contentNode, triggerRef]);

  return (
    <>
      <DialogPrimitive.Root
        open={present}
        onOpenChange={(o) => {
          if (!o) setOpen(false);
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            ref={setOverlayNode}
            className="fixed inset-0 z-50 bg-black/50"
          />
          <DialogPrimitive.Content
            className="fixed inset-0 z-50 outline-none"
            aria-describedby={undefined}
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <DialogPrimitive.Title className="sr-only">
              {t("title")}
            </DialogPrimitive.Title>
            {/* Morphing background surface — a sibling of the content so the
                foreground never stretches. Visual only. */}
            <div
              ref={setPanelNode}
              aria-hidden
              className={cn(
                "border-border bg-popover ring-foreground/10 pointer-events-none absolute shadow-lg ring-1",
                isMobile ? "inset-0" : "rounded-xl border"
              )}
            />
            <div
              ref={setContentNode}
              className={cn(
                "absolute flex flex-col overflow-hidden",
                isMobile ? "inset-0" : "rounded-xl"
              )}
            >
              <FindContent
                user={user}
                mobile={isMobile}
                listHeight={LIST_HEIGHT}
                onClose={() => setOpen(false)}
                onOpenBugReport={() => {
                  setOpen(false);
                  setReportOpen(true);
                }}
              />
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* The bug-report form outlives Find itself (Find closes, this opens). */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <BugReportForm user={user} setReportDialogOpen={setReportOpen} />
        </DialogContent>
      </Dialog>
    </>
  );
}
