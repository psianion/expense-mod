/**
 * Formats a price amount in Indian Rupees (₹) with two display modes
 *
 * @param amount - The numeric amount to format
 * @param shortHand - If true, uses shorthand notation (K/L), otherwise full format with Indian comma notation
 * @returns Formatted price string with ₹ symbol
 */
export function formatPrice(amount: number | null | undefined, shortHand: boolean = false): string {
  // Handle null/undefined values
  if (amount == null || isNaN(amount)) {
    return '₹ —';
  }

  // Always round up to nearest rupee
  const roundedAmount = Math.ceil(amount);

  if (shortHand) {
    return formatShortHand(roundedAmount);
  } else {
    return formatFull(roundedAmount);
  }
}

/**
 * Formats amount in full Indian currency format with proper comma notation
 */
function formatFull(amount: number): string {
  // Use Indian locale for proper comma placement (1,23,456 format)
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);

  return `₹ ${formatted}`;
}

/**
 * Formats amount in shorthand notation using Indian conventions
 * - < 1,000: ₹ 435 (no suffix)
 * - >= 1,000 and < 1,00,000: ₹ 23.5k (thousands with 1 decimal)
 * - >= 1,00,000: ₹ 2.18L (lakhs with 2 decimals)
 */
function formatShortHand(amount: number): string {
  if (amount < 1000) {
    // No suffix for amounts under 1000
    return `₹ ${amount}`;
  } else if (amount < 100000) {
    // Thousands: divide by 1000, show 1 decimal place
    const thousands = amount / 1000;
    return `₹ ${thousands.toFixed(1)}k`;
  } else {
    // Lakhs: divide by 100000, show 2 decimal places for precision
    const lakhs = amount / 100000;
    return `₹ ${lakhs.toFixed(2)}L`;
  }
}