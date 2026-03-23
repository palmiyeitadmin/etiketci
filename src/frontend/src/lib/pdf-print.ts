export type PdfWindowOpener = (
  url: string,
  target: string,
  features?: string,
) => Window | null;

export function openPdfDocument(
  url: string | null | undefined,
  opener: PdfWindowOpener = (nextUrl, target, features) => window.open(nextUrl, target, features),
): boolean {
  if (!url) {
    return false;
  }

  const opened = opener(url, "_blank", "noopener,noreferrer");
  return opened !== null;
}
