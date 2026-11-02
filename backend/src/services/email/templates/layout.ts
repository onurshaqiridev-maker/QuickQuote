/**
 * Shared building blocks for all emails: the frame (header + footer) and small helpers.
 * Every email has an HTML version and a plain-text version.
 */

/** Makes user-written text safe to put inside HTML (nobody can inject code into an email). */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** A paragraph of (escaped) text. Line breaks are kept. */
export function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;line-height:1.5;">${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
}

/** A big clickable button. */
export function button(url: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${escapeHtml(url)}" style="background:#2563eb;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">${escapeHtml(label)}</a></p>`;
}

/** Wraps the email content in the Quotiva frame. `bodyHtml` must already be safe HTML. */
export function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="font-size:22px;font-weight:bold;color:#2563eb;margin-bottom:16px;">Quotiva</div>
    <div style="background:#ffffff;border-radius:8px;padding:24px;">
      <h1 style="font-size:20px;margin:0 0 16px;">${escapeHtml(title)}</h1>
      ${bodyHtml}
    </div>
    <p style="font-size:12px;color:#6b7280;margin-top:16px;">You receive this email because of activity on your Quotiva account.</p>
  </div>
</body>
</html>`;
}

/** A small two-column table of details, e.g. [["Service", "Haircut"], ["Price", "45.00 EUR"]]. Empty values are skipped. */
export function detailsTable(rows: [label: string, value: string | null][]): string {
  const cells = rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:4px 0;font-weight:bold;">${escapeHtml(value as string)}</td></tr>`,
    )
    .join('');
  return `<table style="margin:0 0 16px;border-collapse:collapse;">${cells}</table>`;
}

/** The plain-text version of `detailsTable`. */
export function detailsText(rows: [label: string, value: string | null][]): string {
  return rows
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
}
