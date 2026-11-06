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
