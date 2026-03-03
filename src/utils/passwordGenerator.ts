const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SPECIAL = '!@#$%^&*()_+-=[]{}|;:,.<>?';

export function generatePassword(length: number = 12): string {
  const allChars = UPPERCASE + LOWERCASE + NUMBERS + SPECIAL;

  // Ensure at least one character from each required group
  const required = [
    UPPERCASE[Math.floor(Math.random() * UPPERCASE.length)],
    LOWERCASE[Math.floor(Math.random() * LOWERCASE.length)],
    NUMBERS[Math.floor(Math.random() * NUMBERS.length)],
    SPECIAL[Math.floor(Math.random() * SPECIAL.length)],
  ];

  const remaining: string[] = [];
  for (let i = required.length; i < length; i++) {
    remaining.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Shuffle all characters together
  const all = [...required, ...remaining];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  return all.join('');
}
