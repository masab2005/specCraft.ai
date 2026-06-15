import PDFDocument from 'pdfkit';

export function compileMarkdownToPdfStream(markdownText) {
  const doc = new PDFDocument({ margin: 50 });
  const lines = markdownText.split('\n');

  // Simple Cover Header
  doc.fontSize(26).font('Helvetica-Bold').text('Software Requirements Specification', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Oblique').text('Generated automatically by specCraft_AI', { align: 'center' });
  doc.moveDown(2);

  lines.forEach((line) => {
    let cleanLine = line.trim();
    
    // Check if line starts with header
    if (cleanLine.startsWith('# ')) {
      doc.fontSize(22).font('Helvetica-Bold').text(cleanLine.substring(2));
      doc.moveDown(0.5);
    } else if (cleanLine.startsWith('## ')) {
      doc.fontSize(16).font('Helvetica-Bold').text(cleanLine.substring(3));
      doc.moveDown(0.4);
    } else if (cleanLine.startsWith('### ')) {
      doc.fontSize(13).font('Helvetica-Bold').text(cleanLine.substring(4));
      doc.moveDown(0.3);
    } else if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
      doc.fontSize(10).font('Helvetica').text('  • ' + cleanLine.substring(2), { indent: 15 });
      doc.moveDown(0.2);
    } else if (cleanLine === '---') {
      doc.moveDown(0.5);
      doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.x, doc.y).stroke();
      doc.moveDown(0.8);
    } else if (cleanLine.length > 0) {
      doc.fontSize(10).font('Helvetica').text(cleanLine, { align: 'justify' });
      doc.moveDown(0.3);
    } else {
      // Empty line spacer
      doc.moveDown(0.2);
    }
  });

  doc.end();
  return doc;
}
