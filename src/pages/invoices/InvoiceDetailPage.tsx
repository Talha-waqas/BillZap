import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Download, 
  Send, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Loader
} from 'lucide-react';
import { invoiceService } from '../../services/invoiceService';
import { supabase } from '../../lib/supabase/client';
import { downloadInvoicePDF } from '../../lib/pdf/generator';
import { generateWhatsAppLink } from '../../lib/whatsapp/helper';
import { Invoice, Business } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { InvoicePreview } from '../../components/invoice/InvoicePreview';

interface InvoiceDetailPageProps {
  invoiceId: string;
  business: Business;
  plan: 'free' | 'pro';
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export const InvoiceDetailPage: React.FC<InvoiceDetailPageProps> = ({
  invoiceId,
  business,
  plan,
  onToast,
}) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  // Delete modal states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadInvoiceDetails = async () => {
    if (!invoiceId) return;
    setIsLoading(true);
    try {
      const data = await invoiceService.getInvoiceById(invoiceId);
      if (data) {
        setInvoice(data);
      } else {
        onToast('Invoice not found.', 'error');
        window.location.hash = '#invoices';
      }
    } catch (err: any) {
      console.error(err);
      onToast('Failed to load invoice details.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoiceDetails();
  }, [invoiceId]);

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    setIsDownloading(true);
    onToast('Generating high-resolution PDF...', 'success');

    const customerNameStr = invoice.customer_name || 'Walk-in-Customer';
    const fileName = `${invoice.invoice_number}-${customerNameStr.replace(/\s+/g, '-')}.pdf`;
    const success = await downloadInvoicePDF('invoice-paper-preview', fileName);

    setIsDownloading(false);
    if (success) {
      onToast('PDF invoice downloaded successfully!', 'success');
    } else {
      onToast('Failed to generate PDF.', 'error');
    }
  };

  const handleWhatsApp = () => {
    if (!invoice) return;
    if (!invoice.customer_phone) {
      onToast('This customer profile has no phone number configured.', 'error');
      return;
    }

    const customerNameStr = invoice.customer_name || 'Customer';
    const link = generateWhatsAppLink(invoice.customer_phone, {
      customerName: customerNameStr,
      invoiceNumber: invoice.invoice_number,
      amount: invoice.total,
      currency: business.currency,
      businessName: business.name
    });

    onToast('Opening WhatsApp Click-to-Chat. Please remember to attach the downloaded PDF invoice!', 'success');
    setTimeout(() => {
      window.open(link, '_blank');
    }, 1500);
  };

  const togglePaymentStatus = async () => {
    if (!invoice) return;
    setIsStatusUpdating(true);
    const nextStatus = invoice.status === 'Paid' ? 'Unpaid' : 'Paid';

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id)
        .eq('user_id', business.user_id);

      if (error) throw error;
      
      setInvoice({ ...invoice, status: nextStatus });
      onToast(`Invoice marked as ${nextStatus}!`, 'success');
    } catch (err: any) {
      console.error(err);
      onToast('Failed to update payment status.', 'error');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!invoice) return;
    setIsDeleting(true);
    try {
      await invoiceService.deleteInvoice(invoice.id);
      onToast('Invoice permanently deleted.', 'success');
      setIsDeleteOpen(false);
      window.location.hash = '#invoices';
    } catch (err: any) {
      onToast(err.message || 'Failed to delete invoice.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <div className="skeleton" style={{ width: '80px', height: '1.5rem' }} />
        </div>
        <div className="invoice-grid">
          <div className="skeleton" style={{ height: '400px' }} />
          <div className="skeleton" style={{ height: '400px' }} />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Invoice not found or access denied.</p>
        <Button onClick={() => window.location.hash = '#invoices'} style={{ marginTop: 'var(--space-md)' }}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  return (
    <div className="main-content">
      
      {/* Back button */}
      <button 
        onClick={() => window.location.hash = '#invoices'}
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '4px', 
          color: 'var(--text-secondary)', 
          fontSize: '0.875rem',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          marginBottom: 'var(--space-lg)'
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to Invoices</span>
      </button>

      <div className="invoice-grid">
        
        {/* Printable preview card */}
        <div>
          <InvoicePreview
            business={business}
            plan={plan}
            customerName={invoice.customer_name || 'Walk-in Customer'}
            customerPhone={invoice.customer_phone || ''}
            customerEmail={invoice.customer_email || ''}
            items={invoice.items || []}
            subtotal={invoice.subtotal}
            discount={invoice.discount}
            total={invoice.total}
            status={invoice.status}
            notes={invoice.notes || ''}
            invoiceNumber={invoice.invoice_number}
            invoiceDate={new Date(invoice.created_at).toLocaleDateString()}
          />
        </div>

        {/* Action Panel side bar */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>Actions</h3>

          {/* Quick status summary info */}
          <div style={{ display: 'flex', gap: 'var(--space-sm)', padding: 'var(--space-sm)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255,255,255,0.01)', alignItems: 'center' }}>
            {invoice.status === 'Paid' ? (
              <CheckCircle2 size={36} style={{ color: 'var(--color-success)' }} />
            ) : (
              <XCircle size={36} style={{ color: 'var(--color-danger)' }} />
            )}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Invoice Status</div>
              <div style={{ fontWeight: 600 }}>Invoice is {invoice.status.toUpperCase()}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <Button
              onClick={handleDownloadPDF}
              isLoading={isDownloading}
              icon={<Download size={16} />}
              style={{ width: '100%' }}
            >
              Download PDF Invoice
            </Button>

            {invoice.customer_phone && (
              <Button
                onClick={handleWhatsApp}
                icon={<Send size={16} />}
                variant="outline"
                style={{ width: '100%', borderColor: 'rgba(16, 185, 129, 0.3)', color: 'var(--color-primary)' }}
              >
                Send via WhatsApp
              </Button>
            )}

            <Button
              onClick={togglePaymentStatus}
              isLoading={isStatusUpdating}
              variant="outline"
              style={{ width: '100%' }}
            >
              {invoice.status === 'Paid' ? 'Mark as Unpaid' : 'Mark as Paid'}
            </Button>
            
            <Button
              onClick={() => window.location.hash = `#invoice-edit?id=${invoice.id}`}
              variant="outline"
              icon={<Edit2 size={16} />}
              style={{ width: '100%' }}
            >
              Edit Invoice details
            </Button>

            <Button
              onClick={() => setIsDeleteOpen(true)}
              variant="danger"
              icon={<Trash2 size={16} />}
              style={{ width: '100%' }}
            >
              Delete Invoice
            </Button>
          </div>

          {/* Guide interactive tip */}
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            borderLeft: '3px solid var(--color-primary)',
            paddingLeft: 'var(--space-xs)',
            marginTop: 'var(--space-xs)'
          }}>
            <strong>WhatsApp Tip:</strong> Standard browsers don't allow attaching custom local files automatically. First download the PDF invoice, and then tap "Send via WhatsApp" to open the chat and attach it.
          </div>

        </div>

      </div>

      {/* Delete Confirmation Alert */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Invoice Record"
      >
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
          Are you sure you want to delete this invoice record? This operation cannot be undone and will permanently remove this transaction from your system history.
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
