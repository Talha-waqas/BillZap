import { supabase } from '../lib/supabase/client';
import { Invoice, InvoiceItem, Business } from '../types';
import { calculateInvoiceTotals } from '../lib/validation/invoice';

export const invoiceService = {
  /**
   * Fetch all invoices for the authenticated user, joined with basic customer info
   */
  async getInvoices(): Promise<Invoice[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('invoices')
      .select('*, customers(name, phone, email)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      throw new Error(error.message);
    }

    return (data || []).map((inv: any) => ({
      ...inv,
      // If customer was deleted or not linked, fall back to snapshot values
      customer_name: inv.customers?.name || inv.customer_name || 'Walk-in Customer',
      customer_phone: inv.customers?.phone || inv.customer_phone || '',
      customer_email: inv.customers?.email || inv.customer_email || '',
    }));
  },

  /**
   * Fetch a single invoice by ID, including its line items
   */
  async getInvoiceById(id: string): Promise<Invoice | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('*, customers(name, phone, email)')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (invError) {
      console.error('Error fetching invoice:', invError);
      return null;
    }
    if (!invoice) return null;

    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);

    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
      return null;
    }

    return {
      ...invoice,
      customer_name: invoice.customers?.name || invoice.customer_name || 'Walk-in Customer',
      customer_phone: invoice.customers?.phone || invoice.customer_phone || '',
      customer_email: invoice.customers?.email || invoice.customer_email || '',
      items: items || [],
    };
  },

  /**
   * Create a new invoice. Automatically increments the sequence number on the business profile
   * and builds the final prefixed invoice number.
   */
  async createInvoice(invoiceData: {
    customer_id?: string | null;
    status: 'Paid' | 'Unpaid';
    notes?: string;
    discount: number;
    items: Omit<InvoiceItem, 'id' | 'invoice_id'>[];
    // Snapshotted customer info
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
  }): Promise<Invoice> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    // 1. Fetch the user's business record to retrieve prefix and increment counter
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (bizError) throw new Error('Failed to load business profile: ' + bizError.message);
    if (!business) throw new Error('Please set up your business profile first.');

    // Calculate totals server-side/service-side for validation
    const { subtotal, total } = calculateInvoiceTotals(invoiceData.items, invoiceData.discount);

    // 2. Increment sequence number
    const nextSequence = (business.last_invoice_number || 0) + 1;
    
    // Update the business sequence counter
    const { error: updateBizError } = await supabase
      .from('businesses')
      .update({ last_invoice_number: nextSequence })
      .eq('id', business.id);

    if (updateBizError) throw new Error('Failed to generate invoice sequence: ' + updateBizError.message);

    // 3. Format invoice number (e.g. INV-0024)
    const formattedNumber = `${business.invoice_prefix}${nextSequence.toString().padStart(4, '0')}`;

    // 4. Save main invoice
    const { data: invoice, error: insertInvError } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        customer_id: invoiceData.customer_id || null,
        invoice_number: formattedNumber,
        sequence_number: nextSequence,
        subtotal,
        discount: invoiceData.discount,
        total,
        status: invoiceData.status,
        notes: invoiceData.notes || null,
        customer_name: invoiceData.customer_name || null,
        customer_phone: invoiceData.customer_phone || null,
        customer_email: invoiceData.customer_email || null,
      })
      .select()
      .single();

    if (insertInvError) {
      // If saving fails, roll back the sequence counter if needed (optional, but keep simple)
      throw new Error('Failed to save invoice: ' + insertInvError.message);
    }

    // 5. Save invoice line items
    const itemsToInsert = invoiceData.items.map((item) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
    }));

    const { error: insertItemsError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert);

    if (insertItemsError) {
      // Clean up orphaned invoice
      await supabase.from('invoices').delete().eq('id', invoice.id);
      throw new Error('Failed to save invoice line items: ' + insertItemsError.message);
    }

    return {
      ...invoice,
      items: itemsToInsert,
    } as Invoice;
  },

  /**
   * Edit/Update an existing invoice and its line items.
   */
  async updateInvoice(
    id: string,
    invoiceData: {
      customer_id?: string | null;
      status: 'Paid' | 'Unpaid';
      notes?: string;
      discount: number;
      items: Omit<InvoiceItem, 'id' | 'invoice_id'>[];
      customer_name?: string;
      customer_phone?: string;
      customer_email?: string;
    }
  ): Promise<Invoice> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    // Calculate totals service-side
    const { subtotal, total } = calculateInvoiceTotals(invoiceData.items, invoiceData.discount);

    // 1. Update the main invoice record
    const { data: invoice, error: updateInvError } = await supabase
      .from('invoices')
      .update({
        customer_id: invoiceData.customer_id || null,
        subtotal,
        discount: invoiceData.discount,
        total,
        status: invoiceData.status,
        notes: invoiceData.notes || null,
        customer_name: invoiceData.customer_name || null,
        customer_phone: invoiceData.customer_phone || null,
        customer_email: invoiceData.customer_email || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateInvError) throw new Error('Failed to update invoice: ' + updateInvError.message);

    // 2. Cascade delete existing items
    const { error: deleteItemsError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', id);

    if (deleteItemsError) throw new Error('Failed to clear old line items: ' + deleteItemsError.message);

    // 3. Re-insert the updated items list
    const itemsToInsert = invoiceData.items.map((item) => ({
      invoice_id: id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
    }));

    const { error: insertItemsError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert);

    if (insertItemsError) throw new Error('Failed to save updated line items: ' + insertItemsError.message);

    return {
      ...invoice,
      items: itemsToInsert,
    } as Invoice;
  },

  /**
   * Delete an invoice (cascade delete handles line items)
   */
  async deleteInvoice(id: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting invoice:', error);
      throw new Error(error.message);
    }

    return true;
  },

  /**
   * Query summary stats for the dashboard page
   */
  async getDashboardStats(): Promise<{
    totalInvoices: number;
    invoicesThisMonth: number;
    totalSales: number;
    totalCustomers: number;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { totalInvoices: 0, invoicesThisMonth: 0, totalSales: 0, totalCustomers: 0 };
    }

    // 1. Fetch invoices totals & dates
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('total, created_at')
      .eq('user_id', user.id);

    if (invError) console.error('Stats fetch error (invoices):', invError);

    // 2. Fetch total customers count
    const { count: customersCount, error: custError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (custError) console.error('Stats fetch error (customers):', custError);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalInvoices = invoices?.length || 0;
    let invoicesThisMonth = 0;
    let totalSales = 0;

    invoices?.forEach((inv) => {
      totalSales += Number(inv.total);
      
      const invDate = new Date(inv.created_at);
      if (invDate >= startOfMonth) {
        invoicesThisMonth++;
      }
    });

    return {
      totalInvoices,
      invoicesThisMonth,
      totalSales: Math.round(totalSales * 100) / 100,
      totalCustomers: customersCount || 0,
    };
  },

  /**
   * Get invoice count for this calendar month (specifically for checking subscription limits)
   */
  async getInvoicesCountThisMonth(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { count, error } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth);

    if (error) {
      console.error('Error counting month invoices:', error);
      return 0;
    }

    return count || 0;
  }
};
