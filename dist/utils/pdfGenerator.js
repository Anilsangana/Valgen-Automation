"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAuditPDF = generateAuditPDF;
exports.getAuditReports = getAuditReports;
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Format timestamp to readable format
 */
function formatTimestamp(isoString) {
    try {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }) + ' IST';
    }
    catch {
        return isoString;
    }
}
/**
 * Get current timestamp in IST
 */
function getCurrentTimestamp() {
    return new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }) + ' IST';
}
/**
 * Add page footer with page number
 */
function addPageFooter(doc, fileName) {
    const pageHeight = doc.page.height;
    const pageWidth = doc.page.width;
    // Footer line
    doc.moveTo(50, pageHeight - 80)
        .lineTo(pageWidth - 50, pageHeight - 80)
        .strokeColor('#cbd5e0')
        .lineWidth(0.5)
        .stroke();
    doc.fontSize(8)
        .fillColor('#a0aec0')
        .text('This is an automatically generated audit report for GCP compliance and regulatory record-keeping.', 50, pageHeight - 70, { align: 'center', width: pageWidth - 100 });
    doc.fontSize(7)
        .fillColor('#a0aec0')
        .text(`Report ID: ${fileName}`, 50, pageHeight - 55, { align: 'center', width: pageWidth - 100 });
    // Page number
    const pages = doc.bufferedPageRange();
    doc.fontSize(8)
        .fillColor('#718096')
        .text(`Page ${pages.start + pages.count}`, 50, pageHeight - 35, { align: 'center', width: pageWidth - 100 });
}
/**
 * Generate PDF audit trail report for GCP compliance
 */
async function generateAuditPDF(data) {
    const reportsDir = path_1.default.join(process.cwd(), 'audit-reports');
    // Create reports directory if it doesn't exist
    if (!fs_1.default.existsSync(reportsDir)) {
        fs_1.default.mkdirSync(reportsDir, { recursive: true });
    }
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `Audit_${data.operation.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.pdf`;
    const filePath = path_1.default.join(reportsDir, fileName);
    return new Promise((resolve, reject) => {
        try {
            // Create PDF document
            const doc = new pdfkit_1.default({
                size: 'A4',
                margins: { top: 60, bottom: 100, left: 50, right: 50 },
                bufferPages: true
            });
            // Pipe to file
            const stream = fs_1.default.createWriteStream(filePath);
            doc.pipe(stream);
            // ================== HEADER WITH BRAND BOX ==================
            // Brand header box
            doc.rect(50, 50, 495, 70)
                .fillAndStroke('#0052A5', '#003D7A');
            doc.fontSize(22)
                .font('Helvetica-Bold')
                .fillColor('#FFFFFF')
                .text('Digital Lifecycle Workflow Accelerator', 60, 65, { width: 475 });
            doc.fontSize(14)
                .font('Helvetica')
                .fillColor('#E0E7FF')
                .text('Audit Trail Report', 60, 95);
            doc.moveDown(3);
            // Generated timestamp in gray box
            doc.rect(50, 135, 495, 25)
                .fillAndStroke('#F7FAFC', '#E2E8F0');
            doc.fontSize(9)
                .font('Helvetica')
                .fillColor('#4A5568')
                .text(`Generated: ${getCurrentTimestamp()}`, 60, 143, { align: 'left' });
            doc.y = 175;
            doc.moveDown(1);
            // ================== OPERATION DETAILS BOX ==================
            const detailsBoxY = doc.y;
            // Section header
            doc.rect(50, detailsBoxY, 495, 30)
                .fillAndStroke('#F7FAFC', '#CBD5E0');
            doc.fontSize(13)
                .font('Helvetica-Bold')
                .fillColor('#1A365D')
                .text('OPERATION DETAILS', 60, detailsBoxY + 10);
            // Content box
            const contentY = detailsBoxY + 35;
            doc.rect(50, contentY, 495, 100)
                .stroke('#E2E8F0');
            // Details content
            let yPos = contentY + 15;
            addDetailRow(doc, 'Operation Type', data.operation, 70, yPos);
            yPos += 20;
            addDetailRow(doc, 'Executed By', data.adminUser, 70, yPos);
            yPos += 20;
            addDetailRow(doc, 'Environment', data.baseUrl, 70, yPos, 320);
            yPos += 20;
            addDetailRow(doc, 'Start Time', formatTimestamp(data.timestamp), 70, yPos);
            doc.y = contentY + 110;
            doc.moveDown(1.5);
            // ================== EXECUTION RESULTS ==================
            const resultsHeaderY = doc.y;
            doc.rect(50, resultsHeaderY, 495, 30)
                .fillAndStroke('#F7FAFC', '#CBD5E0');
            doc.fontSize(13)
                .font('Helvetica-Bold')
                .fillColor('#1A365D')
                .text('EXECUTION RESULTS', 60, resultsHeaderY + 10);
            doc.y = resultsHeaderY + 40;
            doc.moveDown(0.5);
            // Role Creation Results
            if (data.results.role && data.results.role.length > 0) {
                addEnterpriseResultSection(doc, 'ROLE CREATION', data.results.role, (item) => {
                    const fields = [
                        { label: 'Role Name', value: item.role || item.roleName || 'N/A' },
                        { label: 'Status', value: item.status || 'N/A' },
                        { label: 'Created As', value: item.createdAs || item.role || 'N/A' },
                        { label: 'Permissions', value: item.permissionsConfigured ? 'Configured' : 'Default' }
                    ];
                    if (item.timestamp) {
                        fields.push({ label: 'Timestamp', value: formatTimestamp(item.timestamp) });
                    }
                    return fields;
                }, fileName);
            }
            // Department Creation Results
            if (data.results.department && data.results.department.length > 0) {
                addEnterpriseResultSection(doc, 'DEPARTMENT CREATION', data.results.department, (item) => {
                    const fields = [
                        { label: 'Department', value: item.department || item.name || 'N/A' },
                        { label: 'Status', value: item.status || 'N/A' },
                        { label: 'Created As', value: item.createdAs || item.department || 'N/A' },
                        { label: 'Description', value: item.description || 'N/A' }
                    ];
                    if (item.timestamp) {
                        fields.push({ label: 'Timestamp', value: formatTimestamp(item.timestamp) });
                    }
                    return fields;
                }, fileName);
            }
            // User Creation Results
            if (data.results.user && data.results.user.length > 0) {
                addEnterpriseResultSection(doc, 'USER CREATION', data.results.user, (item) => {
                    const fields = [
                        { label: 'Email', value: item.email || 'N/A' },
                        { label: 'Username', value: item.username || 'N/A' },
                        { label: 'Status', value: item.status || 'N/A' },
                        { label: 'Login Verified', value: item.loginVerified ? 'Yes' : 'No' }
                    ];
                    if (item.role) {
                        fields.push({ label: 'Role', value: item.role });
                    }
                    if (item.department) {
                        fields.push({ label: 'Department', value: item.department });
                    }
                    if (item.timestamp) {
                        fields.push({ label: 'Timestamp', value: formatTimestamp(item.timestamp) });
                    }
                    return fields;
                }, fileName);
            }
            // User Deactivation Results
            if (data.results.deactivation && data.results.deactivation.length > 0) {
                addEnterpriseResultSection(doc, 'USER DEACTIVATION', data.results.deactivation, (item) => {
                    const fields = [
                        { label: 'Username', value: item.username || 'N/A' },
                        { label: 'Status', value: item.status || 'N/A' },
                        { label: 'Message', value: item.message || 'N/A' }
                    ];
                    if (item.timestamp) {
                        fields.push({ label: 'Timestamp', value: formatTimestamp(item.timestamp) });
                    }
                    return fields;
                }, fileName);
            }
            // Finalize PDF
            doc.end();
            stream.on('finish', () => {
                resolve(filePath);
            });
            stream.on('error', (err) => {
                reject(err);
            });
        }
        catch (error) {
            reject(error);
        }
    });
}
/**
 * Add detail row helper
 */
