const recoveryKey = "nito-crios-session-reloaded";

export function installIOSSessionRecovery(win: Window = window) {
  // CriOS also identifies Chrome's desktop-site mode on iPhone and iPad.
  if (!/\bCriOS\/\d/.test(win.navigator.userAgent)) return () => {};

  let pending = false;
  let attempted = false;

  function recover() {
    if (!pending || attempted || win.document.hidden) return;
    pending = false;
    attempted = true;
    try {
      // Keep this per-tab guard across reloads and later restored documents.
      // If storage is unavailable, skip recovery rather than risk a loop.
      const storage = win.sessionStorage;
      if (storage.getItem(recoveryKey)) return;
      storage.setItem(recoveryKey, "1");
      if (storage.getItem(recoveryKey) !== "1") return;
      win.location.reload();
    } catch {
      // Browser privacy settings can make even accessing sessionStorage throw.
    }
  }

  function restored(event: PageTransitionEvent) {
    const navigation = win.performance.getEntriesByType("navigation")[0] as
      PerformanceNavigationTiming | undefined;
    if (!event.persisted && navigation?.type !== "back_forward") return;
    pending = true;
    recover();
  }

  win.addEventListener("pageshow", restored);
  win.document.addEventListener("visibilitychange", recover);
  return () => {
    win.removeEventListener("pageshow", restored);
    win.document.removeEventListener("visibilitychange", recover);
  };
}
