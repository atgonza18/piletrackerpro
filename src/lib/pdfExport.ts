import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFExportOptions {
  title: string;
  projectName?: string;
  projectLocation?: string;
  fileName?: string;
  orientation?: 'portrait' | 'landscape';
  filters?: {
    label: string;
    value: string;
  }[];
}

interface PileExportData {
  [key: string]: string | number;
}

/**
 * Export pile data to PDF with customizable options
 * @param data Array of pile data objects to export
 * @param options Configuration options for the PDF export
 */
export const exportToPDF = (
  data: PileExportData[],
  options: PDFExportOptions
) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const {
    title,
    projectName,
    projectLocation,
    fileName,
    orientation = 'landscape',
    filters = []
  } = options;

  // Create new PDF document
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  // Set up fonts and styling
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 15;

  // Add title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Add project information
  if (projectName || projectLocation) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (projectName) {
      doc.text(`Project: ${projectName}`, 14, yPosition);
      yPosition += 5;
    }

    if (projectLocation) {
      doc.text(`Location: ${projectLocation}`, 14, yPosition);
      yPosition += 5;
    }

    yPosition += 3;
  }

  // Add export date and time
  doc.setFontSize(9);
  doc.setTextColor(100);
  const exportDate = new Date().toLocaleString();
  doc.text(`Generated: ${exportDate}`, 14, yPosition);
  yPosition += 5;

  // Add pile count and refusal statistics
  const totalPiles = data.length;
  const refusalCount = data.filter((pile: any) =>
    pile.Status?.toLowerCase() === 'refusal'
  ).length;
  const acceptedCount = data.filter((pile: any) =>
    pile.Status?.toLowerCase() === 'accepted'
  ).length;
  const toleranceCount = data.filter((pile: any) =>
    pile.Status?.toLowerCase() === 'tolerance'
  ).length;
  const pendingCount = data.filter((pile: any) =>
    pile.Status?.toLowerCase() === 'pending'
  ).length;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60);
  doc.text(`Total Piles: ${totalPiles}`, 14, yPosition);
  yPosition += 5;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(22, 101, 52); // green
  doc.text(`  Accepted: ${acceptedCount} (${totalPiles > 0 ? ((acceptedCount / totalPiles) * 100).toFixed(1) : 0}%)`, 14, yPosition);
  yPosition += 4;

  doc.setTextColor(55, 48, 163); // indigo
  doc.text(`  Tolerance: ${toleranceCount} (${totalPiles > 0 ? ((toleranceCount / totalPiles) * 100).toFixed(1) : 0}%)`, 14, yPosition);
  yPosition += 4;

  doc.setTextColor(153, 27, 27); // red
  doc.text(`  Refusal: ${refusalCount} (${totalPiles > 0 ? ((refusalCount / totalPiles) * 100).toFixed(1) : 0}%)`, 14, yPosition);
  yPosition += 4;

  doc.setTextColor(133, 77, 14); // yellow-brown
  doc.text(`  Pending: ${pendingCount} (${totalPiles > 0 ? ((pendingCount / totalPiles) * 100).toFixed(1) : 0}%)`, 14, yPosition);
  yPosition += 6;

  // Add active filters if any
  if (filters.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Active Filters:', 14, yPosition);
    yPosition += 4;

    doc.setFont('helvetica', 'normal');
    filters.forEach(filter => {
      doc.text(`  • ${filter.label}: ${filter.value}`, 14, yPosition);
      yPosition += 4;
    });

    yPosition += 2;
  }

  // Extract column headers from the first data object
  const columns = Object.keys(data[0]).map(key => ({
    header: key,
    dataKey: key
  }));

  // Calculate available width for the table
  const margins = { left: 10, right: 10, top: 10, bottom: 10 };
  const availableWidth = pageWidth - margins.left - margins.right;

  // Generate the table
  autoTable(doc, {
    startY: yPosition,
    columns: columns,
    body: data,
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 1.5,
      overflow: 'linebreak',
      halign: 'left',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [66, 66, 66],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 6.5,
      cellPadding: 2
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: margins,
    tableWidth: availableWidth,
    columnStyles: {
      'Status': { cellWidth: 16, halign: 'center' },
      'Pile ID': { cellWidth: 16 },
      'Block': { cellWidth: 13 },
      'Pile Type': { cellWidth: 24 },
      'Design Embedment (ft)': { cellWidth: 18, halign: 'right' },
      'Actual Embedment (ft)': { cellWidth: 18, halign: 'right' },
      'Duration': { cellWidth: 16 },
      'Drive Time (min)': { cellWidth: 15, halign: 'right' },
      'Drive Time Rating': { cellWidth: 18 },
      'Machine': { cellWidth: 14, halign: 'right' },
      'Start Date': { cellWidth: 18 },
      'Start Time': { cellWidth: 16 },
      'Stop Time': { cellWidth: 16 },
      'Start Z': { cellWidth: 13, halign: 'right' },
      'End Z': { cellWidth: 13, halign: 'right' },
      'Gain per 30s': { cellWidth: 15, halign: 'right' },
      'Notes': { cellWidth: 'auto' }
    },
    didParseCell: (data) => {
      // Color code the Status column
      if (data.column.dataKey === 'Status') {
        const status = data.cell.text[0]?.toLowerCase();
        if (status === 'accepted') {
          data.cell.styles.fillColor = [220, 252, 231]; // green-100
          data.cell.styles.textColor = [22, 101, 52]; // green-800
          data.cell.styles.fontStyle = 'bold';
        } else if (status === 'refusal') {
          data.cell.styles.fillColor = [254, 226, 226]; // red-100
          data.cell.styles.textColor = [153, 27, 27]; // red-800
          data.cell.styles.fontStyle = 'bold';
        } else if (status === 'tolerance') {
          data.cell.styles.fillColor = [224, 231, 255]; // indigo-100
          data.cell.styles.textColor = [55, 48, 163]; // indigo-800
          data.cell.styles.fontStyle = 'bold';
        } else if (status === 'pending') {
          data.cell.styles.fillColor = [254, 249, 195]; // yellow-100
          data.cell.styles.textColor = [133, 77, 14]; // yellow-800
          data.cell.styles.fontStyle = 'bold';
        }
      }

      // Color code Drive Time Rating column
      if (data.column.dataKey === 'Drive Time Rating') {
        const rating = data.cell.text[0]?.toLowerCase();
        if (rating === 'optimal') {
          data.cell.styles.textColor = [22, 101, 52]; // green-800
        } else if (rating === 'suboptimal') {
          data.cell.styles.textColor = [202, 138, 4]; // yellow-700
        } else if (rating === 'slow') {
          data.cell.styles.textColor = [153, 27, 27]; // red-800
        }
      }
    },
    didDrawPage: (data) => {
      // Don't draw page numbers here - will be added after all pages are generated
    }
  });

  // After the table is complete, update all page numbers with the correct total
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Draw a white rectangle to clear any existing text
    doc.setFillColor(255, 255, 255);
    doc.rect(pageWidth / 2 - 30, pageHeight - 12, 60, 6, 'F');

    // Draw the page number
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }


  // Generate filename with timestamp if not provided
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const defaultFileName = `${projectName?.replace(/[^a-zA-Z0-9]/g, '_') || 'export'}_${timestamp}.pdf`;
  const finalFileName = fileName || defaultFileName;

  // Save the PDF
  doc.save(finalFileName);
};

/**
 * Export block summary data to PDF
 */
export const exportBlocksToPDF = (
  blocks: any[],
  options: PDFExportOptions
) => {
  if (!blocks || blocks.length === 0) {
    throw new Error('No block data to export');
  }

  const blockData = blocks.map(block => ({
    'Block': block.name,
    'Total Piles': block.totalPiles,
    'Refusal': block.refusalCount,
    'Tolerance': block.toleranceCount,
    'Slow Drive': block.slowDriveTimeCount,
    'Avg Drive Time (min)': block.averageDriveTime?.toFixed(1) || 'N/A',
    'Avg Embedment (ft)': block.averageEmbedment?.toFixed(2) || 'N/A',
    'Design Embedment (ft)': block.designEmbedment?.toFixed(2) || 'N/A'
  }));

  exportToPDF(blockData, {
    ...options,
    orientation: 'landscape'
  });
};
