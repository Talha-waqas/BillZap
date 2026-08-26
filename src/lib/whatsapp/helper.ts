/**
 * WhatsApp Helper Utilities
 */

/**
 * Clean and format phone numbers for WhatsApp wa.me links.
 * WhatsApp requires the number in full international format without any +, 00, spaces, or dashes.
 * Initial target: Pakistan (e.g., 0300-1234567 or +92 300 1234567 should format to 923001234567).
 */
export function formatWhatsAppPhone(phone: string): string {
  // Remove all non-digit characters
  let clean = phone.replace(/\D/g, '');

  // If Pakistani format starting with local 03... (11 digits)
  if (clean.length === 11 && clean.startsWith('03')) {
    clean = '92' + clean.slice(1);
  }
  // If Pakistani format starting with 3... (10 digits)
  else if (clean.length === 10 && clean.startsWith('3')) {
    clean = '92' + clean;
  }
  // If starts with 92 and has 12 digits (PK format)
  else if (clean.length === 12 && clean.startsWith('92')) {
    // Already correct
  }
  
  return clean;
}

/**
 * Validate that the phone number is standard (digits only, correct length range).
 */
export function validatePhone(phone: string): boolean {
  const clean = formatWhatsAppPhone(phone);
  // WhatsApp numbers are typically between 10 and 15 digits including country code
  return clean.length >= 10 && clean.length <= 15;
}

interface WhatsAppMessageArgs {
  customerName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  businessName: string;
}

/**
 * Generate the final WhatsApp wa.me link with pre-filled professional receipt message.
 */
export function generateWhatsAppLink(phone: string, args: WhatsAppMessageArgs): string {
  const formattedPhone = formatWhatsAppPhone(phone);
  
  const message = `Hello ${args.customerName},

Thank you for your purchase.

Invoice: ${args.invoiceNumber}
Amount: ${args.currency} ${args.amount.toLocaleString()}

Please find your invoice PDF attached to this chat.

Thank you for your business!

— ${args.businessName}`;

  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
}
