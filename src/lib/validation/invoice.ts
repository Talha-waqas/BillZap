/**
 * Invoice Calculation and Validation Engine
 */

import { InvoiceItem } from '../../types';

/**
 * Perform floating-point safe multiplication and rounding.
 * Rounds to 2 decimal places to prevent standard JS representation errors.
 */
export function safeRound(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates row total: quantity * unitPrice
 */
export function calculateItemTotal(quantity: number, unitPrice: number): number {
  if (quantity < 0 || unitPrice < 0) return 0;
  return safeRound(quantity * unitPrice);
}

/**
 * Calculates Invoice Subtotal (sum of items) and Grand Total (subtotal - discount)
 */
export function calculateInvoiceTotals(
  items: { quantity: number; unit_price: number }[],
  discount: number
): { subtotal: number; total: number } {
  const subtotal = items.reduce((sum, item) => {
    return safeRound(sum + calculateItemTotal(item.quantity, item.unit_price));
  }, 0);

  const safeDiscount = Math.max(0, discount);
  const total = Math.max(0, safeRound(subtotal - safeDiscount));

  return { subtotal, total };
}

/**
 * Validate form inputs prior to saving an invoice
 */
export interface ValidationError {
  field: string;
  message: string;
}

export function validateInvoiceForm(data: {
  customerName: string;
  customerPhone?: string;
  items: InvoiceItem[];
  discount: number;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  // Customer Name check
  if (!data.customerName || data.customerName.trim() === '') {
    errors.push({ field: 'customerName', message: 'Customer name is required.' });
  }

  // Items empty check
  if (data.items.length === 0) {
    errors.push({ field: 'items', message: 'At least one invoice line item is required.' });
  }

  // Check details inside items
  data.items.forEach((item, idx) => {
    if (!item.description || item.description.trim() === '') {
      errors.push({ field: `item-${idx}-description`, message: `Description is required for item ${idx + 1}.` });
    }
    if (item.quantity <= 0) {
      errors.push({ field: `item-${idx}-quantity`, message: `Quantity must be greater than 0 for item ${idx + 1}.` });
    }
    if (item.unit_price < 0) {
      errors.push({ field: `item-${idx}-price`, message: `Price cannot be negative for item ${idx + 1}.` });
    }
    if (isNaN(item.quantity) || isNaN(item.unit_price)) {
      errors.push({ field: `item-${idx}-calc`, message: `Invalid numeric value in item ${idx + 1}.` });
    }
  });

  // Discount validation
  const { subtotal } = calculateInvoiceTotals(data.items, 0);
  if (data.discount < 0) {
    errors.push({ field: 'discount', message: 'Discount cannot be negative.' });
  } else if (data.discount > subtotal) {
    errors.push({ field: 'discount', message: 'Discount cannot exceed subtotal amount.' });
  }

  return errors;
}
