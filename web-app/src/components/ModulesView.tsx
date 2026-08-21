import React, { useState, useMemo } from 'react';
import type { Exam, Question } from '../types';
import { CheckSquare, Square, FileText, FileSpreadsheet, Eye, EyeOff, Search, Sparkles, Filter, CheckCircle2, XCircle } from 'lucide-react';

interface ModulesViewProps {
  examsData: Exam[];
}

export const MODULE_CATEGORIES = [
  { id: 'all', name: '全部考点', icon: '🌐', keyword: '全部' },
  { id: 'base', name: '一、基础积累与运用', icon: '📝', keyword: '基础' },
  { id: 'classics', name: '二、名著阅读', icon: '📖', keyword: '名著' },
  { id: 'poetry', name: '三、诗歌阅读', icon: '🎋', keyword: '诗' },
  { id: 'wenyan', name: '四、文言文阅读', icon: '📜', keyword: '文言文' },
  { id: 'modern1', name: '五、现代文阅读Ⅰ', icon: '🔬', keyword: '现代文阅读Ⅰ' },
  { id: 'modern2', name: '六、现代文阅读Ⅱ', icon: '🎨', keyword: '现代文阅读Ⅱ' },
  { id: 'writing', name: '七、写作', icon: '✍️', keyword: '写作' }
];

