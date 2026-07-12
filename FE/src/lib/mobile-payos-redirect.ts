const APP_SCHEME = "mobile";

function isMobileBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * After PayOS redirects to the FE return/cancel pages, bounce mobile browsers
 * back into the native app via deep link (no BE change required).
 */
export function redirectMobilePayOsToApp(path: "return" | "cancel") {
  if (typeof window === "undefined" || !isMobileBrowser()) {
    return false;
  }

  const target = `${APP_SCHEME}://payment/${path}${window.location.search || ""}`;
  window.location.replace(target);
  return true;
}
