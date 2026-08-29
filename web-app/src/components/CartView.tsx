// @ts-ignore
import html2pdf from 'html2pdf.js';
import React, { useState, useMemo } from 'react';
import type { Exam, Question } from '../types';
import { cleanStem } from '../utils';
import { ShoppingCart, FileText, FileSpreadsheet, Trash2, ArrowRight, CheckSquare, Square } from 'lucide-react';

interface CartViewProps {
  examsData: Exam[];
  selectedQKeys: Set<string>;
  onToggleSelectQ: (qKey: string) => void;
  onClearAll: () => void;
  onNavigateToModules: () => void;
}

export const CartView: React.FC<CartViewProps> = ({
  examsData,
  selectedQKeys,
  onToggleSelectQ,
  onClearAll,
  onNavigateToModules
}) => {
  const [paperTitle, setPaperTitle] = useState<string>('2026年青岛市中考语文专项练习组卷');

  // Global Checkbox Controls
  const [globalIncludeAnswers, setGlobalIncludeAnswers] = useState<boolean>(false);
  const [globalIncludePassages, setGlobalIncludePassages] = useState<boolean>(true);

  // Per-Question Custom Overrides Maps
  const [customAnswersMap, setCustomAnswersMap] = useState<Record<string, boolean>>({});
  const [customPassagesMap, setCustomPassagesMap] = useState<Record<string, boolean>>({});

  // Helper resolvers
  const isAnswerIncluded = (qKey: string) => {
    return customAnswersMap[qKey] !== undefined ? customAnswersMap[qKey] : globalIncludeAnswers;
  };

  const isPassageIncluded = (qKey: string) => {
    return customPassagesMap[qKey] !== undefined ? customPassagesMap[qKey] : globalIncludePassages;
  };

  // Toggle Handlers
  const handleToggleGlobalAnswers = () => {
    const next = !globalIncludeAnswers;
    setGlobalIncludeAnswers(next);
    setCustomAnswersMap({}); // Reset custom overrides when global toggled
  };

  const handleToggleGlobalPassages = () => {
    const next = !globalIncludePassages;
    setGlobalIncludePassages(next);
    setCustomPassagesMap({}); // Reset custom overrides when global toggled
  };

  const handleToggleSingleAnswer = (qKey: string) => {
    const curr = isAnswerIncluded(qKey);
    setCustomAnswersMap(prev => ({ ...prev, [qKey]: !curr }));
  };

  const handleToggleSinglePassage = (qKey: string) => {
    const curr = isPassageIncluded(qKey);
    setCustomPassagesMap(prev => ({ ...prev, [qKey]: !curr }));
  };

  // Compute list of selected questions across all exams
  const selectedQuestions = useMemo(() => {
    const list: { qKey: string; examCategory: string; year: string; district: string; question: Question }[] = [];

    examsData.forEach((exam) => {
      exam.questions.forEach((q, qIdx) => {
        const qKey = `${exam.id}_q${qIdx + 1}`;
        if (selectedQKeys.has(qKey)) {
          list.push({
            qKey,
            examCategory: exam.category,
            year: exam.year,
            district: exam.district,
            question: q
          });
        }
      });
    });

    return list;
  }, [examsData, selectedQKeys]);

  // Smart Total score calculation (with 50-pt writing prompt deduplication per exam)
  const totalScore = useMemo(() => {
    const countedWritingMap = new Set<string>();

    return selectedQuestions.reduce((acc, curr) => {
      const scoreNum = parseInt(String(curr.question.score || 2), 10);
      const s = isNaN(scoreNum) ? 2 : scoreNum;

      // Extract examId from qKey e.g. "exam_xxx_q1" -> "exam_xxx"
      const examId = curr.qKey.substring(0, curr.qKey.lastIndexOf('_q'));

      if (s === 50) {
        if (countedWritingMap.has(examId)) {
          // Additional 50-point choice writing prompt in the same exam -> do not double count
          return acc;
        }
        countedWritingMap.add(examId);
      }

      return acc + s;
    }, 0);
  }, [selectedQuestions]);

  // Helper to format HTML strings for PDF (Foreground SVG vector wave & Chromium ::after dots)
  const formatForPDF = (htmlStr?: string): string => {
    if (!htmlStr) return '';
    let s = htmlStr;

    // 0. Convert raw newline \n into HTML physical <br/> breaks
    s = s.replace(/\r?\n/g, '<br/>');

    // 1. Bold <b> and <strong>
    s = s.replace(/<b>(.*?)<\/b>/gi, '<strong class="exam-bold" style="font-weight: 900; color: #0f172a;">$1</strong>');
    s = s.replace(/<strong>(.*?)<\/strong>/gi, '<strong class="exam-bold" style="font-weight: 900; color: #0f172a;">$1</strong>');

    // 2. Wavy underline -> SVG background image Data-URI + inline-block (100% renders crisp blue wavy line in html2canvas PDF)
    const svgWaveNode = '<span class="wavy-underline" style="display:inline-block; background-image: url(\'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'5\' viewBox=\'0 0 8 5\'%3E%3Cpath d=\'M 0,2.5 Q 2,0 4,2.5 T 8,2.5\' fill=\'none\' stroke=\'%230284c7\' stroke-width=\'1.8\' stroke-linecap=\'round\'/%3E%3C/svg%3E\'); background-position: bottom left; background-repeat: repeat-x; padding-bottom: 3px; color: #0284c7;">$1</span>';
    s = s.replace(/<u[^>]*style="[^"]*wavy[^"]*"[^>]*>(.*?)<\/u>/gi, svgWaveNode);
    s = s.replace(/<u[^>]*class="[^"]*wavy[^"]*"[^>]*>(.*?)<\/u>/gi, svgWaveNode);
    s = s.replace(/<u style="text-decoration:\s*wavy;?">(.*?)<\/u>/gi, svgWaveNode);

    // 3. Standard underline <u>
    s = s.replace(/<u>(.*?)<\/u>/gi, '<u class="underline" style="text-decoration: underline !important; text-underline-offset: 3px; color: #0f172a;">$1</u>');

    // 4. Dot emphasis (加点字/着重号) <span class="dot-char">
    s = s.replace(/<span class="dot-char">(.*?)<\/span>/gi, '<span class="dot-char" style="display:inline-block; position:relative; margin:0 1px; color:#0f172a;">$1</span>');
    s = s.replace(/<span class="dot-emphasis">(.*?)<\/span>/gi, '<span class="dot-emphasis">$1</span>');

    // 5. Blank underline
    s = s.replace(/<span class="blank-underline">(.*?)<\/span>/gi, '<span class="blank-underline" style="text-decoration: underline !important; color: #0f172a;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>');

    return s;
  };

  // Helper to format HTML strings for Word (.doc MSO Filter Engine)
  const formatForWord = (htmlStr?: string): string => {
    if (!htmlStr) return '';
    let s = htmlStr;

    // 0. Convert raw newline \n into HTML physical <br/> breaks
    s = s.replace(/\r?\n/g, '<br/>');

    // 1. Bold <b> and <strong> -> HeiTi fallback for Word
    s = s.replace(/<b>(.*?)<\/b>/gi, '<strong style="font-weight: 900; mso-bidi-font-weight: bold; font-family: \'SimHei\', \'Microsoft YaHei\', sans-serif; color: #0f172a;">$1</strong>');
    s = s.replace(/<strong>(.*?)<\/strong>/gi, '<strong style="font-weight: 900; mso-bidi-font-weight: bold; font-family: \'SimHei\', \'Microsoft YaHei\', sans-serif; color: #0f172a;">$1</strong>');

    // 2. Wavy underline -> Pure Word MSO Wavy Underline
    s = s.replace(/<u[^>]*style="[^"]*wavy[^"]*"[^>]*>(.*?)<\/u>/gi, '<u style="text-underline: wave; mso-text-underline-style: wave; color: #0284c7;">$1</u>');
    s = s.replace(/<u[^>]*class="[^"]*wavy[^"]*"[^>]*>(.*?)<\/u>/gi, '<u style="text-underline: wave; mso-text-underline-style: wave; color: #0284c7;">$1</u>');
    s = s.replace(/<u style="text-decoration:\s*wavy;?">(.*?)<\/u>/gi, '<u style="text-underline: wave; mso-text-underline-style: wave; color: #0284c7;">$1</u>');

    // 3. Standard underline <u> -> Word official text-underline: thick & mso-text-underline-style: thick (Word 100% renders thick bold straight underline)
    s = s.replace(/<u>(.*?)<\/u>/gi, '<u style="text-underline: thick; mso-text-underline-style: thick; text-decoration: underline; text-decoration-thickness: 3px; color: #0f172a;">$1</u>');

    // 4. Dot emphasis (加点字/着重号) -> Word & WPS Native Heavy Dotted Underline
    s = s.replace(/<span class="dot-char">(.*?)<\/span>/gi, '<u style="text-underline: dotted-heavy; color: #0f172a;">$1</u>');
    s = s.replace(/<span class="dot-emphasis">(.*?)<\/span>/gi, '$1');

    // 5. Blank underline
    s = s.replace(/<span class="blank-underline">(.*?)<\/span>/gi, '<u style="text-underline: single; color: #0f172a;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>');

    return s;
  };

  // A4 Document HTML Builder (Dynamic based on target: 'pdf' or 'word')
  const buildA4HTML = (target: 'pdf' | 'word' = 'word') => {
    const formatter = target === 'pdf' ? formatForPDF : formatForWord;
    let html = '<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8">';
    html += '<meta name="ProgId" content="Word.Document">';
    html += '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->';
    html += '<title>' + paperTitle + '</title>';
    html += '<style>';
    html += '@page { size: A4 portrait; margin: 20mm 15mm; }';
    html += '@page WordSection1 { size: 595.3pt 841.9pt; margin: 72.0pt 54.0pt 72.0pt 54.0pt; mso-header-margin: 36.0pt; mso-footer-margin: 36.0pt; }';
    html += 'div.WordSection1 { page: WordSection1; }';
    html += 'body { font-family: "SimSun", "Songti SC", serif; font-size: 11pt; line-height: 1.6; color: #1e293b; background: #ffffff; margin: 0; padding: 0; }';
    html += '.paper-container { max-width: 800px; margin: 0 auto; padding: 20px; }';
    html += '.paper-header { text-align: center; margin-bottom: 25px; border-bottom: 2pt solid #0284c7; padding-bottom: 12px; }';
    html += '.paper-title { font-size: 18pt; font-weight: bold; color: #0f172a; margin-bottom: 8px; }';
    html += '.paper-info { font-size: 10.5pt; color: #64748b; }';
    html += '.q-card { margin-bottom: 20pt; border-bottom: 1px dashed #e2e8f0; padding-bottom: 15pt; page-break-inside: auto; }';
    html += '.q-header { font-weight: bold; font-size: 11pt; color: #0369a1; margin-bottom: 8pt; }';
    html += '.passage-box { background: #f8fafc; border-left: 3.5pt solid #0284c7; padding: 10pt 12pt; margin-bottom: 12pt; font-size: 10.5pt; line-height: 2.2; white-space: pre-wrap; }';
    html += '.stem { font-size: 11pt; font-weight: bold; margin-bottom: 8pt; color: #0f172a; line-height: 1.6; }';
    html += '.option-line { margin-left: 18pt; font-size: 10.5pt; margin-bottom: 4pt; color: #334155; }';
    html += '.answer-card { margin-top: 12pt; background: #f0fdf4; border: 1pt solid #bbf7d0; padding: 10pt; border-radius: 4pt; }';
    html += '.ans-title { font-weight: bold; color: #166534; font-size: 10.5pt; }';
    html += '.ans-content { color: #14532d; font-size: 10.5pt; margin-top: 4pt; }';
    html += '.blank-line { height: 40pt; border-bottom: 1px dashed #cbd5e1; margin-top: 8pt; }';
    html += '.dot-char { display: inline-block; position: relative; margin: 0 1px; }';
    html += '.dot-char::after { content: "●"; position: absolute; bottom: -0.55em; left: 50%; transform: translateX(-50%); font-size: 0.55em; color: #0f172a; font-weight: 900; line-height: 1; }';
    html += 'u, .underline { text-decoration: underline !important; text-underline-offset: 3px; color: #0f172a; }';
    html += '.wavy-underline { text-decoration: underline wavy #0284c7 !important; text-underline-offset: 3px; color: #0284c7; }';
    html += '.blank-underline { display: inline-block; min-width: 50pt; border-bottom: 1.5pt solid #0f172a; }';
    html += '.exam-bold, b, strong { font-weight: bold !important; color: #0f172a !important; }';
    html += '</style></head><body>';

    html += '<div class="WordSection1"><div class="paper-container">';
    html += '<div class="paper-header">';
    html += '<div class="paper-title">' + paperTitle + '</div>';
    html += '<div class="paper-info">卷面规格：A4 标准排版 | 试题总数：' + selectedQuestions.length + ' 道 | 满分：' + totalScore + ' 分</div>';
    html += '</div>';

    selectedQuestions.forEach((item, index) => {
      const { qKey, question: q } = item;
      const hasPassage = isPassageIncluded(qKey) && q.passage;
      const hasAnswer = isAnswerIncluded(qKey);

      html += '<div class="q-card">';
      html += '<div class="q-header">第 ' + (index + 1) + ' 题 【' + item.year + ' ' + item.district + ' ' + item.examCategory + '】 (' + (q.score || 2) + '分)</div>';

      if (hasPassage) {
        html += '<div class="passage-box"><strong>【阅读材料】</strong><br/>' + formatter(q.passage) + '</div>';
      }

      html += '<div class="stem">' + formatter(cleanStem(q.stem)) + '</div>';

      if (q.options && q.options.length > 0) {
        q.options.forEach(opt => {
          html += '<div class="option-line">' + formatter(opt) + '</div>';
        });
      }

      if (hasAnswer) {
        html += '<div class="answer-card">';
        html += '<div class="ans-title">🎯 【参考答案】</div>';
        html += '<div class="ans-content">' + formatter(q.answer) + '</div>';
        html += '<div class="ans-title" style="margin-top:8px;">💡 【详细解析与考点说明】</div>';
        html += '<div class="ans-content">' + formatter(q.analysis) + '</div>';
        html += '</div>';
      } else {
        if (!q.options || q.options.length === 0) {
          html += '<div class="blank-line"></div>';
        }
      }

      html += '</div>';
    });

    html += '</div></div></body></html>';
    return html;
  };

  // Export A4 Word Document (.doc)
  const handleExportA4Word = () => {
    if (selectedQuestions.length === 0) return;
    const htmlContent = buildA4HTML('word');
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = paperTitle + '_A4标准排版.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export A4 PDF directly via html2pdf.js using an isolated hidden iframe sandbox
  const handleExportA4PDF = () => {
    if (selectedQuestions.length === 0) return;
    const htmlContent = buildA4HTML('pdf');

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    if (!win) return;

    const doc = win.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      const opt = {
        margin:       [12, 12, 12, 12],
        filename:     `${paperTitle}_A4标准排版.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
      };

      try {
        // @ts-ignore
        html2pdf().set(opt).from(doc.body).save().then(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        });
      } catch (e) {
        console.error("PDF export failed:", e);
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }
    }, 300);
  };

  return (
    <div className="cart-view-container">
      {/* Top Banner */}
      <div className="hero-banner no-print" style={{ background: 'linear-gradient(to right, #0f172a, #1e293b)' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            <ShoppingCart className="w-4 h-4 text-sky-400" /> 全局试题下载总览中心
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem', color: '#ffffff' }}>
            🛒 已选试题汇总与 A4 标准排版一键组卷
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '800px' }}>
            汇集您在“7大考点分项”与“试卷大盘”中勾选的所有试题，支持全局与单题灵活控制【答案/解析】与【背景材料】，一键导出 A4 规格 Word 或 PDF！
          </p>
        </div>
      </div>

      {/* Cart Empty State Guide */}
      {selectedQuestions.length === 0 ? (
        <div className="filter-card no-print" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: '#f0f9ff', color: '#0284c7', marginBottom: '1rem' }}>
            <ShoppingCart className="w-12 h-12" />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            您的下载总览篮目前是空的
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
            您还没有选择任何试题。请前往【🥞 7大考点分项】或【📄 试卷大盘】勾选试题复选框，即可在此处集中导出 A4 排版试卷。
          </p>
          <button
            className="action-btn action-btn-primary"
            onClick={onNavigateToModules}
            style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem', margin: '0 auto' }}
          >
            🚀 前往『7大考点分项』勾选试题 <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      ) : (
        <>
          {/* Paper Control Matrix Card */}
          <div className="filter-card no-print">
            <div className="filter-row" style={{ alignItems: 'center' }}>
              <div className="filter-label">试卷名称:</div>
              <input
                type="text"
                value={paperTitle}
                onChange={e => setPaperTitle(e.target.value)}
                className="search-input"
                style={{ flex: 1, fontWeight: 700, color: '#0f172a' }}
              />
            </div>

            {/* Global Checkbox Matrix */}
            <div className="filter-row" style={{ marginTop: '0.75rem', marginBottom: 0, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>全局包含内容:</span>

                <label
                  onClick={handleToggleGlobalPassages}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: globalIncludePassages ? '#0284c7' : '#64748b',
                    background: globalIncludePassages ? '#e0f2fe' : '#f8fafc',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '20px',
                    border: `1px solid ${globalIncludePassages ? '#0284c7' : '#cbd5e1'}`,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {globalIncludePassages ? <CheckSquare className="w-4 h-4 text-sky-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                  <span>背景材料 / 阅读原文</span>
                </label>

                <label
                  onClick={handleToggleGlobalAnswers}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: globalIncludeAnswers ? '#059669' : '#64748b',
                    background: globalIncludeAnswers ? '#d1fae5' : '#f8fafc',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '20px',
                    border: `1px solid ${globalIncludeAnswers ? '#10b981' : '#cbd5e1'}`,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {globalIncludeAnswers ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                  <span>答案 / 详细解析</span>
                </label>
              </div>

              <button
                className="action-btn"
                onClick={onClearAll}
                style={{ color: '#ef4444', borderColor: '#fca5a5' }}
              >
                <Trash2 className="w-4 h-4" /> 🧹 一键清空试题篮
              </button>
            </div>
          </div>

          {/* Unified Export Toolbar Card */}
          <div className="filter-card no-print" style={{ padding: '1rem 1.5rem', background: '#f0f9ff', borderColor: '#bae6fd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0369a1' }}>
                  已选试题汇总：{selectedQuestions.length} 道
                </span>
                <span style={{ marginLeft: '1rem', color: '#0284c7', fontSize: '0.9rem' }}>
                  预估总分：<strong>{totalScore}</strong> 分 | 排版规格：A4 标准纸张 (210mm×297mm)
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="action-btn action-btn-primary"
                  onClick={handleExportA4Word}
                  style={{ background: '#10b981', borderColor: '#10b981', padding: '0.6rem 1.2rem' }}
                >
                  <FileSpreadsheet className="w-4 h-4" /> 📥 导出 A4 Word (.doc)
                </button>
                <button
                  className="action-btn action-btn-primary"
                  onClick={handleExportA4PDF}
                  style={{ background: '#ef4444', borderColor: '#ef4444', padding: '0.6rem 1.2rem' }}
                >
                  <FileText className="w-4 h-4" /> 📄 导出 A4 PDF (.pdf)
                </button>
              </div>
            </div>
          </div>

          {/* Selected Questions Stream */}
          <div className="questions-stream">
            {selectedQuestions.map((item, idx) => {
              const { qKey, examCategory, year, district, question: q } = item;
              const hasPassage = isPassageIncluded(qKey) && q.passage;
              const hasAnswer = isAnswerIncluded(qKey);

              return (
                <div
                  key={qKey}
                  className="question-item"
                  style={{
                    background: '#ffffff',
                    borderColor: '#e2e8f0',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    position: 'relative'
                  }}
                >
                  {/* Card Header with Badges, Per-Question Checkboxes (Red Circles), and Remove Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid #f1f5f9' }}>
                    {/* Left Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                        第 {idx + 1} 题
                      </span>
                      <span className="badge badge-mock">{year}</span>
                      <span className="badge badge-real">{examCategory}</span>
                      <span className="badge badge-mock">{district}</span>
                      <span className="badge badge-real" style={{ background: '#ecfdf5', color: '#047857' }}>{q.score || 2}分</span>
                    </div>

                    {/* Right Controls: Single-Item Micro Checkboxes & Remove Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      {/* Checkbox 1: Background Passage */}
                      <label
                        onClick={() => handleToggleSinglePassage(qKey)}
                        title="点击单独开启/关闭此题的背景材料"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          cursor: 'pointer',
                          userSelect: 'none',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: hasPassage ? '#0284c7' : '#94a3b8',
                          background: hasPassage ? '#f0f9ff' : '#f8fafc',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '12px',
                          border: `1px solid ${hasPassage ? '#bae6fd' : '#e2e8f0'}`,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {hasPassage ? <CheckSquare className="w-3.5 h-3.5 text-sky-600" /> : <Square className="w-3.5 h-3.5 text-slate-300" />}
                        <span>背景材料</span>
                      </label>

                      {/* Checkbox 2: Answer & Analysis */}
                      <label
                        onClick={() => handleToggleSingleAnswer(qKey)}
                        title="点击单独开启/关闭此题的答案与解析"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          cursor: 'pointer',
                          userSelect: 'none',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: hasAnswer ? '#059669' : '#94a3b8',
                          background: hasAnswer ? '#ecfdf5' : '#f8fafc',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '12px',
                          border: `1px solid ${hasAnswer ? '#a7f3d0' : '#e2e8f0'}`,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {hasAnswer ? <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> : <Square className="w-3.5 h-3.5 text-slate-300" />}
                        <span>答案/解析</span>
                      </label>

                      {/* Remove Button */}
                      <button
                        className="action-btn"
                        onClick={() => onToggleSelectQ(qKey)}
                        style={{ color: '#ef4444', padding: '0.2rem 0.6rem', fontSize: '0.8rem', border: '1px solid #fca5a5' }}
                        title="从下载总览中移除此题"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> 移除单题
                      </button>
                    </div>
                  </div>

                  {/* Passage Box (Rendered only if hasPassage is true) */}
                  {hasPassage && (
                    <div className="passage-box" style={{ background: '#f8fafc', borderLeft: '4px solid #0284c7', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>
                      <div style={{ fontWeight: 700, color: '#0284c7', fontSize: '0.9rem', marginBottom: '0.5rem' }}>📖 【阅读语段 / 背景材料】</div>
                      <div
                        style={{ color: '#334155', fontSize: '0.95rem', lineHeight: '2.2', whiteSpace: 'pre-wrap' }}
                        dangerouslySetInnerHTML={{ __html: q.passage || '' }}
                      />
                    </div>
                  )}

                  {/* Stem */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div
                      style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.6 }}
                      dangerouslySetInnerHTML={{ __html: cleanStem(q.stem) }}
                    />
                  </div>

                  {/* Options List */}
                  {q.options && q.options.length > 0 && (
                    <div className="options-list" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '0.75rem 1rem',
                            color: '#334155',
                            fontSize: '0.95rem'
                          }}
                          dangerouslySetInnerHTML={{ __html: opt }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Answer Box (Rendered only if hasAnswer is true) */}
                  {hasAnswer && (
                    <div className="answer-box" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                      <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.9rem', marginBottom: '0.4rem' }}>🎯 【参考答案】</div>
                      <div style={{ color: '#14532d', fontSize: '0.95rem', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: q.answer }} />
                      <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.9rem', marginTop: '0.85rem', marginBottom: '0.4rem' }}>💡 【详细解析与考点说明】</div>
                      <div style={{ color: '#14532d', fontSize: '0.95rem', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: q.analysis }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