export const ModulesView: React.FC<ModulesViewProps> = ({ examsData }) => {
  const [selectedModule, setSelectedModule] = useState<string>('base');
  const [sourceFilter, setSourceFilter] = useState<'all' | '正式真题' | '区县模拟'>('正式真题');
  const [yearFilter, setYearFilter] = useState<string>('全部');
  const [districtFilter, setDistrictFilter] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // View mode: 'student' (极简自测) | 'teacher' (教研全显)
  const [mode, setMode] = useState<'student' | 'teacher'>('student');
  
  // Checkboxes
  const [selectedQKeys, setSelectedQKeys] = useState<Set<string>>(new Set());

  // Interactive student option selections
  const [userSelectedOpts, setUserSelectedOpts] = useState<Record<string, string>>({});

  // Expanded answer states
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});

  const years = ['全部', '2025年', '2024年', '2023年', '2022年', '2021年', '2020年', '2019年', '2018年'];
  const districts = ['全部', '青岛市级', '市南区', '市北区', '李沧区', '崂山区', '黄岛区', '城阳区', '即墨区', '平度市', '莱西市'];

  // Categorized questions computation
  const categorizedQuestions = useMemo(() => {
    const list: { qKey: string; examCategory: string; year: string; district: string; question: Question }[] = [];

    examsData.forEach((exam) => {
      if (sourceFilter !== 'all' && exam.category !== sourceFilter) return;
      if (yearFilter !== '全部' && exam.year !== yearFilter) return;
      if (districtFilter !== '全部' && exam.district !== districtFilter) return;

      exam.questions.forEach((q, qIdx) => {
        const qKey = `${exam.id}_q${qIdx}`;
        const secT = q.section_title || '';
        const grpT = q.group_title || '';
        const stem = q.stem || '';

        // Determine bucket module
        let modKey = 'base';
        if (grpT.includes('名著') || stem.includes('名著') || stem.includes('《钢铁是怎样炼成的》') || stem.includes('《骆驼祥子》') || stem.includes('《名人传》') || stem.includes('《昆虫记》')) {
          modKey = 'classics';
        } else if (grpT.includes('诗') || stem.includes('诗歌') || stem.includes('《诗经》') || stem.includes('古诗') || stem.includes('对诗歌理解')) {
          modKey = 'poetry';
        } else if (grpT.includes('文言文') || stem.includes('加点词的解释') || stem.includes('翻译成现代汉语') || stem.includes('句式相同')) {
          modKey = 'wenyan';
        } else if (grpT.includes('现代文阅读Ⅰ') || grpT.includes('说明文') || grpT.includes('议论文') || grpT.includes('非遗')) {
          modKey = 'modern1';
        } else if (grpT.includes('现代文阅读Ⅱ') || grpT.includes('散文') || grpT.includes('记叙文') || grpT.includes('小说')) {
          modKey = 'modern2';
        } else if (grpT.includes('写作') || secT.includes('写作') || qIdx === exam.questions.length - 1) {
          modKey = 'writing';
        } else {
          modKey = 'base';
        }

        if (selectedModule !== 'all' && modKey !== selectedModule) return;

        if (searchQuery) {
          const kw = searchQuery.toLowerCase();
          const matchStem = q.stem.toLowerCase().includes(kw);
          const matchPassage = q.passage?.toLowerCase().includes(kw);
          const matchAnalysis = q.analysis?.toLowerCase().includes(kw);
          if (!matchStem && !matchPassage && !matchAnalysis) return;
        }

        list.push({
          qKey,
          examCategory: exam.category,
          year: exam.year,
          district: exam.district,
          question: q
        });
      });
    });

    return list;
  }, [examsData, selectedModule, sourceFilter, yearFilter, districtFilter, searchQuery]);

  // Selection Handlers
  const handleToggleSelectQ = (qKey: string) => {
    const next = new Set(selectedQKeys);
    if (next.has(qKey)) {
      next.delete(qKey);
    } else {
      next.add(qKey);
    }
    setSelectedQKeys(next);
  };

  const handleSelectAllCurrent = () => {
    const next = new Set(selectedQKeys);
    categorizedQuestions.forEach(item => next.add(item.qKey));
    setSelectedQKeys(next);
  };

  const handleClearSelection = () => {
    setSelectedQKeys(new Set());
  };

  // Student mode interactive option selection
  const handleStudentSelectOption = (qKey: string, optLetter: string) => {
    setUserSelectedOpts(prev => ({ ...prev, [qKey]: optLetter }));
  };

  const toggleExpandAnswer = (qKey: string) => {
    setExpandedAnswers(prev => ({ ...prev, [qKey]: !prev[qKey] }));
  };

  // Export HTML Generator
  const generateExportHTML = (items: typeof categorizedQuestions) => {
    const targetItems = items.length > 0 ? items : categorizedQuestions;
    const modTitle = MODULE_CATEGORIES.find(m => m.id === selectedModule)?.name || '青岛中考语文专项';
    
    let html = '<!DOCTYPE html><html><head><meta charset="utf-8">';
    html += '<title>' + modTitle + ' - 专项试题汇编</title>';
    html += '<style>body { font-family: SimSun, serif; line-height: 1.6; padding: 40px; color: #1e293b; background: #fff; } h1 { text-align: center; color: #0f172a; margin-bottom: 5px; } .subtitle { text-align: center; color: #64748b; font-size: 14px; margin-bottom: 30px; border-bottom: 2px solid #0284c7; padding-bottom: 10px; } .card { margin-bottom: 30px; padding: 20px; border: 1px solid #cbd5e1; border-radius: 8px; page-break-inside: avoid; background: #fff; } .card-header { font-weight: bold; color: #0369a1; font-size: 15px; margin-bottom: 10px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 6px; } .passage { background: #f8fafc; padding: 12px; border-left: 4px solid #0284c7; margin-bottom: 15px; font-size: 14px; white-space: pre-wrap; } .stem { font-size: 15px; font-weight: bold; margin-bottom: 10px; } .option { margin-left: 20px; font-size: 14px; margin-bottom: 4px; } .answer-box { margin-top: 15px; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 15px; border-radius: 6px; } .answer-title { font-weight: bold; color: #166534; } .dot-emphasis { border-bottom: 2px dotted #0284c7; padding-bottom: 1px; font-weight: bold; }</style></head><body>';
    html += '<h1>🏆 青岛中考语文专项试题汇编</h1>';
    html += '<div class="subtitle">分类模块：' + modTitle + ' | 包含题目：' + targetItems.length + ' 道 | 数据库出处：青岛市中考语文云平台</div>';

    targetItems.forEach((item, index) => {
      const q = item.question;
      html += '<div class="card">';
      html += '<div class="card-header">第 ' + (index + 1) + ' 题【' + item.year + ' ' + item.district + ' ' + item.examCategory + '】 (' + (q.score || 2) + '分)</div>';
      
      if (q.passage) {
        html += '<div class="passage"><strong>【阅读材料】</strong><br/>' + q.passage + '</div>';
      }

      html += '<div class="stem">' + q.stem + '</div>';

      if (q.options && q.options.length > 0) {
        q.options.forEach(opt => {
          html += '<div class="option">' + opt + '</div>';
        });
      }

      html += '<div class="answer-box">';
      html += '<div class="answer-title">【参考答案】</div>';
      html += '<div>' + q.answer + '</div>';
      html += '<div class="answer-title" style="margin-top:8px;">【详细解析】</div>';
      html += '<div>' + q.analysis + '</div>';
      html += '</div></div>';
    });

    html += '</body></html>';
    return html;
  };

  // Export Word (.doc)
  const handleExportWord = () => {
    const selectedItems = categorizedQuestions.filter(item => selectedQKeys.has(item.qKey));
    const itemsToExport = selectedItems.length > 0 ? selectedItems : categorizedQuestions;

    if (itemsToExport.length === 0) {
      alert("没有可导出的试题！");
      return;
    }

    const htmlContent = generateExportHTML(itemsToExport);
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const modTitle = MODULE_CATEGORIES.find(m => m.id === selectedModule)?.name || '专项试题';
    a.download = `青岛中考语文_${modTitle}_${itemsToExport.length}题.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export PDF (.pdf)
  const handleExportPDF = () => {
    const selectedItems = categorizedQuestions.filter(item => selectedQKeys.has(item.qKey));
    const itemsToExport = selectedItems.length > 0 ? selectedItems : categorizedQuestions;

    if (itemsToExport.length === 0) {
      alert("没有可导出的试题！");
      return;
    }

    const htmlContent = generateExportHTML(itemsToExport);
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
    <div className="modules-view-container">
      {/* 1. Top Hero Banner (Matching Exam Catalog Dark Hero Banner Style) */}
      <div className="hero-banner no-print">
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            <Sparkles className="w-4 h-4 text-sky-400" /> 青岛中考语文 7 大考点专项训练库
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem', background: 'linear-gradient(to right, #fff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            面向老师与学生的“看、比、练、印” 7 大考点专项中心
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '800px' }}>
            可单独切换选择【🏆正式真题】与【🏫区县模拟】，勾选试题一键批量导出 Word (.doc) 或 PDF，随时进行高效考点突击！
          </p>
        </div>
      </div>

      {/* 2. Category Module Navbar (Using standard clean .filter-card & .chip-btn) */}
      <div className="filter-card no-print">
        <div className="filter-row" style={{ marginBottom: '0.75rem', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📌 7 大考点分项导航</span>
          </div>
          <div className="badge badge-mock" style={{ fontSize: '0.85rem' }}>
            包含试题：{categorizedQuestions.length} 道
          </div>
        </div>

        <div className="filter-chips">
          {MODULE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`chip-btn ${selectedModule === cat.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedModule(cat.id);
                setSelectedQKeys(new Set());
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Multi-Filter Control Matrix Card */}
      <div className="filter-card no-print">
        {/* Source Switcher */}
        <div className="filter-row">
          <div className="filter-label">试题库源:</div>
          <div className="filter-chips">
            <button
              className={`chip-btn ${sourceFilter === '正式真题' ? 'active' : ''}`}
              onClick={() => setSourceFilter('正式真题')}
            >
              🏆 青岛正式真题库 (2018–2025年)
            </button>
            <button
              className={`chip-btn ${sourceFilter === '区县模拟' ? 'active' : ''}`}
              onClick={() => setSourceFilter('区县模拟')}
            >
              🏫 青岛区县模拟题库 (35套一模二模)
            </button>
            <button
              className={`chip-btn ${sourceFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSourceFilter('all')}
            >
              🌐 全部合并题库
            </button>
          </div>
        </div>

        {/* Year Filter */}
        <div className="filter-row">
          <div className="filter-label">考试年份:</div>
          <div className="filter-chips">
            {years.map(yr => (
              <button
                key={yr}
                className={`chip-btn ${yearFilter === yr ? 'active' : ''}`}
                onClick={() => setYearFilter(yr)}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>

        {/* District Filter */}
        <div className="filter-row">
          <div className="filter-label">区县筛选:</div>
          <div className="filter-chips">
            {districts.map(dist => (
              <button
                key={dist}
                className={`chip-btn ${districtFilter === dist ? 'active' : ''}`}
                onClick={() => setDistrictFilter(dist)}
              >
                {dist}
              </button>
            ))}
          </div>
        </div>

        {/* Keyword Search & Mode Toggle */}
        <div className="filter-row" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
          <div className="filter-label">试题检索:</div>
          <div style={{ flex: 1, display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-box-wrap" style={{ flex: 1, minWidth: '240px' }}>
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="检索题干、阅读原文或解析关键字..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            {/* Mode Switcher Toggle */}
            <div className="filter-chips">
              <button
                className={`chip-btn ${mode === 'student' ? 'active' : ''}`}
                onClick={() => setMode('student')}
                style={{ padding: '0.5rem 1rem' }}
              >
                🎓 学生自测模式 (极简刷题)
              </button>
              <button
                className={`chip-btn ${mode === 'teacher' ? 'active' : ''}`}
                onClick={() => setMode('teacher')}
                style={{ padding: '0.5rem 1rem' }}
              >
                👨‍🏫 教师教研模式 (全显解析)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Unified Export & Check Toolbar Card */}
      <div className="filter-card no-print" style={{ padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="action-btn" onClick={handleSelectAllCurrent}>
              <CheckSquare className="w-4 h-4 text-sky-600" /> 全选本页 ({categorizedQuestions.length}题)
            </button>
            {selectedQKeys.size > 0 && (
              <button className="action-btn" onClick={handleClearSelection} style={{ color: '#ef4444' }}>
                <Square className="w-4 h-4" /> 清空勾选
              </button>
            )}
            <span style={{ fontSize: '0.9rem', color: '#64748b', borderLeft: '1px solid #e2e8f0', paddingLeft: '0.75rem' }}>
              已勾选 <strong style={{ color: '#0284c7' }}>{selectedQKeys.size}</strong> 道试题
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="action-btn action-btn-primary" onClick={handleExportWord} style={{ background: '#10b981', borderColor: '#10b981' }}>
              <FileSpreadsheet className="w-4 h-4" /> 📥 导出 Word (.doc)
            </button>
            <button className="action-btn action-btn-primary" onClick={handleExportPDF} style={{ background: '#ef4444', borderColor: '#ef4444' }}>
              <FileText className="w-4 h-4" /> 📄 导出 PDF (.pdf)
            </button>
          </div>
        </div>
      </div>

      {/* 5. Minimal Light-Theme Question Cards Stream */}
      <div className="questions-stream">
        {categorizedQuestions.length === 0 ? (
          <div className="filter-card" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <Filter className="w-12 h-12 text-slate-400 mb-2" style={{ margin: '0 auto 0.5rem' }} />
            <p>未筛选到符合条件的专项试题，请调整筛选条件试试。</p>
          </div>
        ) : (
          categorizedQuestions.map((item, idx) => {
            const { qKey, examCategory, year, district, question: q } = item;
            const isChecked = selectedQKeys.has(qKey);
            const userChoice = userSelectedOpts[qKey];
            const isAnswerShow = mode === 'teacher' || expandedAnswers[qKey];

            return (
              <div
                key={qKey}
                className="question-item"
                style={{
                  background: isChecked ? '#f0f9ff' : '#ffffff',
                  borderColor: isChecked ? '#0284c7' : '#e2e8f0',
                  boxShadow: isChecked ? '0 0 0 2px rgba(2, 132, 199, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {/* Card Top Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleToggleSelectQ(qKey)}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-sky-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>第 {idx + 1} 题</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span className="badge badge-mock">{year}</span>
                    <span className="badge badge-real">{examCategory}</span>
                    <span className="badge badge-mock">{district}</span>
                    <span className="badge badge-real" style={{ background: '#ecfdf5', color: '#047857' }}>{q.score || 2}分</span>
                  </div>
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
                    {q.options.map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isUserSelected = userChoice === letter;
                      const isCorrect = q.answer.trim().toUpperCase().includes(letter);

                      return (
                        <div
                          key={optIdx}
                          onClick={() => {
                            if (mode === 'student') {
                              handleStudentSelectOption(qKey, letter);
                            }
                          }}
                          className={`option-item ${isUserSelected ? (isCorrect ? 'correct' : 'wrong') : ''}`}
                        >
                          <span dangerouslySetInnerHTML={{ __html: opt }} />
                          {mode === 'student' && isUserSelected && (
                            <span>
                              {isCorrect ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 inline ml-2" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-600 inline ml-2" />
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Toggle Answer Button in Student Mode */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  {mode === 'student' && (
                    <button
                      className="action-btn"
                      onClick={() => toggleExpandAnswer(qKey)}
                      style={{ color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                    >
                      {isAnswerShow ? (
                        <>
                          <EyeOff className="w-4 h-4" /> 隐藏参考答案与解析
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" /> 展开参考答案与解析
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Answer Box */}
                {isAnswerShow && (
                  <div className="answer-box" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                    <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.9rem', marginBottom: '0.4rem' }}>🎯 【参考答案】</div>
                    <div style={{ color: '#14532d', fontSize: '0.95rem', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: q.answer }} />
                    <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.9rem', marginTop: '0.85rem', marginBottom: '0.4rem' }}>💡 【详细解析与考点说明】</div>
                    <div style={{ color: '#14532d', fontSize: '0.95rem', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: q.analysis }} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
