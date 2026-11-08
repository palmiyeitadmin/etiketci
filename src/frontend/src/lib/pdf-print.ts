export type PdfWindowOpener = (
  url: string,
  target: string,
  features?: string,
) => Window | null;

/**
 * Opens the label PDF in a new tab and reports whether the browser allowed it.
 *
 * Do not pass "noopener" here: with that feature window.open always returns null,
 * which made every successful open look like a blocked popup. The opener link is
 * cut manually instead, so the PDF tab still cannot reach this page.
 */
export function openPdfDocument(
  url: string | null | undefined,
  opener: PdfWindowOpener = (nextUrl, target, features) => window.open(nextUrl, target, features),
): boolean {
  if (!url) {
    return false;
  }

  const opened = opener(url, "_blank");
  if (!opened) {
    return false;
  }

  try {
    opened.opener = null;
  } catch {
    // Some browsers make opener read-only for cross-origin documents; the tab is open either way.
  }

  return true;
}

export type PendingTab = {
  /** Points the tab at the PDF. Returns false if the tab is gone (blocked or closed). */
  navigate: (url: string) => boolean;
  close: () => void;
};

/**
 * Opens an empty tab right away, inside the click handler, so popup blockers allow it; the PDF URL is set
 * after the request that creates it returns. Returns null when the browser blocked the tab.
 */
export function openPendingTab(
  opener: PdfWindowOpener = (nextUrl, target, features) => window.open(nextUrl, target, features),
): PendingTab | null {
  const tab = opener("about:blank", "_blank");
  if (!tab) {
    return null;
  }

  try {
    tab.opener = null;
  } catch {
    // Not critical; the tab will load our own PDF.
  }

  return {
    navigate: (url: string) => {
      if (tab.closed) {
        return false;
      }
      tab.location.href = url;
      return true;
    },
    close: () => {
      if (!tab.closed) {
        tab.close();
      }
    },
  };
}
