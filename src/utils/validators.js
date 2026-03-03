export function validateToken(token) {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  const tokenRegex = /^[A-Za-z0-9]{32,}$/;
  return tokenRegex.test(trimmed);
}

// ... (rest of the functions remain unchanged)