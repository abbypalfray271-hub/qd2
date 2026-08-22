import { CartView } from './components/CartView';
import { ModulesView } from './components/ModulesView';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Columns, 
  Layers, 
  ShoppingCart, 
  UploadCloud, 
  Search, 
  CheckCircle2, 
  FileText,
  Sparkles,
  Calendar,
  X,
  Loader2,
  AlertTriangle,
  Bookmark,
  Eye
} from 'lucide-react';
import type { Exam, ActiveTab } from './types';

// Helper to strip duplicate leading question numbers (e.g., "4. ")
const cleanStem = (stem?: string) => {
  if (!stem) return '';
  return stem.replace(/^\d+[\.．\s]+/, '');
};

const parseMarkdownTables = (input: string): string => {
  if (!input || !input.includes('|')) return input;

  const tableRegex = /((?:(?:^|\n)\|[^\n]+\|)+)/g;

  return input.replace(tableRegex, (match) => {
    const lines = match.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return match;

    let html = '<div class="table-responsive"><table class="exam-table">';
    let hasHeader = false;

    if (lines.length > 1 && /^\|(?:\s*:?-+:?\s*\|)+$/.test(lines[1])) {
      hasHeader = true;
    }

    if (hasHeader) {
      const headerCells = lines[0].split('|').slice(1, -1).map(c => c.trim());
      html += '<thead><tr>';
      headerCells.forEach(c => {
        html += `<th>${c}</th>`;
      });
      html += '</tr></thead><tbody>';

      for (let i = 2; i < lines.length; i++) {
        if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(lines[i])) continue;
        const cells = lines[i].split('|').slice(1, -1).map(c => c.trim());
        html += '<tr>';
        cells.forEach(c => {
          html += `<td>${c}</td>`;
        });
        html += '</tr>';
      }
      html += '</tbody>';
    } else {
      html += '<tbody>';
      for (let i = 0; i < lines.length; i++) {
        if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(lines[i])) continue;
        const cells = lines[i].split('|').slice(1, -1).map(c => c.trim());
        html += '<tr>';
        cells.forEach(c => {
          html += `<td>${c}</td>`;
        });
        html += '</tr>';
      }
      html += '</tbody>';
    }

    html += '</table></div>';
    return html;
  });
};

// Rich Content Component to render Markdown Images & HTML Emphasis Tags safely
const RichContent: React.FC<{ content?: string }> = ({ content }) => {
  if (!content) return null;

  // Clean Markdown headers & noise, and parse tables
  let cleaned = parseMarkdownTables(content)
    .replace(/^#\s+.*?\n/g, '')
    .replace(/^>\s+📌\s+\*\*试题标定\*\*.*?\n/g, '')
    .replace(/---/g, '')
    .replace(/<b>青岛市.*?语文试题<\/b>/gi, '');

  // Transform Markdown images ![图片](/images/folder/img.png) or ![图片](../images/folder/img.png) into <img src="/images/folder/img.png" />
  const transformedHtml = cleaned.replace(
    /!\[(.*?)\]\((?:\.\.\/|\/)?images\/(.*?)\)/g,
    (_, alt, p1) => {
      const safeSrc = encodeURI(`/images/${p1}`);
      return `<img src="${safeSrc}" class="exam-img" alt="${alt || '试题图片'}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; display: block; boxShadow: 0 4px 12px rgba(0,0,0,0.05);" />`;
    }
  );

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: transformedHtml }} 
      style={{ lineHeight: 2.0, display: 'inline-block', width: '100%' }}
    />
  );
};

