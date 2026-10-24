const grouping = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatPKR(amount: number) {
  if (!Number.isInteger(amount)) {
    throw new Error(`Money is whole rupees, got ${amount}`);
  }
  return `PKR ${grouping.format(amount)}`;
}
