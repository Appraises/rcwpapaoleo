const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { format } = require('date-fns');
const { ptBR } = require('date-fns/locale');
const { Collection, Client, User, SystemSetting, Report, Sale, Buyer } = require('../models');

class ReportService {
    static async generateReport(type, startDate, endDate) {
        try {
            // 1. Fetch Collections
            const collections = await Collection.findAll({
                where: {
                    date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                include: [
                    { model: Client, attributes: ['name', 'pricePerLiter'] },
                    { model: User, attributes: ['name'] }
                ],
                order: [['date', 'ASC']]
            });

            // 2. Fetch Sales
            const sales = await Sale.findAll({
                where: {
                    date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                include: [
                    { model: Buyer, attributes: ['name'] }
                ],
                order: [['date', 'ASC']]
            });

            // 3. Fetch Global Selling Price
            let sellingPriceSetting = await SystemSetting.findByPk('oil_selling_price');
            let sellingPrice = sellingPriceSetting ? parseFloat(sellingPriceSetting.value) : 0;

            // 4. Calculate Collection Totals
            let totalVolume = 0;
            let totalCost = 0;

            const tableData = collections.map(col => {
                const quantity = col.quantity || 0;
                const price = col.Client ? (col.Client.pricePerLiter || 0) : 0;
                const isTroca = col.observation && col.observation.toLowerCase().includes('troca');

                totalVolume += quantity;
                if (!isTroca) {
                    totalCost += quantity * price;
                }

                return {
                    date: format(new Date(col.date), 'dd/MM/yyyy'),
                    client: col.Client ? (isTroca ? `${col.Client.name} (Troca)` : col.Client.name) : 'Desconhecido',
                    quantity: `${quantity} L`,
                    collector: col.User ? col.User.name : 'Desconhecido'
                };
            });

            // Format currency
            const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

            // 5. Calculate Sales Totals
            let totalSalesVolume = 0;
            let totalSalesRevenue = 0;

            const salesTableData = sales.map(sale => {
                const qty = sale.quantityLiters || 0;
                const price = sale.pricePerLiter || 0;
                const total = sale.totalValue || (qty * price);

                totalSalesVolume += qty;
                totalSalesRevenue += total;

                return {
                    date: format(new Date(sale.date), 'dd/MM/yyyy'),
                    buyer: sale.Buyer ? sale.Buyer.name : 'Desconhecido',
                    quantity: `${qty} L`,
                    pricePerLiter: formatter.format(price),
                    total: formatter.format(total)
                };
            });

            // 6. Setup PDF Document
            const fileName = `relatorio-${type}-${Date.now()}.pdf`;
            const filePath = path.join(__dirname, '..', 'public', 'reports', fileName);

            // Ensure directory exists
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const doc = new PDFDocument({ margin: 50 });
            const writeStream = fs.createWriteStream(filePath);
            doc.pipe(writeStream);

            // --- HEADER ---
            // Draw a green header bar
            doc.rect(0, 0, doc.page.width, 100).fill('#22c55e');

            // Note: We need a copy of the logo in the server. 
            // For now, we will draw text if the image is missing, but assume it will be placed in public/logo.png
            const logoPath = path.join(__dirname, '..', 'public', 'logoHorizontal.png');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, 25, { width: 150 });
            } else {
                doc.fillColor('white').fontSize(24).font('Helvetica-Bold').text('RCW Papa Óleo', 50, 35);
            }

            doc.fillColor('white')
                .fontSize(12)
                .font('Helvetica-Bold')
                .text(`Relatório ${type === 'weekly' ? 'Semanal' : 'Mensal'}`, 200, 30, { align: 'right' })
                .font('Helvetica')
                .text(`Período: ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}`, 200, 50, { align: 'right' });

            // --- CONTENT ---
            doc.moveDown(5);
            doc.fillColor('#333333').fontSize(16).font('Helvetica-Bold').text('Resumo de Coletas', 50);
            doc.moveDown(1);

            // --- TABLE DRAWING ---
            const tableTop = doc.y;
            const col1 = 50;
            const col2 = 150;
            const col3 = 350;
            const col4 = 450;

            // Table Header
            doc.font('Helvetica-Bold').fontSize(10);
            doc.text('Data', col1, tableTop);
            doc.text('Cliente', col2, tableTop);
            doc.text('Quantidade', col3, tableTop);
            doc.text('Coletador', col4, tableTop);

            // Header Line
            doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor('#cccccc').stroke();

            let currentY = tableTop + 25;
            doc.font('Helvetica').fontSize(10);

            // Table Rows
            tableData.forEach((row, i) => {
                // Check if we need a new page
                if (currentY > 700) {
                    doc.addPage();
                    currentY = 50; // Reset Y
                }

                // Zebra striping
                if (i % 2 === 0) {
                    doc.rect(50, currentY - 5, 500, 20).fill('#f8fafc');
                }

                doc.fillColor('#333333');
                doc.text(row.date, col1, currentY);
                doc.text(row.client, col2, currentY, { width: 190, lineBreak: false });
                doc.text(row.quantity, col3, currentY);
                doc.text(row.collector, col4, currentY, { width: 100, lineBreak: false });

                currentY += 20;
            });

            // --- COLLECTIONS SUBTOTAL ---
            doc.moveDown(1);
            doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#22c55e').stroke();
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#333333');
            doc.text(`Volume Coletado: ${totalVolume} Litros  |  Custo de Aquisição: ${formatter.format(totalCost)}`, 50, doc.y, { align: 'right' });

            // ============ SALES SECTION ============
            doc.moveDown(2);

            // Check if we need a new page for sales section
            if (doc.y > 550) {
                doc.addPage();
            }

            doc.fillColor('#333333').fontSize(16).font('Helvetica-Bold').text('Resumo de Vendas', 50);
            doc.moveDown(1);

            if (salesTableData.length === 0) {
                doc.font('Helvetica').fontSize(10).fillColor('#666666');
                doc.text('Nenhuma venda registrada neste período.', 50);
            } else {
                // Sales Table
                const salesTop = doc.y;
                const sCol1 = 50;
                const sCol2 = 130;
                const sCol3 = 310;
                const sCol4 = 390;
                const sCol5 = 475;

                doc.font('Helvetica-Bold').fontSize(10);
                doc.text('Data', sCol1, salesTop);
                doc.text('Comprador', sCol2, salesTop);
                doc.text('Quantidade', sCol3, salesTop);
                doc.text('R$/Litro', sCol4, salesTop);
                doc.text('Total', sCol5, salesTop);

                doc.moveTo(50, salesTop + 15).lineTo(550, salesTop + 15).strokeColor('#cccccc').stroke();

                let salesY = salesTop + 25;
                doc.font('Helvetica').fontSize(10);

                salesTableData.forEach((row, i) => {
                    if (salesY > 700) {
                        doc.addPage();
                        salesY = 50;
                    }

                    if (i % 2 === 0) {
                        doc.rect(50, salesY - 5, 500, 20).fill('#f0fdf4');
                    }

                    doc.fillColor('#333333');
                    doc.text(row.date, sCol1, salesY);
                    doc.text(row.buyer, sCol2, salesY, { width: 170, lineBreak: false });
                    doc.text(row.quantity, sCol3, salesY);
                    doc.text(row.pricePerLiter, sCol4, salesY);
                    doc.text(row.total, sCol5, salesY);

                    salesY += 20;
                });

                doc.y = salesY;
            }

            // --- SALES SUBTOTAL ---
            doc.moveDown(1);
            doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#3b82f6').stroke();
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#333333');
            doc.text(`Volume Vendido: ${totalSalesVolume} Litros  |  Receita de Vendas: ${formatter.format(totalSalesRevenue)}`, 50, doc.y, { align: 'right' });

            // ============ FINANCIAL SUMMARY ============
            doc.moveDown(2);

            if (doc.y > 620) {
                doc.addPage();
            }

            // Background box for financial summary
            const summaryY = doc.y;
            doc.rect(40, summaryY - 10, 520, 110).fill('#f8fafc').strokeColor('#e2e8f0').stroke();

            doc.fillColor('#333333').fontSize(14).font('Helvetica-Bold');
            doc.text('Resumo Financeiro', 50, summaryY);
            doc.moveDown(0.5);

            doc.fontSize(11).font('Helvetica');
            doc.fillColor('#ef4444').text(`Custo Total de Aquisição: ${formatter.format(totalCost)}`, 60);
            doc.moveDown(0.3);

            const projectedRevenue = totalVolume * sellingPrice;
            doc.fillColor('#3b82f6').text(`Receita Projetada (preço de venda global): ${formatter.format(projectedRevenue)}`, 60);
            doc.moveDown(0.3);

            doc.fillColor('#22c55e').text(`Receita Real de Vendas: ${formatter.format(totalSalesRevenue)}`, 60);
            doc.moveDown(0.3);

            const realProfit = totalSalesRevenue - totalCost;
            doc.font('Helvetica-Bold').fontSize(12);
            doc.fillColor(realProfit >= 0 ? '#22c55e' : '#ef4444');
            doc.text(`Lucro Bruto Real: ${formatter.format(realProfit)}`, 60);

            // Finalize PDF
            doc.end();

            // Wait for stream to finish
            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });

            // 5. Save to Database
            const reportUrl = `/api/public/reports/${fileName}`;
            const report = await Report.create({
                type,
                startDate,
                endDate,
                filePath: reportUrl
            });

            return report;

        } catch (error) {
            console.error('Error generating report:', error);
            throw error;
        }
    }
}

module.exports = ReportService;
