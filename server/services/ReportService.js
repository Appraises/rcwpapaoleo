const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { format } = require('date-fns');
const { ptBR } = require('date-fns/locale');
const { Collection, Client, User, SystemSetting, Report } = require('../models');

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

            // 2. Fetch Global Selling Price
            let sellingPriceSetting = await SystemSetting.findByPk('oil_selling_price');
            let sellingPrice = sellingPriceSetting ? parseFloat(sellingPriceSetting.value) : 0;

            // 3. Calculate Totals
            let totalVolume = 0;
            let totalCost = 0;

            const tableData = collections.map(col => {
                const quantity = col.quantity || 0;
                const price = col.Client ? (col.Client.pricePerLiter || 0) : 0;

                totalVolume += quantity;
                totalCost += quantity * price;

                return {
                    date: format(new Date(col.date), 'dd/MM/yyyy'),
                    client: col.Client ? col.Client.name : 'Desconhecido',
                    quantity: `${quantity} L`,
                    collector: col.User ? col.User.name : 'Desconhecido'
                };
            });

            // 4. Setup PDF Document
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
                doc.fillColor('white').fontSize(24).font('Helvetica-Bold').text('Cat Óleo', 50, 35);
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

            // --- FOOTER TOTALS ---
            doc.moveDown(2);
            doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#22c55e').stroke();
            doc.moveDown(1);

            doc.font('Helvetica-Bold').fontSize(12);
            doc.text(`Total Volume Coletado: ${totalVolume} Litros`, { align: 'right' });

            // Format currency
            const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
            doc.fillColor('#ef4444').text(`Custo Total de Aquisição: ${formatter.format(totalCost)}`, { align: 'right' });

            const totalRevenue = totalVolume * sellingPrice;
            const profit = totalRevenue - totalCost;

            doc.moveDown(0.5);
            doc.fillColor('#3b82f6').font('Helvetica').fontSize(10).text(`Valor de Venda Previsto: ${formatter.format(totalRevenue)}`, { align: 'right' });
            doc.fillColor('#22c55e').font('Helvetica-Bold').fontSize(12).text(`Lucro Bruto Estimado: ${formatter.format(profit)}`, { align: 'right' });

            // Finalize PDF
            doc.end();

            // Wait for stream to finish
            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });

            // 5. Save to Database
            const reportUrl = `/reports/${fileName}`;
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
