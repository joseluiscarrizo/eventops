export function validateToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  const tokenRegex = /^[A-Za-z0-9]{32,}$/;
  return tokenRegex.test(trimmed);
}