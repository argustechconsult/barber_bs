import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InvoiceData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  planName: string;
  amount: number;
  paymentDate: string; // ISO or formatted date
  invoiceNumber: string;
}

export const generateInvoicePDF = (data: InvoiceData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Color Palette
  const amber = [245, 158, 11]; // #f59e0b
  const dark = [23, 23, 23]; // #171717

  // Header Background
  doc.setFillColor(dark[0], dark[1], dark[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Title / Logo
  doc.setTextColor(amber[0], amber[1], amber[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('STAYLER', 20, 25);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('BARBEARIA PREMIUM', 20, 32);

  // Invoice Label
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('FATURA', pageWidth - 20, 25, { align: 'right' });

  // Company Info
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('STAYLER - Gestão de Barbearia', 20, 50);
  doc.text('Estr. Velha de Maricá - Inoã', 20, 55);
  doc.text('Maricá - RJ, 24931-185', 20, 60);

  // Client Info
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE:', 20, 75);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${data.clientName}`, 20, 82);
  doc.text(`E-mail: ${data.clientEmail}`, 20, 87);
  doc.text(`WhatsApp: ${data.clientPhone}`, 20, 92);

  // Invoice Info (Right Side)
  doc.setFont('helvetica', 'bold');
  doc.text('DETALHES DA FATURA:', pageWidth - 80, 75);
  doc.setFont('helvetica', 'normal');
  doc.text(`Número: #${data.invoiceNumber}`, pageWidth - 80, 82);
  doc.text(`Data: ${data.paymentDate}`, pageWidth - 80, 87);

  // Line Separator
  doc.setDrawColor(230, 230, 230);
  doc.line(20, 100, pageWidth - 20, 100);

  // Table
  (doc as any).autoTable({
    startY: 110,
    head: [['Descrição', 'Quantidade', 'Preço Unitário', 'Total']],
    body: [
      [data.planName, '1', `R$ ${data.amount.toFixed(2)}`, `R$ ${data.amount.toFixed(2)}`],
    ],
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      font: 'helvetica',
      fontSize: 10,
    },
    columnStyles: {
      3: { halign: 'right' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Total Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`TOTAL PAGO: R$ ${data.amount.toFixed(2)}`, pageWidth - 20, finalY + 10, { align: 'right' });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Obrigado pela sua preferência!', pageWidth / 2, 280, { align: 'center' });
  doc.text('Este documento é um recibo eletrônico gerado pelo sistema STAYLER.', pageWidth / 2, 285, { align: 'center' });

  // Save PDF
  doc.save(`Fatura_STAYLER_${data.invoiceNumber}.pdf`);
};
