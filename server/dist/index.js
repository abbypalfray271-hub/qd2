"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const docx_1 = require("docx");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Helper to strip or convert basic HTML tags to docx TextRun children
function parseHtmlToDocxRuns(htmlText, defaultColor = "0f172a") {
    if (!htmlText)
        return [];
    // Remove outermost passage container markers if any
    let clean = htmlText
        .replace(/<div class="passage-box">/gi, '')
        .replace(/<\/div>/gi, '\n');
    // Convert line breaks
    clean = clean.replace(/<br\s*\/?>/gi, '\n');
    const runs = [];
    // Simple parser regex matching HTML tags
    const tagRegex = /(<span class="dot-char">.*?<\/span>|<u[^>]*>.*?<\/u>|<strong[^>]*>.*?<\/strong>|<b>.*?<\/b>|[^<]+)/gi;
    const matches = clean.match(tagRegex) || [clean];
    for (const match of matches) {
        if (match.startsWith('<span class="dot-char">')) {
            const text = match.replace(/<[^>]+>/g, '');
            runs.push(new docx_1.TextRun({
                text,
                font: "SimSun",
                size: 22,
                color: defaultColor,
                underline: { type: docx_1.UnderlineType.DOTTEDHEAVY }
            }));
        }
        else if (match.startsWith('<u style="text-underline: wave') || match.includes('wavy')) {
            const text = match.replace(/<[^>]+>/g, '');
            runs.push(new docx_1.TextRun({
                text,
                font: "SimSun",
                size: 22,
                color: "0284c7",
                underline: { type: docx_1.UnderlineType.WAVE, color: "0284c7" }
            }));
        }
        else if (match.startsWith('<u') || match.startsWith('<span class="blank-underline"')) {
            const text = match.replace(/<[^>]+>/g, '');
            runs.push(new docx_1.TextRun({
                text,
                font: "SimSun",
                size: 22,
                color: defaultColor,
                underline: { type: docx_1.UnderlineType.SINGLE }
            }));
        }
        else if (match.startsWith('<strong') || match.startsWith('<b')) {
            const text = match.replace(/<[^>]+>/g, '');
            runs.push(new docx_1.TextRun({
                text,
                font: "SimHei",
                bold: true,
                size: 22,
                color: defaultColor
            }));
        }
        else {
            // Plain text (handles embedded newlines)
            const lines = match.split('\n');
            lines.forEach((line, i) => {
                if (line) {
                    runs.push(new docx_1.TextRun({
                        text: line,
                        font: "SimSun",
                        size: 22,
                        color: defaultColor
                    }));
                }
                if (i < lines.length - 1) {
                    runs.push(new docx_1.TextRun({ text: "", break: 1 }));
                }
            });
        }
    }
    return runs;
}
// Helper to extract request data whether sent via JSON fetch or Form POST payload
function getRequestData(req) {
    if (req.body && req.body.payload) {
        try {
            return typeof req.body.payload === 'string' ? JSON.parse(req.body.payload) : req.body.payload;
        }
        catch (e) {
            return req.body;
        }
    }
    return req.body || {};
}
// In-memory task store for GET downloads (auto cleanup after 10 minutes)
const exportTasks = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [id, task] of exportTasks.entries()) {
        if (now - task.createdAt > 10 * 60 * 1000) {
            exportTasks.delete(id);
        }
    }
}, 60 * 1000);
// POST /api/export/prepare - Store payload and return taskId for GET download
app.post('/api/export/prepare', (req, res) => {
    try {
        const data = getRequestData(req);
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        exportTasks.set(taskId, { data, createdAt: Date.now() });
        res.json({ ok: true, taskId });
    }
    catch (err) {
        console.error('Error in /api/export/prepare:', err);
        res.status(500).json({ error: 'Failed to prepare export task' });
    }
});
// GET /api/export/download-docx - GET endpoint for 100% iOS/Mobile compatible file download
app.get('/api/export/download-docx', async (req, res) => {
    try {
        const taskId = req.query.id;
        const task = exportTasks.get(taskId);
        if (!task) {
            return res.status(404).send('Download link expired or invalid');
        }
        const { paperTitle = "2026年青岛市中考语文专项练习组卷", selectedQuestions = [], totalScore = 115, isPassageIncludedMap = {}, isAnswerIncludedMap = {} } = task.data;
        const children = [];
        // Paper Header
        children.push(new docx_1.Paragraph({
            alignment: docx_1.AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
                new docx_1.TextRun({
                    text: paperTitle,
                    font: "SimHei",
                    size: 32,
                    bold: true,
                    color: "0f172a"
                })
            ]
        }), new docx_1.Paragraph({
            alignment: docx_1.AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
                new docx_1.TextRun({
                    text: `卷面规格：A4 标准排版 | 试题总数：${selectedQuestions.length} 道 | 满分：${totalScore} 分`,
                    font: "SimSun",
                    size: 20,
                    color: "64748b"
                })
            ]
        }));
        // Process each selected question
        selectedQuestions.forEach((item, index) => {
            const q = item.question || item;
            const qKey = item.qKey || `${item.examId}_${q.id}`;
            const hasPassage = isPassageIncludedMap[qKey] !== false && q.passage;
            const hasAnswer = isAnswerIncludedMap[qKey] !== false;
            // Question Title Line
            children.push(new docx_1.Paragraph({
                spacing: { before: 240, after: 120 },
                children: [
                    new docx_1.TextRun({
                        text: `第 ${index + 1} 题 【${item.year || ''} ${item.district || ''} ${item.examCategory || ''}】 (${q.score || 2}分)`,
                        font: "SimHei",
                        bold: true,
                        size: 22,
                        color: "0369a1"
                    })
                ]
            }));
            // Passage Box
            if (hasPassage) {
                children.push(new docx_1.Paragraph({
                    spacing: { before: 100, after: 100 },
                    children: [
                        new docx_1.TextRun({ text: "【阅读材料】", font: "SimHei", bold: true, size: 21, color: "0284c7" }),
                        new docx_1.TextRun({ text: "", break: 1 }),
                        ...parseHtmlToDocxRuns(q.passage, "334155")
                    ]
                }));
            }
            // Stem
            const cleanStemText = (q.stem || '').replace(/^(\d+[\.、]?\s*)/, '');
            children.push(new docx_1.Paragraph({
                spacing: { before: 80, after: 120 },
                children: [
                    new docx_1.TextRun({ text: `${index + 1}. `, font: "SimHei", bold: true, size: 22, color: "0f172a" }),
                    ...parseHtmlToDocxRuns(cleanStemText, "0f172a")
                ]
            }));
            // Options
            if (q.options && q.options.length > 0) {
                q.options.forEach((opt) => {
                    children.push(new docx_1.Paragraph({
                        spacing: { before: 40, after: 40 },
                        indent: { left: 360 },
                        children: parseHtmlToDocxRuns(opt, "334155")
                    }));
                });
            }
            // Answer & Analysis
            if (hasAnswer) {
                children.push(new docx_1.Paragraph({
                    spacing: { before: 160, after: 80 },
                    children: [
                        new docx_1.TextRun({ text: "🎯 【参考答案】", font: "SimHei", bold: true, size: 21, color: "166534" }),
                        new docx_1.TextRun({ text: "", break: 1 }),
                        ...parseHtmlToDocxRuns(q.answer || '', "14532d")
                    ]
                }), new docx_1.Paragraph({
                    spacing: { before: 80, after: 200 },
                    children: [
                        new docx_1.TextRun({ text: "💡 【详细解析与考点说明】", font: "SimHei", bold: true, size: 21, color: "166534" }),
                        new docx_1.TextRun({ text: "", break: 1 }),
                        ...parseHtmlToDocxRuns(q.analysis || '', "14532d")
                    ]
                }));
            }
            else {
                if (!q.options || q.options.length === 0) {
                    children.push(new docx_1.Paragraph({
                        spacing: { before: 300, after: 300 },
                        children: [
                            new docx_1.TextRun({ text: "_________________________________________________________________________________", font: "SimSun", size: 20, color: "cbd5e1" })
                        ]
                    }));
                }
            }
        });
        const doc = new docx_1.Document({
            sections: [
                {
                    properties: {
                        page: {
                            margin: {
                                top: 1440, // 1 inch
                                bottom: 1440,
                                left: 1080, // 0.75 inch
                                right: 1080
                            }
                        }
                    },
                    children
                }
            ]
        });
        const buffer = await docx_1.Packer.toBuffer(doc);
        const safeAsciiFilename = "paper_A4.docx";
        const utf8Filename = encodeURIComponent(`${paperTitle || '试卷'}_A4标准排版.docx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${utf8Filename}`);
        res.send(buffer);
    }
    catch (error) {
        console.error('Error generating docx:', error);
        res.status(500).json({ error: 'Failed to generate Word document' });
    }
});
// GET /api/export/download-pdf - GET endpoint for A4 PDF Print Window
app.get('/api/export/download-pdf', (req, res) => {
    try {
        const taskId = req.query.id;
        const task = exportTasks.get(taskId);
        if (!task) {
            return res.status(404).send('Print link expired or invalid');
        }
        const { paperTitle = "2026年青岛市中考语文专项练习组卷", selectedQuestions = [], totalScore = 115, isPassageIncludedMap = {}, isAnswerIncludedMap = {} } = task.data;
        let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${paperTitle}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 15mm; }
    body { font-family: "SimSun", "Songti SC", serif; font-size: 11pt; line-height: 1.6; color: #1e293b; background: #ffffff; margin: 0; padding: 0; }
    .paper-container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .paper-header { text-align: center; margin-bottom: 25px; border-bottom: 2pt solid #0284c7; padding-bottom: 12px; }
    .paper-title { font-size: 18pt; font-weight: bold; color: #0f172a; margin-bottom: 8px; font-family: "SimHei", sans-serif; }
    .paper-info { font-size: 10.5pt; color: #64748b; }
    .q-card { margin-bottom: 20pt; border-bottom: 1px dashed #e2e8f0; padding-bottom: 15pt; page-break-inside: avoid; }
    .q-header { font-weight: bold; font-size: 11pt; color: #0369a1; margin-bottom: 8pt; font-family: "SimHei", sans-serif; }
    .passage-box { background: #f8fafc; border-left: 3.5pt solid #0284c7; padding: 10pt 12pt; margin-bottom: 12pt; font-size: 10.5pt; line-height: 2.2; white-space: pre-wrap; }
    .stem { font-size: 11pt; font-weight: bold; margin-bottom: 8pt; color: #0f172a; line-height: 1.6; }
    .option-line { margin-left: 18pt; font-size: 10.5pt; margin-bottom: 4pt; color: #334155; }
    .answer-card { margin-top: 12pt; background: #f0fdf4; border: 1pt solid #bbf7d0; padding: 10pt; border-radius: 4pt; }
    .ans-title { font-weight: bold; color: #166534; font-size: 10.5pt; font-family: "SimHei", sans-serif; }
    .ans-content { color: #14532d; font-size: 10.5pt; margin-top: 4pt; }
    .blank-line { height: 40pt; border-bottom: 1px dashed #cbd5e1; margin-top: 8pt; }
    .dot-char { display: inline-block; position: relative; margin: 0 1px; }
    .dot-char::after { content: "●"; position: absolute; bottom: -0.55em; left: 50%; transform: translateX(-50%); font-size: 0.55em; color: #0f172a; font-weight: 900; line-height: 1; }
    u, .underline { text-decoration: underline !important; text-underline-offset: 3px; color: #0f172a; }
    .wavy-underline { text-decoration: underline wavy #0284c7 !important; text-underline-offset: 3px; color: #0284c7; }
    .blank-underline { display: inline-block; min-width: 50pt; border-bottom: 1.5pt solid #0f172a; }
  </style>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</head>
<body>
  <div class="paper-container">
    <div class="paper-header">
      <div class="paper-title">${paperTitle}</div>
      <div class="paper-info">卷面规格：A4 标准排版 | 试题总数：${selectedQuestions.length} 道 | 满分：${totalScore} 分</div>
    </div>`;
        selectedQuestions.forEach((item, index) => {
            const q = item.question || item;
            const qKey = item.qKey || `${item.examId}_${q.id}`;
            const hasPassage = isPassageIncludedMap[qKey] !== false && q.passage;
            const hasAnswer = isAnswerIncludedMap[qKey] !== false;
            html += `<div class="q-card">`;
            html += `<div class="q-header">第 ${index + 1} 题 【${item.year || ''} ${item.district || ''} ${item.examCategory || ''}】 (${q.score || 2}分)</div>`;
            if (hasPassage) {
                html += `<div class="passage-box"><strong>【阅读材料】</strong><br/>${q.passage}</div>`;
            }
            html += `<div class="stem">${q.stem}</div>`;
            if (q.options && q.options.length > 0) {
                q.options.forEach((opt) => {
                    html += `<div class="option-line">${opt}</div>`;
                });
            }
            if (hasAnswer) {
                html += `<div class="answer-card">`;
                html += `<div class="ans-title">🎯 【参考答案】</div>`;
                html += `<div class="ans-content">${q.answer || ''}</div>`;
                html += `<div class="ans-title" style="margin-top:8px;">💡 【详细解析与考点说明】</div>`;
                html += `<div class="ans-content">${q.analysis || ''}</div>`;
                html += `</div>`;
            }
            else {
                if (!q.options || q.options.length === 0) {
                    html += `<div class="blank-line"></div>`;
                }
            }
            html += `</div>`;
        });
        html += `</div></body></html>`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    }
    catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF document' });
    }
});
// GET /api/health
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server: 'chinese-exam-server', timestamp: new Date() });
});
app.listen(PORT, () => {
    console.log(`🚀 Chinese Exam Server running at http://localhost:${PORT}`);
});
