export function normalizeForMatching(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function isFormattingRequest(value: string): boolean {
  return /\b(format|formatting|professional|style|beautify|color|background|header)\b|dinh dang|chuyen nghiep|trinh bay|lam dep|to mau|mau sac|mau nen/.test(normalizeForMatching(value));
}
