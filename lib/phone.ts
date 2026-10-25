// Phone numbers are stored in international form (+923231483650) so the same customer matches
// however they typed it: 0323 1483650, 92-323-1483650, or a Shopify export's '+923231483650.
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim().replace(/^'/, "");
  const international = trimmed.startsWith("+") || trimmed.startsWith("00");
  const digits = trimmed.replace(/\D/g, "").replace(/^00/, "");

  if (international) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  // Pakistan: 92 and ten digits, 0 and ten digits, or a bare ten-digit mobile number (3xx).
  if (digits.length === 12 && digits.startsWith("92")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+92${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("3")) return `+92${digits}`;
  return null;
}

// For display: +92 300 1234567, the way Pakistani mobiles are written. Other numbers as stored.
export function formatPhone(phone: string) {
  const mobile = phone.match(/^\+92(3\d{2})(\d{7})$/);
  return mobile ? `+92 ${mobile[1]} ${mobile[2]}` : phone;
}
