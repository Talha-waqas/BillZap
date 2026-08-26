import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  FileText, 
  Phone, 
  Mail, 
  Calendar,
  IndianRupee,
  Eye
} from 'lucide-react';
import { customerService } from '../../services/customerService';
import { supabase } from '../../lib/supabase/client';
import { Customer, Invoice, Business } from '../../types';
import { Button } from '../../components/ui/Button';

interface CustomerDetailPageProps {
  customerId: string;
  business: Business;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export const CustomerDetailPage: React.FC<CustomerDetailPageProps> = ({
  customerId,
  business,
  onToast,
}) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCustomerDetails() {
      if (!customerId) return;
      setIsLoading(true);
      try {
        const details = await customerService.getCustomerById(customerId);
        setCustomer(details);

        // Fetch user's invoices specifically for this customer
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setInvoices(data || []);
      } catch (err: any) {
        console.error(err);
        onToast('Failed to load customer billing details.', 'error');
      } finally {
        setIsLoading(false);
      }
    }

    loadCustomerDetails();
  }, [customerId, onToast]);

  const currencySymbol = business.currency === 'PKR' ? 'Rs.' : business.currency;

  if (isLoading) {
    return (
      <div className="main-content">
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <div className="skeleton" style={{ width: '100px', height: '1.5rem' }} />
        </div>
        <div className="skeleton" style={{ width: '250px', height: '2.5rem', marginBottom: 'var(--space-md)' }} />
        <div className="metrics-grid">
          <div className="skeleton" style={{ height: '90px' }} />
          <div className="skeleton" style={{ height: '90px' }} />
        </div>
        <div className="skeleton" style={{ height: '250px', marginTop: 'var(--space-xl)' }} />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
          Customer profile not found or access denied.
        </p>
        <Button onClick={() => window.location.hash = '#customers'}>
          Back to Customers List
        </Button>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Back button */}
      <button 
        onClick={() => window.location.hash = '#customers'}
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '4px', 
          color: 'var(--text-secondary)', 
          fontSize: '0.875rem',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          marginBottom: 'var(--space-md)'
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to Customers</span>
      </button>

      {/* Customer Header Details */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-xs)' }}>{customer.name}</h1>
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {customer.phone && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} style={{ color: 'var(--text-muted)' }} />
              <span>{customer.phone}</span>
            </span>
          )}
          {customer.email && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} style={{ color: 'var(--text-muted)' }} />
              <span>{customer.email}</span>
            </span>
          )}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
            <span>Customer since {new Date(customer.created_at).toLocaleDateString()}</span>
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="metrics-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 'var(--space-xl)' }}>
        <div className="metric-card">
          <div>
            <div className="metric-label">Total Billed</div>
            <div className="metric-value">{currencySymbol} {customer.total_billed?.toLocaleString()}</div>
          </div>
          <div className="metric-icon">
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{currencySymbol}</span>
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-label">Total Invoices</div>
            <div className="metric-value">{customer.invoice_count}</div>
          </div>
          <div className="metric-icon">
            <FileText size={20} />
          </div>
        </div>
      </div>

      {/* Invoices Logs */}
      <div className="card" style={{ padding: 'var(--space-lg)' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: 'var(--space-md)' }}>Customer Invoice History</h3>
        
        {invoices.length === 0 ? (
          <div className="empty-state" style={{ border: 'none', padding: 'var(--space-xl)' }}>
            <FileText size={32} className="empty-state-icon" />
            <p>No invoices have been billed to this customer yet.</p>
            <Button 
              onClick={() => window.location.hash = `#invoice-create`}
              variant="outline"
            >
              Bill Invoice
            </Button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Billed Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr 
                    key={inv.id}
                    onClick={() => window.location.hash = `#invoice-detail?id=${inv.id}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                    <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td>{currencySymbol} {inv.total.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${inv.status === 'Paid' ? 'badge-success' : 'badge-danger'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-outline btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.hash = `#invoice-detail?id=${inv.id}`;
                        }}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
