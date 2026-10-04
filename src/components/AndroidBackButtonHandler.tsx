import { useEffect, useState, useRef } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { App } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { useI18n } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function AndroidBackButtonHandler() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { lang } = useI18n();
  const [showExitDialog, setShowExitDialog] = useState(false);

  const showExitDialogRef = useRef(showExitDialog);
  showExitDialogRef.current = showExitDialog;

  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isMounted = true;
    let listener: PluginListenerHandle | null = null;

    App.addListener("backButton", ({ canGoBack }) => {
      // 1. If Exit Dialog is already open, pressing back cancels/dismisses it
      if (showExitDialogRef.current) {
        setShowExitDialog(false);
        return;
      }

      // 2. If any other modal, sheet drawer, dropdown menu, or search input is open, close it first
      const openModal = document.querySelector(
        '[role="dialog"][data-state="open"]:not([data-exit-dialog]), [role="alertdialog"][data-state="open"]:not([data-exit-dialog]), [role="menu"][data-state="open"], [role="listbox"][data-state="open"]',
      );
      const searchInput = document.querySelector<HTMLInputElement>("header input");

      if (openModal || searchInput) {
        const eventInit: KeyboardEventInit = {
          key: "Escape",
          code: "Escape",
          bubbles: true,
          cancelable: true,
        };
        const activeEl =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        activeEl?.dispatchEvent(new KeyboardEvent("keydown", eventInit));
        document.dispatchEvent(new KeyboardEvent("keydown", eventInit));
        window.dispatchEvent(new KeyboardEvent("keydown", eventInit));
        activeEl?.blur();
        return;
      }

      // 3. If on Home screen ("/"), show Exit confirmation dialog
      const currentPath = pathnameRef.current;
      const isHome = currentPath === "/" || currentPath === "" || currentPath === "/index";
      if (isHome) {
        setShowExitDialog(true);
        return;
      }

      // 4. If on a subpage, navigate back in history
      if (canGoBack || window.history.length > 1) {
        router.history.back();
      } else {
        router.navigate({ to: "/" });
      }
    }).then((handle) => {
      if (!isMounted) {
        handle.remove();
      } else {
        listener = handle;
      }
    });

    return () => {
      isMounted = false;
      listener?.remove();
    };
  }, [router]);

  return (
    <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
      <AlertDialogContent data-exit-dialog="true" className="max-w-[340px] rounded-2xl p-5">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center font-serif text-lg font-bold">
            {lang === "en" ? "Exit App?" : "ऐप बंद करें?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm text-muted-foreground">
            {lang === "en"
              ? "Are you sure you want to exit Abhi Tak?"
              : "क्या आप वाकई अभी तक ऐप से बाहर निकलना चाहते हैं?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 flex flex-row gap-2 sm:justify-center">
          <AlertDialogCancel
            onClick={() => setShowExitDialog(false)}
            className="mt-0 flex-1 rounded-xl"
          >
            {lang === "en" ? "Cancel" : "रद्द करें"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setShowExitDialog(false);
              App.exitApp();
            }}
            className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {lang === "en" ? "Exit App" : "ऐप बंद करें"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