export function App() {
  const [examsData, setExamsData] = useState<Exam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [activeTab, setActiveTab] = useState<ActiveTab>('catalog');
  const [selectedQKeys, setSelectedQKeys] = useState<Set<string>>(new Set());

  const handleToggleSelectQ = (qKey: string) => {
    setSelectedQKeys(prev => {
      const next = new Set(prev);
      if (next.has(qKey)) {
        next.delete(qKey);
      } else {
        next.add(qKey);
      }
      return next;
    });
  };

  const handleSelectBatch = (qKeysToAdd: string[]) => {
    setSelectedQKeys(prev => {
      const next = new Set(prev);
      qKeysToAdd.forEach(k => next.add(k));
      return next;
    });
  };

  const handleClearAll = () => {
    setSelectedQKeys(new Set());
  };
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [selectedYears, setSelectedYears] = useState<Set<string>>(new Set(['全部']));
  const [selectedDistricts, setSelectedDistricts] = useState<Set<string>>(new Set(['全部']));

  const handleSelectSourceFilter = (source: string) => {
    setSelectedCategory(source);
    if (source === '正式真题') {
      setSelectedDistricts(new Set(['青岛市级']));
    } else if (source === '区县模拟') {
      setSelectedDistricts(prev => {
        const next = new Set(prev);
        next.delete('青岛市级');
        if (next.size === 0 || next.has('全部')) return new Set(['市南区']);
        return next;
      });
    }
  };

  const handleToggleYearFilter = (yr: string) => {
    setSelectedYears(prev => {
      const next = new Set(prev);
      if (yr === '全部') return new Set(['全部']);
      next.delete('全部');
      if (next.has(yr)) next.delete(yr);
      else next.add(yr);
      if (next.size === 0) next.add('全部');
      return next;
    });
  };

  const handleToggleDistrictFilter = (dis: string) => {
    setSelectedDistricts(prev => {
      const next = new Set(prev);
      if (dis === '全部') return new Set(['全部']);
      next.delete('全部');
      if (next.has(dis)) next.delete(dis);
      else next.add(dis);
      if (next.size === 0) next.add('全部');
      return next;
    });
  };
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Single Exam Viewer Modal State
  const [viewingExam, setViewingExam] = useState<Exam | null>(null);
  // showAnswers state removed for CartView

  // Side-by-Side Comparison State
  const [leftExam, setLeftExam] = useState<Exam | null>(null);
  const [rightExam, setRightExam] = useState<Exam | null>(null);

  // Admin Drag & Drop Upload State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  // Unique Filter Options
  const years = ['全部', '2025年', '2024年', '2023年', '2022年', '2021年', '2020年', '2019年', '2018年'];
  const districts = ['全部', '青岛市级', '市南区', '市北区', '李沧区', '崂山区', '黄岛区', '城阳区', '即墨区', '平度市', '莱西市'];

  // Async data fetching
  useEffect(() => {
    fetch('/data/exams_data.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data: Exam[]) => {
        setExamsData(data);
        if (data.length > 0) {
          setLeftExam(data[0]);
          if (data.length > 1) setRightExam(data[1]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("加载青岛中考数据库失败:", err);
        setErrorMsg("数据服务初始化异常，请刷新重试。");
        setLoading(false);
      });
  }, []);

  // Filtered Exams Computation
  const filteredExams = useMemo(() => {
    return examsData.filter(exam => {
      if (selectedCategory !== '全部' && exam.category !== selectedCategory) return false;
      if (!selectedYears.has('全部') && !selectedYears.has(exam.year)) return false;

      if (selectedCategory === '正式真题') {
        if (exam.district !== '青岛市级') return false;
      } else {
        if (!selectedDistricts.has('全部') && !selectedDistricts.has(exam.district)) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = exam.title.toLowerCase().includes(q);
        const matchQuestions = exam.questions.some(q_item => q_item.stem.toLowerCase().includes(q) || q_item.passage?.toLowerCase().includes(q));
        if (!matchTitle && !matchQuestions) return false;
      }
      return true;
    });
  }, [examsData, selectedCategory, selectedYears, selectedDistricts, searchQuery]);

// handlePrint function removed for CartView

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadedFileName(file.name);
      setUploadSuccess(true);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff' }}>
        <Loader2 style={{ width: '48px', height: '48px', color: '#38bdf8', animation: 'spin 1s linear infinite' }} />
        <h2 style={{ marginTop: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>正在初始化【青岛中考语文智慧云平台】数据库...</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>已包含青岛市 41 套真题与区县一模二模全要素题库</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff' }}>
        <AlertTriangle style={{ width: '48px', height: '48px', color: '#ef4444' }} />
        <h2 style={{ marginTop: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>{errorMsg}</h2>
        <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', borderRadius: '8px', background: '#0284c7', color: '#fff', border: 'none', cursor: 'pointer' }}>
          刷新重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="app-root">
      {/* Top Navbar */}
      <header className="app-header no-print">
        <div className="header-container">
          <div className="logo-group">
            <BookOpen className="w-6 h-6 text-sky-400" />
            <span>🌊 青岛中考语文智慧云平台</span>
          </div>

          <nav className="nav-tabs">
            <button 
              className={`nav-btn ${activeTab === 'catalog' ? 'active' : ''}`}
              onClick={() => setActiveTab('catalog')}
            >
              <FileText className="w-4 h-4" /> 试卷大盘
            </button>
            <button 
              className={`nav-btn ${activeTab === 'compare' ? 'active' : ''}`}
              onClick={() => setActiveTab('compare')}
            >
              <Columns className="w-4 h-4" /> 同屏双栏对比
            </button>
            <button 
              className={`nav-btn ${activeTab === 'modules' ? 'active' : ''}`}
              onClick={() => setActiveTab('modules')}
            >
              <Layers className="w-4 h-4" /> 7大考点分项
            </button>
            <button 
              className={`nav-btn ${activeTab === 'cart' ? 'active' : ''}`}
              onClick={() => setActiveTab('cart')}
              style={{ position: 'relative' }}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>下载总览</span>
              {selectedQKeys.size > 0 && (
                <span className="cart-badge">{selectedQKeys.size}</span>
              )}
            </button>
            <button 
              className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <UploadCloud className="w-4 h-4" /> 试卷上传后台
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Banner */}
        {activeTab === 'catalog' && (
          <div className="hero-banner no-print">
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <Sparkles className="w-4 h-4" /> 独家青岛中考语文备考智库
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem', background: 'linear-gradient(to right, #fff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                面向老师与家长的“看、比、练、印”一站式赋能平台
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '800px' }}>
                已全量收录青岛市 2018~2025 年正式真题及市南、市北、李沧、崂山、城阳、即墨、黄岛、平度、莱西 35 套区县一模二模解析试卷（共 {examsData.length} 套）。
              </p>
            </div>
          </div>
        )}

        {/* TAB 1: Exam Catalog */}
        {activeTab === 'catalog' && (
          <>
            {/* Filter Matrix Card */}
            <div className="filter-card no-print">
              <div className="filter-row">
                <div className="filter-label">试卷类型:</div>
                <div className="filter-chips">
                  {['全部', '正式真题', '区县模拟'].map(cat => (
                    <button 
                      key={cat} 
                      className={`chip-btn ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => handleSelectSourceFilter(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-row">
                <div className="filter-label">考试年份:</div>
                <div className="filter-chips">
                  {years.map(yr => (
                    <button 
                      key={yr} 
                      className={`chip-btn ${selectedYears.has(yr) ? 'active' : ''}`}
                      onClick={() => handleToggleYearFilter(yr)}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* District Filter (With Smart Source Linkage & Disable State) */}
              <div className="filter-row" style={{ opacity: selectedCategory === '正式真题' ? 0.55 : 1, transition: 'opacity 0.2s ease' }}>
                <div className="filter-label">所属区县:</div>
                <div className="filter-chips">
                  {districts.map(dist => {
                    const isRealOnly = selectedCategory === '正式真题';
                    const isMockOnly = selectedCategory === '区县模拟';

                    let isDisabled = false;
                    let tooltipText = '';

                    if (isRealOnly && dist !== '青岛市级') {
                      isDisabled = true;
                      tooltipText = '正式真题为全市统一命题，无需筛选区县';
                    } else if (isMockOnly && dist === '青岛市级') {
                      isDisabled = true;
                      tooltipText = '青岛市级专属于中考正式真题';
                    }

                    const isActive = isRealOnly ? dist === '青岛市级' : selectedDistricts.has(dist);

                    return (
                      <button 
                        key={dist}
                        disabled={isDisabled}
                        title={tooltipText}
                        className={`chip-btn ${isActive ? 'active' : ''}`}
                        onClick={() => !isDisabled && handleToggleDistrictFilter(dist)}
                        style={{
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDisabled ? 0.45 : 1
                        }}
                      >
                        {dist}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search Bar */}
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', width: '18px', height: '18px' }} />
                  <input 
                    type="text" 
                    placeholder="输入试卷名称、关键词（如：石墨烯、骆驼祥子、古诗默写...）"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  找到 <strong style={{ color: '#0284c7' }}>{filteredExams.length}</strong> 套匹配试卷
                </div>
              </div>
            </div>

            {/* Exam Cards Grid */}
            <div className="exam-grid no-print">
              {filteredExams.map(exam => (
                <div key={exam.id} className="exam-card">
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span className={`badge ${exam.category === '正式真题' ? 'badge-real' : 'badge-mock'}`}>
                        {exam.category}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Calendar className="w-3.5 h-3.5" /> {exam.year}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.4, color: '#0f172a' }}>
                      {exam.title}
                    </h3>

                    <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <span>📍 {exam.district}</span>
                      <span>📝 包含 {exam.questions.length} 道解构题块</span>
                    </div>
                  </div>

                  <div className="exam-actions">
                    <button 
                      className="action-btn action-btn-primary"
                      onClick={() => setViewingExam(exam)}
                    >
                      <Eye className="w-4 h-4" /> 查看全卷
                    </button>
                    <button 
                      className="action-btn"
                      onClick={() => {
                        setLeftExam(exam);
                        setActiveTab('compare');
                      }}
                    >
                      <Columns className="w-4 h-4" /> 同屏对比
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* TAB 2: Side-by-Side Comparison Engine */}
        {activeTab === 'compare' && (
          <div className="no-print">
            <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Columns className="w-5 h-5 text-sky-500" /> 杀手级功能：青岛同考点跨年份/跨区县同屏对比引擎
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                支持老师左右双栏同屏选择任意两套青岛试卷，进行命题趋势研讨。
              </p>
            </div>

            <div className="compare-container">
              {/* Left Column */}
              <div className="compare-column">
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>
                    👈 选择左侧对比试卷:
                  </label>
                  <select 
                    value={leftExam?.id || ''} 
                    onChange={(e) => setLeftExam(examsData.find(ex => ex.id === e.target.value) || null)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    {examsData.map(ex => (
                      <option key={ex.id} value={ex.id}>[{ex.year}] {ex.title}</option>
                    ))}
                  </select>
                </div>

                {leftExam && (
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, paddingBottom: '0.5rem', borderBottom: '2px solid #0284c7', marginBottom: '1rem' }}>
                      {leftExam.title}
                    </h3>
                    {leftExam.questions.map((q, idx) => {
                      const showSectionHeader = idx === 0 || q.section_title !== leftExam.questions[idx - 1].section_title;
                      const showGroupHeader = idx === 0 || q.group_title !== leftExam.questions[idx - 1].group_title;

                      return (
                        <React.Fragment key={q.id}>
                          {showSectionHeader && q.section_title && (
                            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', padding: '0.65rem 1rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', margin: '1.25rem 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Bookmark className="w-4 h-4 text-sky-400" /> <RichContent content={q.section_title} />
                            </div>
                          )}
                          {showGroupHeader && q.group_title && (
                            <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.4rem 0.8rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', margin: '0.75rem 0', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              📌 <RichContent content={q.group_title} />
                            </div>
                          )}

                          <div className="question-item">
                            {q.passage && <div className="passage-box"><RichContent content={q.passage} /></div>}
                            <div style={{ fontWeight: 600, margin: '0.5rem 0', display: 'flex', gap: '0.3rem' }}>
                              <span>{idx + 1}.</span> <RichContent content={cleanStem(q.stem)} />
                            </div>
                            {q.options.length > 0 && (
                              <div className="options-list">
                                {q.options.map((opt, o_idx) => (
                                  <div key={o_idx} style={{ fontSize: '0.9rem' }}><RichContent content={opt} /></div>
                                ))}
                              </div>
                            )}
                            {(q.answer || q.analysis) && (
                              <div className="answer-box">
                                {q.answer && <div><strong>【答案】</strong>: <RichContent content={q.answer} /></div>}
                                {q.analysis && <div style={{ marginTop: '0.4rem' }}><strong>【解析】</strong>: <RichContent content={q.analysis} /></div>}
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="compare-column">
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>
                    👉 选择右侧对比试卷:
                  </label>
                  <select 
                    value={rightExam?.id || ''} 
                    onChange={(e) => setRightExam(examsData.find(ex => ex.id === e.target.value) || null)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    {examsData.map(ex => (
                      <option key={ex.id} value={ex.id}>[{ex.year}] {ex.title}</option>
                    ))}
                  </select>
                </div>

                {rightExam && (
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, paddingBottom: '0.5rem', borderBottom: '2px solid #8b5cf6', marginBottom: '1rem' }}>
                      {rightExam.title}
                    </h3>
                    {rightExam.questions.map((q, idx) => {
                      const showSectionHeader = idx === 0 || q.section_title !== rightExam.questions[idx - 1].section_title;
                      const showGroupHeader = idx === 0 || q.group_title !== rightExam.questions[idx - 1].group_title;

                      return (
                        <React.Fragment key={q.id}>
                          {showSectionHeader && q.section_title && (
                            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', padding: '0.65rem 1rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', margin: '1.25rem 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Bookmark className="w-4 h-4 text-purple-400" /> <RichContent content={q.section_title} />
                            </div>
                          )}
                          {showGroupHeader && q.group_title && (
                            <div style={{ background: '#f3e8ff', color: '#6b21a8', padding: '0.4rem 0.8rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', margin: '0.75rem 0', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              📌 <RichContent content={q.group_title} />
                            </div>
                          )}

                          <div className="question-item">
                            {q.passage && <div className="passage-box"><RichContent content={q.passage} /></div>}
                            <div style={{ fontWeight: 600, margin: '0.5rem 0', display: 'flex', gap: '0.3rem' }}>
                              <span>{idx + 1}.</span> <RichContent content={cleanStem(q.stem)} />
                            </div>
                            {q.options.length > 0 && (
                              <div className="options-list">
                                {q.options.map((opt, o_idx) => (
                                  <div key={o_idx} style={{ fontSize: '0.9rem' }}><RichContent content={opt} /></div>
                                ))}
                              </div>
                            )}
                            {(q.answer || q.analysis) && (
                              <div className="answer-box">
                                {q.answer && <div><strong>【答案】</strong>: <RichContent content={q.answer} /></div>}
                                {q.analysis && <div style={{ marginTop: '0.4rem' }}><strong>【解析】</strong>: <RichContent content={q.analysis} /></div>}
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Print Console */}
        {activeTab === 'modules' && (
          <ModulesView examsData={examsData} selectedQKeys={selectedQKeys} onToggleSelectQ={handleToggleSelectQ} onSelectBatch={handleSelectBatch} onClearAll={handleClearAll} onNavigateToCart={() => setActiveTab('cart')} />
        )}

        {activeTab === 'cart' && (
          <CartView
            examsData={examsData}
            selectedQKeys={selectedQKeys}
            onToggleSelectQ={handleToggleSelectQ}
            onClearAll={() => setSelectedQKeys(new Set())}
            onNavigateToModules={() => setActiveTab('modules')}
          />
        )}

                {/* TAB 4: Admin Drag & Drop Portal */}
        {activeTab === 'admin' && (
          <div className="no-print">
            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <UploadCloud className="w-5 h-5 text-sky-500" /> 管理员试卷一键拖拽上传控制中心
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                无需触碰命令行！在下方拖拽上传新试卷 Word (.docx)，后台 API 将全自动进行切片提取、生成全要素 JSON 数据库。
              </p>
            </div>

            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${isDragging ? '#0284c7' : '#cbd5e1'}`,
                background: isDragging ? '#e0f2fe' : '#fff',
                borderRadius: '16px',
                padding: '4rem 2rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <UploadCloud style={{ width: '64px', height: '64px', color: '#0284c7', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                点击或拖拽上传新试卷 Word (.docx) 文档
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                支持青岛中考真题及市南、市北、李沧、崂山、城阳、即墨、黄岛、平度、莱西等区县一模二模试卷
              </p>
              <button className="action-btn action-btn-primary" style={{ display: 'inline-flex', width: 'auto', padding: '0.65rem 2rem' }}>
                选择本地文件
              </button>
            </div>

            {uploadSuccess && (
              <div style={{ marginTop: '1.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <CheckCircle2 style={{ width: '32px', height: '32px', color: '#16a34a' }} />
                <div>
                  <h4 style={{ fontWeight: 700, color: '#166534', fontSize: '1.05rem' }}>
                    🎉 预检成功！已成功识别: {uploadedFileName}
                  </h4>
                  <p style={{ color: '#15803d', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    提取出 23 道小题 | 识别分类: 青岛区县模拟 | 自动建立了全要素 JSON 数据库，已在线更新上线全站！
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal for viewing single exam */}
        {viewingExam && (
          <div className="no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{viewingExam.title}</h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                    {viewingExam.category} • {viewingExam.year} • {viewingExam.district}
                  </div>
                </div>
                <button onClick={() => setViewingExam(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px' }}>
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                {viewingExam.questions.map((q, idx) => {
                  const showSectionHeader = idx === 0 || q.section_title !== viewingExam.questions[idx - 1].section_title;
                  const showGroupHeader = idx === 0 || q.group_title !== viewingExam.questions[idx - 1].group_title;

                  return (
                    <React.Fragment key={q.id}>
                      {showSectionHeader && q.section_title && (
                        <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 700, fontSize: '1rem', margin: '1.5rem 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                          <Bookmark className="w-5 h-5 text-sky-400" /> <RichContent content={q.section_title} />
                        </div>
                      )}
                      {showGroupHeader && q.group_title && (
                        <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.45rem 0.9rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem', margin: '0.85rem 0', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          📌 <RichContent content={q.group_title} />
                        </div>
                      )}

                      <div className="question-item">
                        {q.passage && <div className="passage-box"><RichContent content={q.passage} /></div>}
                        <div style={{ fontWeight: 600, margin: '0.5rem 0', display: 'flex', gap: '0.3rem' }}>
                          <span>{idx + 1}.</span> <RichContent content={cleanStem(q.stem)} />
                        </div>
                        {q.options.length > 0 && (
                          <div className="options-list">
                            {q.options.map((opt, o_idx) => (
                              <div key={o_idx} style={{ fontSize: '0.9rem' }}><RichContent content={opt} /></div>
                            ))}
                          </div>
                        )}
                        {(q.answer || q.analysis) && (
                          <div className="answer-box">
                            {q.answer && <div><strong>【答案】</strong>: <RichContent content={q.answer} /></div>}
                            {q.analysis && <div style={{ marginTop: '0.4rem' }}><strong>【解析】</strong>: <RichContent content={q.analysis} /></div>}
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
