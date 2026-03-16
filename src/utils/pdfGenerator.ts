import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

interface AuditReportData {
    operation: string;
    timestamp: string;
    adminUser: string;
    baseUrl: string;
    results: {
        role?: any[];
        department?: any[];
        user?: any[];
        deactivation?: any[];
        nlp?: any;
        category?: any[];
        subCategory?: any[];
        group?: any[];
        functionalRole?: any[];
    };
    screenshots?: Array<{ path: string; caption: string; timestamp: string }>;
    summary?: string;
}

/**
 * Format timestamp to readable format
 */
function formatTimestamp(isoString: string): string {
    try {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            timeZone: 'UTC',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }) + ' UTC';
    } catch {
        return isoString;
    }
}

/**
 * Get current timestamp in UTC
 */
function getCurrentTimestamp(): string {
    return new Date().toLocaleString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }) + ' UTC';
}

/**
 * Generate PDF audit trail report for GCP compliance
 */
export async function generateAuditPDF(data: AuditReportData): Promise<string> {
    const reportsDir = path.join(process.cwd(), 'audit-reports');

    // Create reports directory if it doesn't exist
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `Audit_${data.operation.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.pdf`;
    const filePath = path.join(reportsDir, fileName);

    return new Promise((resolve, reject) => {
        try {
            // Create PDF document with buffering to add footers later
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 60, bottom: 80, left: 50, right: 50 },
                bufferPages: true,
                autoFirstPage: true
            });

            // Pipe to file
            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // ================== HEADER WITH BRAND BOX ==================
            // Brand header box
            doc.rect(50, 50, 495, 70)
                .fillAndStroke('#0052A5', '#003D7A');

            doc.fontSize(22)
                .font('Helvetica-Bold')
                .fillColor('#FFFFFF')
                .text('SmartIMS', 60, 65, { width: 475 });

            doc.fontSize(14)
                .font('Helvetica')
                .fillColor('#E0E7FF')
                .text('Assuring Outcomes - Audit Trail Report', 60, 95);

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
                addEnterpriseResultSection(doc, 'ROLE CREATION', data.results.role, (item: any) => {
                    const fields: Array<{ label: string; value: string }> = [
                        { label: 'Role Name', value: item.role || item.roleName || 'N/A' },
                        { label: 'Status', value: item.status || 'N/A' },
                        { label: 'Created As', value: item.createdAs || item.role || 'N/A' },
                        { label: 'Permissions', value: item.permissionsConfigured ? 'Configured' : 'Default' }
                    ];

                    if (item.timestamp) {
                        fields.push({ label: 'Timestamp', value: formatTimestamp(item.timestamp) });
                    }

                    return fields;
                });
            }

            // Department Creation Results
            if (data.results.department && data.results.department.length > 0) {
                addEnterpriseResultSection(doc, 'DEPARTMENT CREATION', data.results.department, (item: any) => {
                    const fields: Array<{ label: string; value: string }> = [
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

            // Category Creation Results
            if (data.results.category && data.results.category.length > 0) {
                addEnterpriseResultSection(doc, 'CATEGORY CREATION', data.results.category, (item: any) => {
                    const fields: Array<{ label: string; value: string }> = [
                        { label: 'Category Name', value: item.category || item.name || 'N/A' },
                        { label: 'Prefix', value: item.prefix || 'N/A' },
                        { label: 'Status', value: item.status || 'N/A' },
                        { label: 'Created As', value: item.createdAs || item.category || 'N/A' },
                        { label: 'Description', value: item.description || 'N/A' }
                    ];
                    if (item.timestamp) {
                        fields.push({ label: 'Timestamp', value: formatTimestamp(item.timestamp) });
                    }
                    return fields;
                });
            }

            // Sub Category Creation Results
            if (data.results.subCategory && data.results.subCategory.length > 0) {
                addEnterpriseResultSection(doc, 'SUB CATEGORY CREATION', data.results.subCategory, (item: any) => {
                    const fields: Array<{ label: string; value: string }> = [
                        { label: 'Category', value: item.category || 'N/A' },
                        { label: 'Sub Category', value: item.subCategory || item.name || 'N/A' },
                        { label: 'Prefix', value: item.prefix || 'N/A' },
                        { label: 'Status', value: item.status || 'N/A' },
                        { label: 'Created As', value: item.createdAs || item.subCategory || 'N/A' },
                        { label: 'Description', value: item.description || 'N/A' }
                    ];
                    if (item.timestamp) {
                        fields.push({ label: 'Timestamp', value: formatTimestamp(item.timestamp) });
                    }
                    return fields;
                });
            }

            // Group Creation Results
            if (data.results.group && data.results.group.length > 0) {
                addEnterpriseResultSection(doc, 'GROUP CREATION', data.results.group, (item: any) => {
                    const fields: Array<{ label: string; value: string }> = [
                        { label: 'Group Name', value: item.group || item.name || 'N/A' },
                        { label: 'Group Type', value: item.groupType || 'N/A' },
                        { label: 'Status', value: item.status || 'N/A' },
                        { label: 'Created As', value: item.createdAs || item.group || 'N/A' },
                        { label: 'Description', value: item.description || 'N/A' }
                    ];
                    if (item.timestamp) {
                        fields.push({ label: 'Timestamp', value: formatTimestamp(item.timestamp) });
                    }
                    return fields;
                });
            }

            // Functional Role Creation Results
            if (data.results.functionalRole && data.results.functionalRole.length > 0) {
                addEnterpriseResultSection(doc, 'FUNCTIONAL ROLE CREATION', data.results.functionalRole, (item: any) => {
                    const fields: Array<{ label: string; value: string }> = [
                        { label: 'Functional Role Name', value: item.functionalRole || item.name || 'N/A' },
                        { label: 'Prefix', value: item.prefix || 'N/A' },
                        { label: 'Status', value: item.status || 'N/A' },
                        { label: 'Created As', value: item.createdAs || item.functionalRole || 'N/A' },
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
                addEnterpriseResultSection(doc, 'USER CREATION', data.results.user, (item: any) => {
                    const fields: Array<{ label: string; value: string }> = [
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
                addEnterpriseResultSection(doc, 'USER DEACTIVATION', data.results.deactivation, (item: any) => {
                    const fields: Array<{ label: string; value: string }> = [
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

            // Natural Language Automation Results
            if (data.results.nlp) {
                const nlpData = data.results.nlp;
                const resultsHeaderY = doc.y;

                // NLP Command Section
                doc.rect(50, resultsHeaderY, 495, 28)
                    .fillAndStroke('#EDF2F7', '#CBD5E0');

                doc.fontSize(11)
                    .font('Helvetica-Bold')
                    .fillColor('#1A365D')
                    .text('NATURAL LANGUAGE COMMAND', 60, resultsHeaderY + 9);

                doc.y = resultsHeaderY + 35;

                // Command box
                const commandBoxY = doc.y;
                doc.rect(50, commandBoxY, 495, 60)
                    .stroke('#E2E8F0');

                doc.fontSize(8)
                    .font('Helvetica-Bold')
                    .fillColor('#4A5568')
                    .text('Command:', 65, commandBoxY + 12);

                doc.fontSize(8)
                    .font('Helvetica')
                    .fillColor('#2D3748')
                    .text(nlpData.command || 'N/A', 65, commandBoxY + 28, { width: 465 });

                doc.y = commandBoxY + 70;
                doc.moveDown(0.5);

                // Results breakdown
                if (nlpData.result) {
                    const result = nlpData.result;

                    if (result.login) {
                        addEnterpriseResultSection(doc, 'LOGIN EXECUTION', [result.login], (item: any) => {
                            return [
                                { label: 'Status', value: item.status || 'N/A' },
                                { label: 'Username', value: item.username || 'N/A' }
                            ];
                        });
                    }

                    if (result.role) {
                        addEnterpriseResultSection(doc, 'ROLE CREATION', [result.role], (item: any) => {
                            return [
                                { label: 'Status', value: item.status || 'N/A' },
                                { label: 'Role Name', value: item.name || 'N/A' },
                                { label: 'Role Type', value: item.type || 'N/A' }
                            ];
                        });
                    }

                    if (result.department) {
                        addEnterpriseResultSection(doc, 'DEPARTMENT CREATION', [result.department], (item: any) => {
                            return [
                                { label: 'Status', value: item.status || 'N/A' },
                                { label: 'Department Name', value: item.name || 'N/A' }
                            ];
                        });
                    }

                    if (result.user) {
                        addEnterpriseResultSection(doc, 'USER CREATION', [result.user], (item: any) => {
                            return [
                                { label: 'Status', value: item.status || 'N/A' },
                                { label: 'Email', value: item.email || 'N/A' },
                                { label: 'Role', value: item.role || 'N/A' },
                                { label: 'Department', value: item.department || 'N/A' }
                            ];
                        });
                    }

                }
            }

            // ================== AI VERIFICATION SUMMARY ==================
            if (data.summary) {
                if (doc.y > 650) doc.addPage();
                
                const summaryHeaderY = doc.y;
                doc.rect(50, summaryHeaderY, 495, 28)
                    .fillAndStroke('#EBF8FF', '#90CDF4');

                doc.fontSize(11)
                    .font('Helvetica-Bold')
                    .fillColor('#2A4365')
                    .text('🧠 AI VERIFICATION SUMMARY', 60, summaryHeaderY + 9);

                doc.y = summaryHeaderY + 35;
                doc.rect(50, doc.y, 495, 80)
                    .stroke('#BEE3F8');
                
                doc.fontSize(9)
                    .font('Helvetica')
                    .fillColor('#2D3748')
                    .text(data.summary, 65, doc.y + 12, { width: 465, align: 'justify' });
                
                doc.y += 90;
            }

            // ================== CAPTURED EVIDENCE (SCREENSHOTS) ==================
            if (data.screenshots && data.screenshots.length > 0) {
                doc.addPage();
                
                const evidenceHeaderY = 60;
                doc.rect(50, evidenceHeaderY, 495, 30)
                    .fillAndStroke('#F7FAFC', '#CBD5E0');

                doc.fontSize(13)
                    .font('Helvetica-Bold')
                    .fillColor('#1A365D')
                    .text('VISUAL EVIDENCE (SCREENSHOTS)', 60, evidenceHeaderY + 10);

                doc.y = evidenceHeaderY + 50;

                for (const ss of data.screenshots) {
                    const screenshotPath = path.join(process.cwd(), ss.path);
                    if (fs.existsSync(screenshotPath)) {
                        // Header for each screenshot
                        if (doc.y > 500) {
                            doc.addPage();
                            doc.y = 60;
                        }
                        
                        const ssTitleY = doc.y;
                        doc.fontSize(10)
                            .font('Helvetica-Bold')
                            .fillColor('#4A5568')
                            .text(ss.caption, 50, ssTitleY);
                        
                        doc.fontSize(8)
                            .font('Helvetica')
                            .fillColor('#A0AEC0')
                            .text(`Captured: ${formatTimestamp(ss.timestamp)}`, 50, ssTitleY + 12, { align: 'right', width: 495 });
                        
                        doc.y += 25;

                        try {
                            doc.image(screenshotPath, 50, doc.y, {
                                fit: [495, 300],
                                align: 'center'
                            });
                            doc.y += 310;
                            
                            // Border around image
                            doc.rect(50, ssTitleY + 22, 495, 305).stroke('#E2E8F0');
                        } catch (e) {
                            doc.fontSize(8).fillColor('#E53E3E').text(`Error embedding: ${String(e)}`, 60, doc.y);
                            doc.y += 40;
                        }
                        doc.moveDown(2);
                    }
                }
            }

            // ================== ADD FOOTERS TO ALL PAGES ==================
            const range = doc.bufferedPageRange();
            for (let i = 0; i < range.count; i++) {
                doc.switchToPage(i);

                const pageHeight = doc.page.height;
                const pageWidth = doc.page.width;

                // Footer line
                doc.moveTo(50, pageHeight - 70)
                    .lineTo(pageWidth - 50, pageHeight - 70)
                    .strokeColor('#cbd5e0')
                    .lineWidth(0.5)
                    .stroke();

                doc.fontSize(7)
                    .fillColor('#a0aec0')
                    .text(
                        'This is an automatically generated audit report for GCP compliance and regulatory record-keeping.',
                        50,
                        pageHeight - 60,
                        { align: 'center', width: pageWidth - 100 }
                    );

                doc.fontSize(7)
                    .fillColor('#a0aec0')
                    .text(
                        `Report ID: ${fileName} | Page ${i + 1} of ${range.count}`,
                        50,
                        pageHeight - 45,
                        { align: 'center', width: pageWidth - 100 }
                    );
            }

            // Finalize PDF
            doc.end();

            stream.on('finish', () => {
                resolve(filePath);
            });

            stream.on('error', (err) => {
                reject(err);
            });

        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Add detail row helper
 */
function addDetailRow(
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
    x: number,
    y: number,
    valueWidth: number = 350
) {
    doc.fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#2D3748')
        .text(`${label}:`, x, y);

    doc.font('Helvetica')
        .fillColor('#4A5568')
        .text(value, x + 120, y, { width: valueWidth });
}

/**
 * Enterprise-style result section with professional boxes (NO footer calls)
 */
function addEnterpriseResultSection(
    doc: PDFKit.PDFDocument,
    title: string,
    items: any[],
    fieldMapper: (item: any) => Array<{ label: string; value: string }>
) {
    // Check if we need a new page for section header
    if (doc.y > 700) {
        doc.addPage();
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

        // Check if we need a new page (with bottom margin for footer)
        if (doc.y + itemHeight > 720) {
            doc.addPage();
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
export function getAuditReports(): Array<{ fileName: string; filePath: string; createdAt: Date; size: number }> {
    const reportsDir = path.join(process.cwd(), 'audit-reports');

    if (!fs.existsSync(reportsDir)) {
        return [];
    }

    const files = fs.readdirSync(reportsDir);

    return files
        .filter(file => file.endsWith('.pdf'))
        .map(file => {
            const filePath = path.join(reportsDir, file);
            const stats = fs.statSync(filePath);
            return {
                fileName: file,
                filePath,
                createdAt: stats.birthtime,
                size: stats.size
            };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
