import React, { useState, useMemo } from 'react';
import type { Exam, Question } from '../types';
import { ShoppingCart, FileText, FileSpreadsheet, Trash2, ArrowRight } from 'lucide-react';

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
  const [mode, setMode] = useState<'student' | 'teacher'>('student');

  // Compute list of selected questions across all exams
  const selectedQuestions = useMemo(() => {
    const list: { qKey: string; examCategory: string; year: string; district: string; question: Question }[] = [];

    examsData.forEach((exam) => {
      exam.questions.forEach((q, qIdx) => {
        const qKey = `${exam.id}_q${qIdx}`;
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

  // Total score calculation
  const totalScore = useMemo(() => {
    return selectedQuestions.reduce((acc, curr) => {
      const s = parseInt(String(curr.question.score || 2), 10);
      return acc + (isNaN(s) ? 2 : s);
    }, 0);
  }, [selectedQuestions]);

  // A4 Document HTML Builder
  const buildA4HTML = () => {
    const isTeacher = mode === 'teacher';

    let html = '<!DOCTYPE html><html><head><meta charset="utf-8">';
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
    html += '.q-card { margin-bottom: 22pt; page-break-inside: avoid; border-bottom: 1px dashed #e2e8f0; padding-bottom: 15pt; }';
    html += '.q-header { font-weight: bold; font-size: 11pt; color: #0369a1; margin-bottom: 8pt; }';
    html += '.passage-box { background: #f8fafc; border-left: 3.5pt solid #0284c7; padding: 10pt 12pt; margin-bottom: 12pt; font-size: 10.5pt; line-height: 2.2; white-space: pre-wrap; }';
    html += '.stem { font-size: 11pt; font-weight: bold; margin-bottom: 8pt; color: #0f172a; line-height: 1.6; }';
    html += '.option-line { margin-left: 18pt; font-size: 10.5pt; margin-bottom: 4pt; color: #334155; }';
    html += '.answer-card { margin-top: 12pt; background: #f0fdf4; border: 1pt solid #bbf7d0; padding: 10pt; border-radius: 4pt; }';
    html += '.ans-title { font-weight: bold; color: #166534; font-size: 10.5pt; }';
    html += '.ans-content { color: #14532d; font-size: 10.5pt; margin-top: 4pt; }';
    html += '.blank-line { height: 40pt; border-bottom: 1px dashed #cbd5e1; margin-top: 8pt; }';
    html += '.dot-emphasis { border-bottom: 2px dotted #0284c7; padding-bottom: 1px; font-weight: bold; }';
    html += '</style></head><body>';

    html += '<div class="WordSection1"><div class="paper-container">';
    html += '<div class="paper-header">';
    html += '<div class="paper-title">' + paperTitle + '</div>';
    html += '<div class="paper-info">卷面规格：A4 标准排版 | 试题总数：' + selectedQuestions.length + ' 道 | 满分：' + totalScore + ' 分 | 模式：' + (isTeacher ? '教师解析卷' : '学生自测卷') + '</div>';
    html += '</div>';

    selectedQuestions.forEach((item, index) => {
      const q = item.question;
      html += '<div class="q-card">';
      html += '<div class="q-header">第 ' + (index + 1) + ' 题 【' + item.year + ' ' + item.district + ' ' + item.examCategory + '】 (' + (q.score || 2) + '分)</div>';

      if (q.passage) {
        html += '<div class="passage-box"><strong>【阅读材料】</strong><br/>' + q.passage + '</div>';
      }

      html += '<div class="stem">' + q.stem + '</div>';

      if (q.options && q.options.length > 0) {
        q.options.forEach(opt => {
          html += '<div class="option-line">' + opt + '</div>';
        });
      }

      if (isTeacher) {
        html += '<div class="answer-card">';
        html += '<div class="ans-title">🎯 【参考答案】</div>';
        html += '<div class="ans-content">' + q.answer + '</div>';
        html += '<div class="ans-title" style="margin-top:8px;">💡 【详细解析与考点说明】</div>';
        html += '<div class="ans-content">' + q.analysis + '</div>';
        html += '</div>';
      } else {
        // Student mode blank answer area for non-choice questions
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
    const htmlContent = buildA4HTML();
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

  // Export A4 PDF via System Print Window
  const handleExportA4PDF = () => {
    if (selectedQuestions.length === 0) return;
    const htmlContent = buildA4HTML();
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(htmlContent);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
      }, 500);
    }
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
            汇集您在“7大考点分项”与“试卷大盘”中勾选的所有试题，支持单项移除、自定义试卷标题，导出标准 A4 规格 Word 或 PDF！
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

            <div className="filter-row" style={{ marginTop: '0.75rem', marginBottom: 0, justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="filter-chips">
                <button
                  className={`chip-btn ${mode === 'student' ? 'active' : ''}`}
                  onClick={() => setMode('student')}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  🎓 学生卷 (隐藏答案与解析)
                </button>
                <button
                  className={`chip-btn ${mode === 'teacher' ? 'active' : ''}`}
                  onClick={() => setMode('teacher')}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  👨‍🏫 教师解析卷 (全显参考答案)
                </button>
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
                  {/* Card Header with Remove Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                        第 {idx + 1} 题
                      </span>
                      <span className="badge badge-mock">{year}</span>
                      <span className="badge badge-real">{examCategory}</span>
                      <span className="badge badge-mock">{district}</span>
                      <span className="badge badge-real" style={{ background: '#ecfdf5', color: '#047857' }}>{q.score || 2}分</span>
                    </div>

                    <button
                      className="action-btn"
                      onClick={() => onToggleSelectQ(qKey)}
                      style={{ color: '#ef4444', padding: '0.2rem 0.6rem', fontSize: '0.8rem', border: '1px solid #fca5a5' }}
                      title="从下载总览中移除此题"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> 移除单题
                    </button>
                  </div>

                  {/* Passage Box */}
                  {q.passage && (
                    <div className="passage-box" style={{ background: '#f8fafc', borderLeft: '4px solid #0284c7', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>
                      <div style={{ fontWeight: 700, color: '#0284c7', fontSize: '0.9rem', marginBottom: '0.5rem' }}>📖 【阅读语段 / 背景材料】</div>
                      <div
                        style={{ color: '#334155', fontSize: '0.95rem', lineHeight: '2.2', whiteSpace: 'pre-wrap' }}
                        dangerouslySetInnerHTML={{ __html: q.passage }}
                      />
                    </div>
                  )}

                  {/* Stem */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div
                      style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.6 }}
                      dangerouslySetInnerHTML={{ __html: q.stem }}
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

                  {/* Answer Box (If mode === 'teacher') */}
                  {mode === 'teacher' && (
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
