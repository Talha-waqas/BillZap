import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  Eye, 
  Edit2, 
  Trash2, 
  Download, 
  Send,
  Filter,
  Loader
} from 'lucide-react';
import { invoiceService } from '../../services/invoiceService';
import { downloadInvoicePDF } from '../../lib/pdf/generator';
import { generateWhatsAppLink } from '../../lib/whatsapp/helper';
import { Invoice, Business } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

interface InvoicesPageProps {
  business: Business;
  onToast: (msg: string, type: 'success' | 'error') => void;
  plan?: 'free' | 'pro';
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({
  business,
  onToast,
  plan = 'free',
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Unpaid'>('All');
  const [isLoading, setIsLoading] = useState(true);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  // Delete confirm states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await invoiceService.getInvoices();
      setInvoices(data);
    } catch (err: any) {
      console.error(err);
      onToast('Failed to load invoices history.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleDownloadPDF = async (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    setDownloadingId(invoice.id);
    onToast('Generating PDF receipt...', 'success');

    const tempDiv = document.createElement('div');
    tempDiv.id = `temp-print-${invoice.id}`;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    document.body.appendChild(tempDiv);

    const detailed = await invoiceService.getInvoiceById(invoice.id);
    if (!detailed) {
      onToast('Failed to retrieve invoice details for PDF.', 'error');
      document.body.removeChild(tempDiv);
      setDownloadingId(null);
      return;
    }

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
    const success = await downloadInvoicePDF('invoice-paper-render', fileName);

    document.body.removeChild(tempDiv);
    setDownloadingId(null);

    if (success) {
      onToast('Invoice PDF downloaded successfully!', 'success');
    } else {
      onToast('Failed to generate PDF.', 'error');
    }
  };

  const handleWhatsApp = (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    if (!invoice.customer_phone) {
      onToast('Customer contact phone is required to send via WhatsApp.', 'error');
      return;
    }

    const link = generateWhatsAppLink(invoice.customer_phone, {
      customerName: invoice.customer_name || 'Customer',
      invoiceNumber: invoice.invoice_number,
      amount: invoice.total,
      currency: business.currency,
      businessName: business.name
    });

    onToast('Redirecting to WhatsApp. Please attach the downloaded PDF invoice!', 'success');
    setTimeout(() => {
      window.open(link, '_blank');
    }, 1500);
  };

  const handleOpenDelete = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await invoiceService.deleteInvoice(deleteId);
      onToast('Invoice deleted successfully.', 'success');
      setIsDeleteOpen(false);
      loadInvoices();
    } catch (err: any) {
      onToast(err.message || 'Failed to delete invoice.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter query logic
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.customer_name && inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = 
      statusFilter === 'All' || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const currencySymbol = business.currency === 'PKR' ? 'Rs.' : business.currency;

  if (isLoading) {
    return (
      <div className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
          <div className="skeleton" style={{ width: '150px', height: '2rem' }} />
          <div className="skeleton" style={{ width: '130px', height: '2.5rem' }} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
          <div className="skeleton" style={{ flex: 1, height: '40px' }} />
          <div className="skeleton" style={{ width: '150px', height: '40px' }} />
        </div>
        <div className="skeleton" style={{ height: '350px' }} />
      </div>
    );
  }

  return (
    <div className="main-content">
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Invoices</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Search, export, share, or manage your billing history logs.
          </p>
        </div>
        <Button 
          onClick={() => window.location.hash = '#invoice-create'}
          icon={<Plus size={16} />}
        >
          Create Invoice
        </Button>
      </div>

      {/* Filter panel */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>
            <Search size={18} />
          </span>
          <input
            type="text"
            className="form-control"
            placeholder="Search by invoice # or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-2xs)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '2px', backgroundColor: 'rgba(9, 9, 11, 0.5)' }}>
          {(['All', 'Paid', 'Unpaid'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: statusFilter === filter ? 'var(--border-color)' : 'transparent',
                color: statusFilter === filter ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: statusFilter === filter ? 600 : 500,
                transition: 'all 150ms ease'
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table grid */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {filteredInvoices.length === 0 ? (
          <div className="empty-state" style={{ border: 'none', padding: 'var(--space-2xl)' }}>
            <FileText size={40} className="empty-state-icon" />
            <p>{searchQuery || statusFilter !== 'All' ? 'No invoices match your filters.' : 'Your invoice history is empty.'}</p>
            {!searchQuery && statusFilter === 'All' && (
              <Button 
                onClick={() => window.location.hash = '#invoice-create'}
                variant="outline"
                icon={<Plus size={14} />}
              >
                Create Your First Invoice
              </Button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Billed Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
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
                      <div style={{ display: 'inline-flex', gap: 'var(--space-2xs)' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-outline btn-icon"
                          onClick={() => window.location.hash = `#invoice-detail?id=${inv.id}`}
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn btn-outline btn-icon"
                          onClick={() => window.location.hash = `#invoice-edit?id=${inv.id}`}
                          title="Edit Invoice"
                        >
                          <Edit2 size={14} />
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
                        <button
                          className="btn btn-outline btn-icon btn-danger"
                          onClick={() => handleOpenDelete(inv.id)}
                          title="Delete Invoice"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Alert */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Invoice Record"
      >
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
          Are you sure you want to delete this invoice? This operation cannot be undone and will permanently remove this financial record from your system history.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsDeleteOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDeleteConfirm}
            isLoading={isDeleting}
          >
            Delete Permanently
          </Button>
        </div>
      </Modal>

    </div>
  );
};
