export function validateToken(token) {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  const tokenRegex = /^[A-Za-z0-9]{32,}$/;
  return tokenRegex.test(trimmed);
}

export function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const phoneRegex = /^\+?[\d\s\-().]{7,20}$/;
  return phoneRegex.test(phone.trim());
}

export function validatePhoneNumber(phone) {
  return validatePhone(phone);
}