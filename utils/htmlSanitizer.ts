function escapeHtml(unsafe: string): string { return unsafe.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

function sanitizeHtml(dirty: string): string { return escapeHtml(dirty); }

export { escapeHtml, sanitizeHtml };