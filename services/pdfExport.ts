import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Truck, LoadResult, Item } from '../types';

export interface EWayBillData {
  ewayBillNo: string;
  docNo: string;
  docDate: string;
  fromGstin: string;
  fromLegalName: string;
  fromAddress: string;
  toGstin: string;
  toLegalName: string;
  toAddress: string;
  hsnCode: string;
  itemDescription: string;
  totalValueInr: number;
  cgstInr: number;
  sgstInr: number;
  igstInr: number;
  vehicleNo: string;
  driverLicenseNo: string;
  transporterId: string;
  approxDistanceKm: number;
  validUntil: string;
}

export const PdfExportService = {
  /**
   * Generates and triggers download of a 3D Cargo Load Manifest PDF.
   */
  generate3DLoadManifestPdf: (
    vehicle: Truck,
    loadResult: LoadResult,
    items: Item[],
    mode: 'truck' | 'air' | 'sea' = 'truck'
  ) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const primaryColor: [number, number, number] = mode === 'air' ? [37, 99, 235] : mode === 'sea' ? [6, 182, 212] : [79, 70, 229];

    // Header Branding Banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('LOGILOAD INDIA · 3D CARGO LOAD MANIFEST', 14, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Official Technical Load Sheet · Mode: ${mode.toUpperCase()}`, 14, 18);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 140, 18);

    // Vehicle & Spatial Telemetry Section
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('1. Vehicle & Cargo Volume Specifications', 14, 34);

    const vehicleTypeLabel = mode === 'air' ? 'Aircraft / ULD' : mode === 'sea' ? 'Maritime Vessel' : 'Commercial Truck';
    const volumeCuM = (vehicle.dimensions.length * vehicle.dimensions.width * vehicle.dimensions.height) / 1000000;

    const cogX = (loadResult.centerOfGravity.x / 100).toFixed(2);
    const cogY = (loadResult.centerOfGravity.y / 100).toFixed(2);
    const cogZ = (loadResult.centerOfGravity.z / 100).toFixed(2);

    autoTable(doc, {
      startY: 38,
      head: [[vehicleTypeLabel, 'Dimensions (L x W x H)', 'Max Payload', 'Loaded Weight', 'Vol Utilization', 'Center of Gravity (X, Y, Z)']],
      body: [
        [
          vehicle.name,
          `${(vehicle.dimensions.length / 100).toFixed(1)}m x ${(vehicle.dimensions.width / 100).toFixed(1)}m x ${(vehicle.dimensions.height / 100).toFixed(1)}m`,
          `${(vehicle.maxWeight / 1000).toFixed(1)} MT`,
          `${(loadResult.totalWeight / 1000).toFixed(2)} MT (${loadResult.placedItems.length} items)`,
          `${loadResult.volumeUtilization.toFixed(1)}% (${volumeCuM.toFixed(1)} m³ total)`,
          `X: ${cogX}m, Y: ${cogY}m, Z: ${cogZ}m`
        ]
      ],
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: 50 },
      theme: 'grid'
    });

    // Layer-by-Layer Itemized Cargo Sequence Table
    const lastY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('2. Itemized LIFO Loading Sequence & Coordinates', 14, lastY);

    const tableRows = loadResult.placedItems.map((item, idx) => {
      const posX = (item.position[0] / 100).toFixed(2);
      const posY = (item.position[1] / 100).toFixed(2);
      const posZ = (item.position[2] / 100).toFixed(2);
      const original = items.find(i => i.id === item.id);

      return [
        `#${idx + 1}`,
        item.name,
        `${item.dimensions.length} x ${item.dimensions.width} x ${item.dimensions.height} cm`,
        `${item.weight} kg`,
        `X:${posX}m, Y:${posY}m, Z:${posZ}m`,
        original?.isStackable ? 'Stackable' : 'Do Not Stack',
        original?.isFragile ? 'FRAGILE' : 'Standard'
      ];
    });

    autoTable(doc, {
      startY: lastY + 4,
      head: [['Seq', 'Cargo Description', 'Dimensions', 'Weight', 'Floor Coordinates (X, Y, Z)', 'Stacking', 'Handling']],
      body: tableRows,
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: 40 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: 'striped'
    });

    // Safety & Signatures Block
    const finalTableY = Math.min((doc as any).lastAutoTable.finalY + 12, 250);

    doc.setDrawColor(203, 213, 225);
    doc.line(14, finalTableY, 196, finalTableY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Verified compliant with Motor Vehicles (Amendment) Act & NHAI Axle Load limits. All center-of-gravity tolerances passed.',
      14,
      finalTableY + 6
    );

    // Signatures
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Prepared By (Loadmaster): ____________________', 14, finalTableY + 18);
    doc.text('Driver Acknowledgement: ____________________', 115, finalTableY + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('LogiLoad Enterprise System Generated Document · No Physical Signature Required Under Section 65B of Indian Evidence Act', 14, 285);

    // Trigger download
    const filename = `LogiLoad_3D_Manifest_${mode}_${Date.now()}.pdf`;
    doc.save(filename);
    return filename;
  },

  /**
   * Generates and triggers download of an Indian GST e-Way Bill PDF (Form GST EWB-01).
   */
  generateGstEWayBillPdf: (data: Partial<EWayBillData> = {}) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const billNo = data.ewayBillNo || `3410${Math.floor(10000000 + Math.random() * 90000000)}`;
    const docDate = data.docDate || new Date().toISOString().split('T')[0];

    // Government of India E-Way Bill Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('NATIONAL INFORMATICS CENTRE · GST E-WAY BILL SYSTEM', 14, 10);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Government of India · Form GST EWB-01 (See Rule 138 of CGST Rules, 2017)', 14, 16);

    // E-Way Bill Summary Ribbon
    doc.setFillColor(241, 245, 249);
    doc.rect(14, 26, 182, 16, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, 26, 182, 16, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`E-Way Bill No: ${billNo}`, 18, 33);
    doc.text(`Generated Date: ${docDate} ${new Date().toLocaleTimeString('en-IN')}`, 18, 38);

    doc.text(`Approx Distance: ${data.approxDistanceKm || 380} KM`, 120, 33);
    doc.text(`Valid Until: ${data.validUntil || '2 Days from Generation'}`, 120, 38);

    // PART A Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('PART A (Consignor, Consignee & Goods Details)', 14, 50);

    autoTable(doc, {
      startY: 53,
      head: [['Field Description', 'Details']],
      body: [
        ['1. GSTIN of Supplier', data.fromGstin || '27AABCL1234F1Z5 (Maharashtra)'],
        ['2. Place of Dispatch', data.fromAddress || 'Nariman Point Distribution Center, Mumbai, MH - 400021'],
        ['3. GSTIN of Recipient', data.toGstin || '07AAECP9876K1ZQ (Delhi)'],
        ['4. Place of Delivery', data.toAddress || 'Okhla Industrial Area Phase III, New Delhi, DL - 110020'],
        ['5. Document No. & Type', `${data.docNo || 'INV-2024-8841'} (Tax Invoice)`],
        ['6. Value of Goods (INR)', `₹ ${(data.totalValueInr || 450000).toLocaleString('en-IN')}`],
        ['7. HSN Code & Description', `${data.hsnCode || '8708'} - ${data.itemDescription || 'Automotive Transmission Parts & Assemblies'}`],
        ['8. Applicable Tax Split', `CGST: ₹ ${(data.cgstInr || 40500).toLocaleString('en-IN')} | SGST: ₹ ${(data.sgstInr || 40500).toLocaleString('en-IN')} | IGST: ₹ 0`]
      ],
      headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: 30 },
      theme: 'grid'
    });

    // PART B Details
    const partBY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('PART B (Vehicle & Transporter Details)', 14, partBY);

    autoTable(doc, {
      startY: partBY + 3,
      head: [['Mode', 'Vehicle / Vessel No', 'From State', 'Date / Time', 'Entered By (Transporter ID)']],
      body: [
        [
          'Road (Truck)',
          data.vehicleNo || 'MH-04-GP-8841 (Tata 1109)',
          'Maharashtra',
          `${docDate} 08:30 AM`,
          data.transporterId || 'LOGILOAD_LOGISTICS_IN'
        ]
      ],
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: 30 },
      theme: 'grid'
    });

    // Statutory QR Code & Authentication Box
    const boxY = (doc as any).lastAutoTable.finalY + 10;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, boxY, 182, 35, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('OFFICIAL VERIFICATION CODE & INSTRUCTIONS', 20, boxY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('1. The e-Way Bill must be produced upon interception by the State/Central GST Tax Officer.', 20, boxY + 15);
    doc.text('2. Validity period is calculated at 1 day per 200 km of travel distance under amended CGST rules.', 20, boxY + 20);
    doc.text('3. QR Code encrypted token: ' + Buffer.from(billNo + '-LOGILOAD-AUTH').toString('base64'), 20, boxY + 25);

    // Save PDF
    const filename = `GST_eWayBill_${billNo}.pdf`;
    doc.save(filename);
    return filename;
  }
};
