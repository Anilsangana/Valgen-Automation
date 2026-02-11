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
                margins: { top: 50, bottom: 50, left: 50, right: 50 }
            });
            // Pipe to file
            const stream = fs_1.default.createWriteStream(filePath);
            doc.pipe(stream);
            // ================== HEADER ==================
            doc.fontSize(24)
                .font('Helvetica-Bold')
                .fillColor('#1a365d')
                .text('Clinical Trial Management System', { align: 'center' });
            doc.fontSize(16)
                .fillColor('#2d3748')
                .text('Audit Trail Report', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10)
                .fillColor('#718096')
                .text(`Generated: ${getCurrentTimestamp()}`, { align: 'center' });
            doc.moveDown(1);
            // Horizontal line
            doc.moveTo(50, doc.y)
                .lineTo(545, doc.y)
                .strokeColor('#cbd5e0')
                .stroke();
            doc.moveDown(1);
            // ================== OPERATION DETAILS ==================
            doc.fontSize(14)
                .font('Helvetica-Bold')
                .fillColor('#1a365d')
                .text('Operation Details');
            doc.moveDown(0.5);
            const detailsY = doc.y;
            doc.fontSize(10)
                .font('Helvetica-Bold')
                .fillColor('#2d3748')
                .text('Operation Type:', 60, detailsY);
            doc.font('Helvetica')
                .fillColor('#4a5568')
                .text(data.operation, 180, detailsY);
            doc.font('Helvetica-Bold')
                .fillColor('#2d3748')
                .text('Executed By:', 60, detailsY + 20);
            doc.font('Helvetica')
                .fillColor('#4a5568')
                .text(data.adminUser, 180, detailsY + 20);
            doc.font('Helvetica-Bold')
                .fillColor('#2d3748')
                .text('Environment:', 60, detailsY + 40);
            doc.font('Helvetica')
                .fillColor('#4a5568')
                .text(data.baseUrl, 180, detailsY + 40, { width: 350 });
            doc.font('Helvetica-Bold')
                .fillColor('#2d3748')
                .text('Start Time:', 60, detailsY + 60);
            doc.font('Helvetica')
                .fillColor('#4a5568')
                .text(formatTimestamp(data.timestamp), 180, detailsY + 60);
            doc.y = detailsY + 90;
            doc.moveDown(1);
            // ================== RESULTS SECTION ==================
            doc.fontSize(14)
                .font('Helvetica-Bold')
                .fillColor('#1a365d')
                .text('Execution Results');
            doc.moveDown(0.5);
            // Role Creation Results
            if (data.results.role && data.results.role.length > 0) {
                addResultSection(doc, 'Role Creation', data.results.role, (item) => {
                    const fields = [
                        { label: 'Role Name', value: item.role || item.roleName || 'N/A' },
                        { label: 'Status', value: item.status || 'N/A' },
                        { label: 'Created As', value: item.createdAs || item.role || 'N/A' },
                        { label: 'Permissions', value: item.permissionsConfigured ? 'Configured' : 'Default' }
                    ];
                    // Add timestamp if available
                    if (item.timestamp) {
                        fields.push({ label: 'Timestamp', value: formatTimestamp(item.timestamp) });
                    }
                    return fields;
                });
            }
            // Department Creation Results
            if (data.results.department && data.results.department.length > 0) {
                addResultSection(doc, 'Department Creation', data.results.department, (item) => {
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
                });
            }
            // User Creation Results
            if (data.results.user && data.results.user.length > 0) {
                addResultSection(doc, 'User Creation', data.results.user, (item) => {
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
                });
            }
            // User Deactivation Results
            if (data.results.deactivation && data.results.deactivation.length > 0) {
                addResultSection(doc, 'User Deactivation', data.results.deactivation, (item) => {
                    const fields = [
                        { label: 'Username', value: item.username || 'N/A' },
                        { label: 'Status', value: item.status || 'N/A' },
                        { label: 'Message', value: item.message || 'N/A' }
                    ];
                    if (item.timestamp) {
                        fields.push({ label: 'Timestamp', value: formatTimestamp(item.timestamp) });
                    }
                    return fields;
                });
            }
            // ================== FOOTER ==================
            const pageHeight = doc.page.height;
            doc.fontSize(8)
                .fillColor('#a0aec0')
                .text('This is an automatically generated audit report for GCP compliance and record-keeping purposes.', 50, pageHeight - 70, { align: 'center', width: 495 });
            doc.text(`Report ID: ${fileName}`, 50, pageHeight - 50, { align: 'center', width: 495 });
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
 * Helper function to add result section to PDF
 */
function addResultSection(doc, title, items, fieldMapper) {
    doc.fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#2d3748')
        .text(title);
    doc.moveDown(0.3);
    items.forEach((item, index) => {
        // Item box background
        const startY = doc.y;
        // Extract clean title (remove emojis)
        const cleanTitle = title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
        doc.fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#1a365d')
            .text(`${cleanTitle} #${index + 1}`, 70, startY);
        let currentY = startY + 20;
        const fields = fieldMapper(item);
        fields.forEach((field) => {
            // Check if we need a new page
            if (currentY > 700) {
                doc.addPage();
                currentY = 50;
            }
            doc.fontSize(9)
                .font('Helvetica-Bold')
                .fillColor('#4a5568')
                .text(`${field.label}:`, 70, currentY);
            doc.font('Helvetica')
                .fillColor('#718096')
                .text(field.value, 180, currentY, { width: 350 });
            currentY += 18;
        });
        // Draw border around item
        doc.rect(60, startY - 5, 485, currentY - startY + 5)
            .strokeColor('#e2e8f0')
            .stroke();
        doc.y = currentY + 10;
        doc.moveDown(0.5);
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
