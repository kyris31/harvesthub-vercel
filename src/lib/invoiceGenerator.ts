// Placeholder for PDF Generation Logic
// In a real application, you would use a library like pdf-lib or jsPDF
// and design the invoice layout according to specifications.

import { Sale, SaleItem, Customer, HarvestLog, PlantingLog, Crop, SeedBatch, db, Invoice } from './db';

interface CompanyInfo {
    name: string;
    addressLine1?: string;
    addressLine2?: string;
    contact?: string;
}

const KK_BIOFRESH_INFO: CompanyInfo = {
    name: "K.K. Biofresh",
    // Add address and contact if needed for the invoice header
};

async function getFullSaleDetails(saleId: string) {
    const sale = await db.sales.get(saleId);
    if (!sale) throw new Error("Sale not found");

    const items = await db.saleItems.where('sale_id').equals(saleId).toArray();
    let customer: Customer | undefined;
    if (sale.customer_id) {
        customer = await db.customers.get(sale.customer_id);
    }

    const detailedItems = await Promise.all(items.map(async (item) => {
        let productName = 'Unknown Product';
        let productDetails = '';
        if (item.harvest_log_id) {
            const harvestLog = await db.harvestLogs.get(item.harvest_log_id);
            if (harvestLog) {
                const plantingLog = await db.plantingLogs.get(harvestLog.planting_log_id);
                if (plantingLog && plantingLog.seed_batch_id) {
                    const seedBatch = await db.seedBatches.get(plantingLog.seed_batch_id);
                    if (seedBatch) {
                        const crop = await db.crops.get(seedBatch.crop_id);
                        productName = crop?.name || 'Unknown Crop';
                        productDetails = `(Batch: ${seedBatch.batch_code}, Harvested: ${new Date(harvestLog.harvest_date).toLocaleDateString()})`;
                    }
                } else if (plantingLog) {
                     // If no seed batch, maybe a generic crop was planted (not in current schema)
                     // For now, this path might not yield a crop name if seed_batch_id is missing
                }
            }
        }
        return {
            ...item,
            productName,
            productDetails
        };
    }));

    return { sale, items: detailedItems, customer };
}


export async function generateInvoiceHTML(saleId: string): Promise<string> {
    // This function would generate an HTML string representation of the invoice.
    // This HTML could then be converted to PDF using a server-side tool or a browser-based library.
    // For client-side only, you might directly draw to a canvas or use a library that builds PDFs from JS objects.

    const { sale, items, customer } = await getFullSaleDetails(saleId);
    const invoiceRecord = await db.invoices.where('sale_id').equals(saleId).first();

    if (!invoiceRecord) {
        return "<p>Invoice record not found for this sale.</p>";
    }

    let totalAmount = 0;
    items.forEach(item => {
        totalAmount += (item.quantity_sold * item.price_per_unit);
    });

    let html = `
        <div style="font-family: Arial, sans-serif; margin: 20px; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <style>
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
                .header h1 { margin: 0; color: #333; font-size: 24px; }
                .company-details p, .customer-details p, .invoice-details p { margin: 2px 0; font-size: 14px; color: #555;}
                .totals { text-align: right; margin-top: 20px; }
                .totals strong { font-size: 16px; color: #333; }
            </style>
            <div class="header">
                <div>
                    <h1>Invoice</h1>
                    <div class="company-details">
                        <p><strong>${KK_BIOFRESH_INFO.name}</strong></p>
                        ${KK_BIOFRESH_INFO.addressLine1 ? `<p>${KK_BIOFRESH_INFO.addressLine1}</p>` : ''}
                        ${KK_BIOFRESH_INFO.addressLine2 ? `<p>${KK_BIOFRESH_INFO.addressLine2}</p>` : ''}
                        ${KK_BIOFRESH_INFO.contact ? `<p>${KK_BIOFRESH_INFO.contact}</p>` : ''}
                    </div>
                </div>
                <div class="invoice-details" style="text-align: right;">
                    <p><strong>Invoice #:</strong> ${invoiceRecord.invoice_number}</p>
                    <p><strong>Date:</strong> ${new Date(invoiceRecord.invoice_date).toLocaleDateString()}</p>
                    <p><strong>Sale ID:</strong> ${sale.id.substring(0,8)}...</p>
                </div>
            </div>

            ${customer ? `
            <div class="customer-details" style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 5px; font-size: 16px; color: #333;">Bill To:</h3>
                <p><strong>${customer.name}</strong></p>
                ${customer.contact_info ? `<p>${customer.contact_info}</p>` : ''}
                ${customer.address ? `<p>${customer.address.replace(/\n/g, '<br>')}</p>` : ''}
            </div>` : '<p>Customer: N/A</p>'}
            
            <table>
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Details</th>
                        <th style="text-align:right;">Quantity</th>
                        <th style="text-align:right;">Unit Price</th>
                        <th style="text-align:right;">Total</th>
                    </tr>
                </thead>
                <tbody>
    `;

    items.forEach(item => {
        const itemTotal = item.quantity_sold * item.price_per_unit;
        html += `
            <tr>
                <td>${item.productName}</td>
                <td>${item.productDetails || ''}</td>
                <td style="text-align:right;">${item.quantity_sold} ${item.notes || ''}</td>
                <td style="text-align:right;">$${item.price_per_unit.toFixed(2)}</td>
                <td style="text-align:right;">$${itemTotal.toFixed(2)}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
            <div class="totals">
                <p><strong>Total Amount: $${totalAmount.toFixed(2)}</strong></p>
            </div>
            ${sale.notes ? `<div style="margin-top: 20px; font-size: 13px; color: #555;"><p><strong>Notes:</strong> ${sale.notes}</p></div>` : ''}
            <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #888;">
                <p>Thank you for your business!</p>
            </div>
        </div>
    `;
    return html;
}


// Placeholder for actual PDF generation.
// This would involve using a library like pdf-lib or jsPDF.
export async function generateInvoicePDF(saleId: string): Promise<string> {
    // 1. Fetch sale details (customer, items, etc.)
    // 2. Use a PDF library to construct the document.
    // 3. Save or return the PDF (e.g., as a blob, data URL, or upload to Supabase Storage and return URL)
    
    // For now, this is a mock.
    console.log(`generateInvoicePDF called for saleId: ${saleId}. PDF generation not implemented.`);
    // In a real scenario, you might generate HTML first then convert, or build PDF directly.
    // const htmlContent = await generateInvoiceHTML(saleId);
    // Convert htmlContent to PDF using a library (e.g. html2pdf.js or server-side Puppeteer)
    
    // Simulate saving to Supabase storage and returning a URL
    const mockPdfUrl = `https://your-supabase-storage-url/invoices/invoice-${saleId}.pdf`;
    
    // Update the invoice record in Dexie with this URL
    const invoiceRecord = await db.invoices.where('sale_id').equals(saleId).first();
    if (invoiceRecord) {
        await db.invoices.update(invoiceRecord.id, { pdf_url: mockPdfUrl, _synced: 0, _last_modified: Date.now() });
    }
    
    return mockPdfUrl; // Return a placeholder URL
}