import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Calendar, 
  IndianRupee, // Using generic rupee or text Rs.
  Users, 
  Plus, 
  Eye, 
  Download, 
  Send,
  Loader
} from 'lucide-react';
import { invoiceService } from '../../services/invoiceService';
import { downloadInvoicePDF } from '../../lib/pdf/generator';
import { generateWhatsAppLink } from '../../lib/whatsapp/helper';
import { Invoice, Business } from '../../types';
import { Button } from '../../components/ui/Button';

interface DashboardPageProps {
  business: Business;
  userName: string;
  onToast: (msg: string, type: 'success' | 'error') => void;
  onNavigate: (path: string) => void;
  plan?: 'free' | 'pro';
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  business,
  userName,
  onToast,
  onNavigate,
  plan = 'free',
}) => {
  const [stats, setStats] = useState({
    totalInvoices: 0,
    invoicesThisMonth: 0,
    totalSales: 0,
    totalCustomers: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const dashboardStats = await invoiceService.getDashboardStats();
        const allInvoices = await invoiceService.getInvoices();
        
        setStats(dashboardStats);
        setRecentInvoices(allInvoices.slice(0, 5)); // Keep only top 5 recent invoices
      } catch (err: any) {
        console.error('Failed to load dashboard:', err);
        onToast('Failed to load dashboard statistics.', 'error');
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [onToast]);

  const handleDownloadPDF = async (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    setDownloadingId(invoice.id);
    onToast('Generating PDF, please wait...', 'success');

    // Create a temporary hidden preview DOM element in the body to render the PDF properly
    const tempDiv = document.createElement('div');
    tempDiv.id = `temp-print-${invoice.id}`;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    document.body.appendChild(tempDiv);

    // Fetch detailed invoice including items
    const detailed = await invoiceService.getInvoiceById(invoice.id);
    if (!detailed) {
      onToast('Failed to retrieve invoice details for PDF.', 'error');
      document.body.removeChild(tempDiv);
      setDownloadingId(null);
      return;
    }

    // Render invoice HTML inside temporary container
    tempDiv.innerHTML = `
      <div id="invoice-paper-render" class="invoice-paper">
        <div class="invoice-paper-header">
          <div>
            ${business.logo_url && plan === 'pro' ? `<img src="${business.logo_url}" class="invoice-paper-logo" alt="Logo" />` : `<h2 style="color: #09090b; font-family: 'Space Grotesk'; font-weight: 800; font-size: 1.25rem; text-transform: uppercase; margin: 0">${business.name}</h2>`}
            <p style="font-size: 0.8rem; margin-top: 4px; color: #57534e">${business.address || ''}</p>
            <p style="font-size: 0.8rem; color: #57534e">Phone: ${business.phone || ''} | Email: ${business.email || ''}</p>
          </div>
          <div class="invoice-paper-meta">
            <h1 class="invoice-paper-title">INVOICE</h1>
            <p style="font-weight: 600; font-size: 1rem; color: #0f172a; margin-top: 4px">${detailed.invoice_number}</p>
            <p style="font-size: 0.8rem; color: #57534e; margin-top: 4px">Date: ${new Date(detailed.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div class="invoice-paper-details">
          <div>
            <h4 style="color: #57534e; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px">Billed To:</h4>
            <p style="font-weight: 600; color: #0f172a">${detailed.customer_name || 'Walk-in Customer'}</p>
            <p style="font-size: 0.8rem; color: #44403c">${detailed.customer_phone || ''}</p>
            <p style="font-size: 0.8rem; color: #44403c">${detailed.customer_email || ''}</p>
          </div>
          <div style="text-align: right">
            <h4 style="color: #57534e; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px">Status:</h4>
            <span style="display: inline-block; padding: 2px 8px; font-size: 0.75rem; font-weight: 600; border-radius: 9999px; background-color: ${detailed.status === 'Paid' ? '#d1fae5' : '#fee2e2'}; color: ${detailed.status === 'Paid' ? '#065f46' : '#991b1b'}">${detailed.status.toUpperCase()}</span>
          </div>
        </div>

        <table class="invoice-paper-table">
          <thead>
            <tr>
              <th style="text-align: left">Description</th>
              <th style="text-align: center; width: 60px">Qty</th>
              <th style="text-align: right; width: 100px">Price</th>
              <th style="text-align: right; width: 100px">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(detailed.items || []).map(item => `
              <tr>
                <td>${item.description}</td>
                <td style="text-align: center">${item.quantity}</td>
                <td style="text-align: right">${business.currency} ${item.unit_price.toLocaleString()}</td>
                <td style="text-align: right">${business.currency} ${item.total.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: start; margin-top: auto; border-top: 1px solid #e7e5e4; padding-top: var(--space-md)">
          <div class="invoice-paper-notes" style="width: 60%; border-top: none; padding-top: 0">
            ${detailed.notes ? `
              <h4 style="font-size: 0.75rem; color: #57534e; margin-bottom: 2px">Terms & Notes:</h4>
              <p style="font-size: 0.75rem; color: #57534e; margin: 0; white-space: pre-wrap">${detailed.notes}</p>
            ` : ''}
          </div>
          <div class="invoice-paper-totals" style="margin-bottom: 0">
            <div class="invoice-paper-totals-row">
              <span>Subtotal:</span>
              <span>${business.currency} ${detailed.subtotal.toLocaleString()}</span>
            </div>
            ${detailed.discount > 0 ? `
              <div class="invoice-paper-totals-row">
                <span>Discount:</span>
                <span>-${business.currency} ${detailed.discount.toLocaleString()}</span>
              </div>
            ` : ''}
            <div class="invoice-paper-totals-row grand-total" style="border-top: 1px solid #e7e5e4; margin-top: 4px">
              <span>Grand Total:</span>
              <span>${business.currency} ${detailed.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div class="invoice-paper-footer">
          <p>Thank you for shopping with ${business.name}!</p>
          ${plan !== 'pro' ? `
            <p style="font-size: 0.65rem; color: #a8a29e; margin-top: 4px">Generated via BillZap</p>
          ` : ''}
        </div>
      </div>
    `;

    const customerNameStr = detailed.customer_name || 'Walk-in-Customer';
    const fileName = `${detailed.invoice_number}-${customerNameStr.replace(/\s+/g, '-')}.pdf`;
    
    // Download the PDF from the generated element
    const success = await downloadInvoicePDF('invoice-paper-render', fileName);

    // Clean up temporary DOM element
    document.body.removeChild(tempDiv);
    setDownloadingId(null);

    if (success) {
      onToast('Invoice PDF downloaded successfully!', 'success');
    } else {
      onToast('Failed to generate PDF. Please try again.', 'error');
    }
  };

  const handleWhatsApp = (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    if (!invoice.customer_phone) {
      onToast('This customer does not have a phone number configured.', 'error');
      return;
    }

    const link = generateWhatsAppLink(invoice.customer_phone, {
      customerName: invoice.customer_name || 'Customer',
      invoiceNumber: invoice.invoice_number,
      amount: invoice.total,
      currency: business.currency,
      businessName: business.name
    });

    onToast('Redirecting to WhatsApp Click-to-Chat. Please remember to attach the downloaded PDF invoice!', 'success');
    
    // Wait briefly for user to read toast before deep-linking
    setTimeout(() => {
      window.open(link, '_blank');
    }, 1500);
  };

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good morning';
    if (hrs < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const currencySymbol = business.currency === 'PKR' ? 'Rs.' : business.currency;

  if (isLoading) {
    return (
      <div className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
          <div className="skeleton" style={{ width: '220px', height: '2rem' }} />
          <div className="skeleton" style={{ width: '120px', height: '2.5rem' }} />
        </div>
        <div className="metrics-grid">
          <div className="skeleton" style={{ height: '100px' }} />
          <div className="skeleton" style={{ height: '100px' }} />
          <div className="skeleton" style={{ height: '100px' }} />
          <div className="skeleton" style={{ height: '100px' }} />
        </div>
        <div className="skeleton" style={{ height: '300px', marginTop: 'var(--space-xl)' }} />
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            {getGreeting()}, <span style={{ color: 'var(--color-primary)' }}>{userName.split(' ')[0] || 'Partner'}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage invoices for <strong style={{ color: '#ffffff' }}>{business.name}</strong>.
          </p>
        </div>
        <Button 
          onClick={() => window.location.hash = '#invoice-create'}
          icon={<Plus size={16} />}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
            border: 'none',
            padding: '0.7rem 1.4rem',
            color: '#09090b',
            fontWeight: 600
          }}
        >
          Create Invoice
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div>
            <div className="metric-label">Total Sales</div>
            <div className="metric-value">{currencySymbol} {stats.totalSales.toLocaleString()}</div>
          </div>
          <div className="metric-icon">
            <span style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{currencySymbol}</span>
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-label">Total Invoices</div>
            <div className="metric-value">{stats.totalInvoices}</div>
          </div>
          <div className="metric-icon">
            <FileText size={20} />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-label">Invoices This Month</div>
            <div className="metric-value">{stats.invoicesThisMonth}</div>
          </div>
          <div className="metric-icon">
            <Calendar size={20} />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-label">Customers</div>
            <div className="metric-value">{stats.totalCustomers}</div>
          </div>
          <div className="metric-icon">
            <Users size={20} />
          </div>
        </div>
      </div>

      {/* Recent Invoices Panel */}
      <div className="card" style={{ padding: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h3 style={{ fontSize: '1.15rem' }}>Recent Invoices</h3>
          <button 
            className="btn btn-outline" 
            onClick={() => onNavigate('invoices')}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            View All
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="empty-state">
            <FileText size={40} className="empty-state-icon" />
            <p>No invoices created yet.</p>
            <Button 
              onClick={() => window.location.hash = '#invoice-create'}
              variant="outline"
              icon={<Plus size={14} />}
            >
              Create Your First Invoice
            </Button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr 
                    key={inv.id}
                    onClick={() => window.location.hash = `#invoice-detail?id=${inv.id}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                    <td>{inv.customer_name}</td>
                    <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td>{currencySymbol} {inv.total.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${inv.status === 'Paid' ? 'badge-success' : 'badge-danger'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 'var(--space-2xs)' }}>
                        <button
                          className="btn btn-outline btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.hash = `#invoice-detail?id=${inv.id}`;
                          }}
                          title="View Invoice"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn btn-outline btn-icon"
                          onClick={(e) => handleDownloadPDF(e, inv)}
                          disabled={downloadingId === inv.id}
                          title="Download PDF"
                        >
                          {downloadingId === inv.id ? (
                            <Loader size={14} style={{ animation: 'skeletonLoading 1s linear infinite' }} />
                          ) : (
                            <Download size={14} />
                          )}
                        </button>
                        {inv.customer_phone && (
                          <button
                            className="btn btn-outline btn-icon"
                            onClick={(e) => handleWhatsApp(e, inv)}
                            title="Send via WhatsApp"
                            style={{ borderColor: 'rgba(16, 185, 129, 0.3)', color: 'var(--color-primary)' }}
                          >
                            <Send size={14} />
                          </button>
                        )}
                      </div>
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