function addDetailRow(doc, label, value, x, y, valueWidth = 350) {
    doc.fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#2D3748')
        .text(`${label}:`, x, y);
    doc.font('Helvetica')
        .fillColor('#4A5568')
        .text(value, x + 120, y, { width: valueWidth });
}
/**
 * Enterprise-style result section with professional boxes
 */
function addEnterpriseResultSection(doc, title, items, fieldMapper, fileName) {
    // Check if we need a new page for section header
    if (doc.y > 650) {
        doc.addPage();
        addPageFooter(doc, fileName);
    }
    // Section header bar
    const sectionHeaderY = doc.y;
    doc.rect(50, sectionHeaderY, 495, 28)
        .fillAndStroke('#EDF2F7', '#CBD5E0');
    doc.fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#1A365D')
        .text(title, 60, sectionHeaderY + 9);
    doc.y = sectionHeaderY + 35;
    items.forEach((item, index) => {
        const fields = fieldMapper(item);
        const itemHeight = (fields.length * 20) + 35; // Calculate needed height
        // Check if we need a new page
        if (doc.y + itemHeight > 700) {
            doc.addPage();
            addPageFooter(doc, fileName);
            doc.y = 60;
        }
        const itemStartY = doc.y;
        // Item header
        doc.rect(50, itemStartY, 495, 25)
            .fillAndStroke('#F7FAFC', '#CBD5E0');
        doc.fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#2C5282')
            .text(`${title.split(' ')[0]} #${index + 1}`, 60, itemStartY + 7);
        // Item content box
        const contentStartY = itemStartY + 25;
        doc.rect(50, contentStartY, 495, itemHeight - 25)
            .stroke('#E2E8F0');
        let fieldY = contentStartY + 12;
        fields.forEach((field) => {
            doc.fontSize(8)
                .font('Helvetica-Bold')
                .fillColor('#4A5568')
                .text(`${field.label}:`, 65, fieldY);
            doc.fontSize(8)
                .font('Helvetica')
                .fillColor('#2D3748')
                .text(field.value, 185, fieldY, { width: 345 });
            fieldY += 20;
        });
        doc.y = itemStartY + itemHeight + 10;
    });
    doc.moveDown(1);
}
/**
 * Get list of all audit reports
 */
function getAuditReports() {
    const reportsDir = path_1.default.join(process.cwd(), 'audit-reports');
    if (!fs_1.default.existsSync(reportsDir)) {
        return [];
    }
    const files = fs_1.default.readdirSync(reportsDir);
    return files
        .filter(file => file.endsWith('.pdf'))
        .map(file => {
        const filePath = path_1.default.join(reportsDir, file);
        const stats = fs_1.default.statSync(filePath);
        return {
            fileName: file,
            filePath,
            createdAt: stats.birthtime,
            size: stats.size
        };
    })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
