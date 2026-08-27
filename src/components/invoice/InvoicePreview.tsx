import React from 'react';
import { Business, Customer, InvoiceItem } from '../../types';

interface InvoicePreviewProps {
  business: Business;
  plan?: 'free' | 'pro';
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: Omit<InvoiceItem, 'id' | 'invoice_id'>[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'Paid' | 'Unpaid';
  notes: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  previewElementId?: string;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  business,
  plan = 'free',
  customerName,
  customerPhone,
  customerEmail,
  items,
  subtotal,
  discount,
  total,
  status,
  notes,
  invoiceNumber = 'INV-xxxx',
  invoiceDate = new Date().toLocaleDateString(),
  previewElementId = 'invoice-paper-preview',
}) => {
  const currencySymbol = business.currency === 'PKR' ? 'Rs.' : business.currency;

  return (
    <div className="invoice-preview-container no-print">
      <div 
        id={previewElementId} 
        className="invoice-paper" 
        style={{ transformOrigin: 'top center' }}
      >
        {/* Header Block */}
        <div className="invoice-paper-header">
          <div>
            {business.logo_url && plan === 'pro' ? (
              <img 
                src={business.logo_url} 
                className="invoice-paper-logo" 
                alt="Business Logo" 
              />
            ) : (
              <h2 style={{ color: '#09090b', fontFamily: 'var(--font-heading)', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.02em', fontSize: '1.25rem', fontWeight: 800 }}>
                {business.name || 'Your Business'}
              </h2>
            )}
            <p style={{ fontSize: '0.8rem', color: '#57534e', marginTop: 'var(--space-2xs)' }}>
              {business.address}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#78716c' }}>
              {business.phone ? `Phone: ${business.phone}` : ''} 
              {business.email ? ` | Email: ${business.email}` : ''}
            </p>
          </div>

          <div className="invoice-paper-meta">
            <h1 className="invoice-paper-title">INVOICE</h1>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginTop: '4px' }}>
              {invoiceNumber}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#57534e', marginTop: '4px' }}>
              Date: {invoiceDate}
            </p>
          </div>
        </div>

        {/* Client details Block */}
        <div className="invoice-paper-details">
          <div>
            <h4 style={{ color: '#78716c', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Billed To:
            </h4>
            <p style={{ fontWeight: 700, color: '#1c1917', fontSize: '0.95rem' }}>
              {customerName || 'Walk-in Customer'}
            </p>
            {customerPhone && <p style={{ fontSize: '0.8rem', color: '#44403c' }}>{customerPhone}</p>}
            {customerEmail && <p style={{ fontSize: '0.8rem', color: '#44403c' }}>{customerEmail}</p>}
          </div>

          <div style={{ textAlign: 'right' }}>
            <h4 style={{ color: '#78716c', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Payment Status:
            </h4>
            <span 
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '9999px',
                backgroundColor: status === 'Paid' ? '#d1fae5' : '#fee2e2',
                color: status === 'Paid' ? '#065f46' : '#991b1b',
                textTransform: 'uppercase',
              }}
            >
              {status}
            </span>
          </div>
        </div>

        {/* Line Items Table */}
        <table className="invoice-paper-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Description</th>
              <th style={{ textAlign: 'center', width: '60px' }}>Qty</th>
              <th style={{ textAlign: 'right', width: '100px' }}>Unit Price</th>
              <th style={{ textAlign: 'right', width: '100px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#a8a29e', fontStyle: 'italic', padding: 'var(--space-md)' }}>
                  No items listed yet.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ wordBreak: 'break-word' }}>{item.description || 'New Item'}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity || 0}</td>
                  <td style={{ textAlign: 'right' }}>
                    {currencySymbol} {(item.unit_price || 0).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {currencySymbol} {((item.quantity || 0) * (item.unit_price || 0)).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Summary Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginTop: 'auto', borderTop: '1px solid #e7e5e4', paddingTop: 'var(--space-md)' }}>
          <div className="invoice-paper-notes" style={{ width: '60%', borderTop: 'none', paddingTop: 0 }}>
            {notes && (
              <>
                <h4 style={{ fontSize: '0.75rem', color: '#57534e', margin: '0 0 2px 0' }}>
                  Terms & Notes:
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#57534e', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {notes}
                </p>
              </>
            )}
          </div>

          <div className="invoice-paper-totals" style={{ marginBottom: 0 }}>
            <div className="invoice-paper-totals-row" style={{ fontSize: '0.8rem', color: '#44403c' }}>
              <span>Subtotal:</span>
              <span>{currencySymbol} {subtotal.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <div className="invoice-paper-totals-row" style={{ fontSize: '0.8rem', color: 'var(--color-danger)' }}>
                <span>Discount:</span>
                <span>-{currencySymbol} {discount.toLocaleString()}</span>
              </div>
            )}
            <div className="invoice-paper-totals-row grand-total" style={{ borderTop: '1px solid #e7e5e4', marginTop: '4px' }}>
              <span>Grand Total:</span>
              <span>{currencySymbol} {total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Brand footer */}
        <div className="invoice-paper-footer">
          <p>Thank you for your business!</p>
          {plan !== 'pro' && (
            <p style={{ fontSize: '0.6rem', color: '#a8a29e', marginTop: '4px' }}>
              Powered by BillZap
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
