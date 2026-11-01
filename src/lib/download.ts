/**
 * Downloading a file the server built.
 *
 * Fetched rather than navigated to, so a refusal arrives as a message on the
 * screen instead of replacing the page with a line of JSON — which is what
 * happens when an export is a plain link and the session has expired.
 */
export async function downloadFile(url: string, fallbackName = 'export.xlsx'): Promise<void> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    let message = 'The export failed.';
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* a non-JSON failure keeps the generic message */
    }
    throw new Error(message);
  }

  // The server names the file; this is only the fallback.
  const disposition = res.headers.get('content-disposition') || '';
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const name = match?.[1] || fallbackName;

  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
