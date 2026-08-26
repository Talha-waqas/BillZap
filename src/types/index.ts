export interface Business {
  id: string;
  user_id: string;
  name: string;
  logo_url?: string;
  phone?: string;
  email?: string;
  address?: string;
  currency: string;
  invoice_prefix: string;
  last_invoice_number: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
  // Extra properties for management
  invoice_count?: number;
  total_billed?: number;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  customer_id?: string | null;
  invoice_number: string;
  sequence_number: number;
  subtotal: number;
  discount: number;
  total: number;
  status: 'Paid' | 'Unpaid';
  notes?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'pro';
  status: string;
  provider: string;
  provider_customer_id?: string;
  provider_subscription_id?: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}
