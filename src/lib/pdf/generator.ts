import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Capture an HTML element by ID and export it as a high-fidelity A4 PDF.
 * Temporarily locks dimensions to A4 pixel ratios to guarantee a perfect 1-page layout.
 */
export async function downloadInvoicePDF(elementId: string, filename: string): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`PDF generation error: Element with ID '${elementId}' not found.`);
    return false;
  }

  try {
    // Preserve original styling
    const originalStyle = element.style.cssText;

    // Apply strict A4 rendering proportions (794px width by 1123px height matches A4 at 96 DPI)
    element.style.width = '794px';
    element.style.minHeight = '1123px';
    element.style.height = '1123px';
    element.style.padding = '40px';
    element.style.boxShadow = 'none';
    element.style.borderRadius = '0';
    element.style.backgroundColor = '#ffffff';

    const canvas = await html2canvas(element, {
      scale: 2, // High resolution scale factor
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Revert style changes in UI
    element.style.cssText = originalStyle;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Scale canvas image directly to fill A4 dimensions
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
    
    return true;
  } catch (error) {
    console.error('PDF Generation Failure:', error);
    return false;
  }
}
