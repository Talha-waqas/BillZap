import { supabase } from '../lib/supabase/client';
import { Customer } from '../types';

export const customerService = {
  /**
   * Fetch all customers belonging to the current user,
   * including computed stats (invoice count and total billed).
   */
  async getCustomers(): Promise<Customer[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Fetch customers along with invoice IDs and totals to calculate aggregations in client-side JS safely
    const { data, error } = await supabase
      .from('customers')
      .select('*, invoices(id, total)')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching customers:', error);
      throw new Error(error.message);
    }

    return (data || []).map((c: any) => {
      const invoices = c.invoices || [];
      const invoice_count = invoices.length;
      const total_billed = invoices.reduce((sum: number, inv: any) => sum + Number(inv.total), 0);

      return {
        id: c.id,
        user_id: c.user_id,
        name: c.name,
        phone: c.phone || '',
        email: c.email || '',
        created_at: c.created_at,
        updated_at: c.updated_at,
        invoice_count,
        total_billed,
      };
    });
  },

  /**
   * Fetch a single customer by ID
   */
  async getCustomerById(id: string): Promise<Customer | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('customers')
      .select('*, invoices(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching customer details:', error);
      return null;
    }
    if (!data) return null;

    const invoices = data.invoices || [];
    const invoice_count = invoices.length;
    const total_billed = invoices.reduce((sum: number, inv: any) => sum + Number(inv.total), 0);

    return {
      ...data,
      invoice_count,
      total_billed,
    };
  },

  /**
   * Create a new customer
   */
  async createCustomer(name: string, phone?: string, email?: string): Promise<Customer> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    const { data, error } = await supabase
      .from('customers')
      .insert({
        user_id: user.id,
        name,
        phone: phone || null,
        email: email || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      throw new Error(error.message);
    }

    return data as Customer;
  },

  /**
   * Update customer profile details
   */
  async updateCustomer(id: string, updates: { name: string; phone?: string; email?: string }): Promise<Customer> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    const { data, error } = await supabase
      .from('customers')
      .update({
        name: updates.name,
        phone: updates.phone || null,
        email: updates.email || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer:', error);
      throw new Error(error.message);
    }

    return data as Customer;
  },

  /**
   * Delete a customer profile
   */
  async deleteCustomer(id: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting customer:', error);
      throw new Error(error.message);
    }

    return true;
  }
};
