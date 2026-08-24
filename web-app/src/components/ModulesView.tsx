import React, { useState, useMemo } from 'react';
import type { Exam, Question } from '../types';
import { cleanStem } from '../utils';
import { CheckSquare, Square, Eye, EyeOff, Search, Sparkles, Filter, CheckCircle2, XCircle, ShoppingCart, ArrowRight, LayoutGrid, List, Hash, X } from 'lucide-react';

interface ModulesViewProps {
  examsData: Exam[];
  selectedQKeys?: Set<string>;
  onToggleSelectQ?: (qKey: string) => void;
  onSelectBatch?: (qKeysToAdd: string[]) => void;
  onClearAll?: () => void;
  onNavigateToCart?: () => void;
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

export const ModulesView: React.FC<ModulesViewProps> = ({ examsData, selectedQKeys: externalQKeys, onToggleSelectQ: externalToggleQ, onSelectBatch, onClearAll, onNavigateToCart }) => {
  const [selectedModule, setSelectedModule] = useState<string>('base');
  const [sourceFilter, setSourceFilter] = useState<'all' | '正式真题' | '区县模拟'>('正式真题');
  const [selectedYears, setSelectedYears] = useState<Set<string>>(new Set(['全部']));
  const [selectedDistricts, setSelectedDistricts] = useState<Set<string>>(new Set(['全部']));

  // View layout mode: 'grid' (缩略图卡片网格) | 'list' (详细列表流)
  const [viewDisplayMode, setViewDisplayMode] = useState<'grid' | 'list'>('grid');

  // Toggle for Question Number Nav Matrix Drawer
  const [showNavMatrix, setShowNavMatrix] = useState<boolean>(false);

  // Active highlighted question key for smooth scrolling pulse animation
  const [highlightedQKey, setHighlightedQKey] = useState<string | null>(null);

  // Full Question Preview Modal State
  const [previewItem, setPreviewItem] = useState<{
    qKey: string;
    examCategory: string;
    year: string;
    district: string;
    question: Question;
    idx: number;
    origIndex: number;
  } | null>(null);

  const handleSelectSourceFilter = (source: '正式真题' | '区县模拟' | 'all') => {
    setSourceFilter(source);
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
      if (yr === '全部') {
        return new Set(['全部']);
      }
      next.delete('全部');
      if (next.has(yr)) {
        next.delete(yr);
      } else {
        next.add(yr);
      }
      if (next.size === 0) {
        next.add('全部');
      }
      return next;
    });
  };

  const handleToggleDistrictFilter = (dis: string) => {
    setSelectedDistricts(prev => {
      const next = new Set(prev);
      if (dis === '全部') {
        return new Set(['全部']);
      }
      next.delete('全部');
      if (next.has(dis)) {
        next.delete(dis);
      } else {
        next.add(dis);
      }
      if (next.size === 0) {
        next.add('全部');
      }
      return next;
    });
  };
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // View mode: 'student' (极简自测) | 'teacher' (教研全显)
  const [mode, setMode] = useState<'student' | 'teacher'>('student');
  
  // Checkboxes
  const [internalQKeys, setInternalQKeys] = useState<Set<string>>(new Set());
  const selectedQKeys = externalQKeys || internalQKeys;

  const handleToggleSelectQ = (qKey: string) => {
    if (externalToggleQ) {
      externalToggleQ(qKey);
    } else {
      const next = new Set(internalQKeys);
      if (next.has(qKey)) next.delete(qKey);
      else next.add(qKey);
      setInternalQKeys(next);
    }
  };

  // Helper to extract clean text snippet from HTML stem string
  const getSnippet = (htmlStr: string, maxLen: number = 80): string => {
    if (!htmlStr) return '';
    const cleanText = htmlStr
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
    if (cleanText.length <= maxLen) return cleanText;
    return cleanText.slice(0, maxLen) + '...';
  };

  // Helper to smooth scroll to specific question card and trigger highlight pulse
  const scrollToQuestion = (qKey: string) => {
    const targetEl = document.getElementById(`qcard-${qKey}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedQKey(qKey);
      setTimeout(() => {
        setHighlightedQKey(null);
      }, 1600);
    }
  };

  // Interactive student option selections
  const [userSelectedOpts, setUserSelectedOpts] = useState<Record<string, string>>({});

  // Expanded answer states
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});

  const years = ['全部', '2025年', '2024年', '2023年', '2022年', '2021年', '2020年', '2019年', '2018年'];
  const districts = ['全部', '青岛市级', '市南区', '市北区', '李沧区', '崂山区', '黄岛区', '城阳区', '即墨区', '平度市', '莱西市'];

  // Categorized questions computation
  const categorizedQuestions = useMemo(() => {
    const list: { qKey: string; examCategory: string; year: string; district: string; question: Question; origIndex: number }[] = [];

    examsData.forEach((exam) => {
      const isSpecificDistrictSelected = !selectedDistricts.has('全部') && !selectedDistricts.has('青岛市级');
      const matchSource = sourceFilter === 'all' || exam.category === sourceFilter || isSpecificDistrictSelected;
      if (!matchSource) return;
      if (!selectedYears.has('全部') && !selectedYears.has(exam.year)) return;
      if (!selectedDistricts.has('全部') && !selectedDistricts.has(exam.district)) return;

      exam.questions.forEach((q, qIdx) => {
        const qKey = `${exam.id}_q${qIdx + 1}`;
        const secT = q.section_title || '';
        const grpT = q.group_title || '';
        const stem = q.stem || '';

        // Determine bucket module (Writing priority #1)
        let modKey = 'base';
        if (secT.includes('写作') || grpT.includes('写作') || qIdx === exam.questions.length - 1) {
          modKey = 'writing';
        } else if (secT.includes('基础') || secT.includes('积累') || grpT.includes('基础') || grpT.includes('积累')) {
          modKey = 'base';
        } else if (grpT.includes('诗') || secT.includes('诗') || stem.includes('《诗经》') || stem.includes('古诗')) {
          modKey = 'poetry';
        } else if (grpT.includes('名著') || secT.includes('名著') || stem.includes('名著') || stem.includes('《钢铁是怎样炼成的》') || stem.includes('《骆驼祥子》') || stem.includes('《名人传》') || stem.includes('《昆虫记》')) {
          modKey = 'classics';
        } else if (grpT.includes('文言文') || secT.includes('文言文') || stem.includes('加点词的解释') || stem.includes('翻译成现代汉语') || stem.includes('句式相同')) {
          modKey = 'wenyan';
        } else if (grpT.includes('现代文阅读Ⅰ') || grpT.includes('说明文') || grpT.includes('议论文') || grpT.includes('非遗')) {
          modKey = 'modern1';
        } else if (grpT.includes('现代文阅读Ⅱ') || grpT.includes('散文') || grpT.includes('记叙文') || grpT.includes('小说')) {
          modKey = 'modern2';
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
          question: q,
          origIndex: qIdx + 1
        });
      });
    });

    return list;
  }, [examsData, selectedModule, sourceFilter, selectedYears, selectedDistricts, searchQuery]);

  // Dynamic check if all current visible questions are selected
  const isAllCurrentSelected = useMemo(() => {
    if (!categorizedQuestions || categorizedQuestions.length === 0) return false;
    return categorizedQuestions.every(item => selectedQKeys.has(item.qKey));
  }, [categorizedQuestions, selectedQKeys]);

  const handleSelectAllCurrent = () => {
    const keysToSelect = categorizedQuestions.map(item => item.qKey);
    if (isAllCurrentSelected) {
      // Toggle OFF: deselect all questions on current page
      if (externalToggleQ) {
        keysToSelect.forEach(qKey => {
          if (selectedQKeys.has(qKey)) {
            externalToggleQ(qKey);
          }
        });
      }
    } else {
      // Toggle ON: select all questions on current page
      if (onSelectBatch) {
        onSelectBatch(keysToSelect);
      }
    }
  };

  const handleClearSelection = () => {
    if (onClearAll) {
      onClearAll();
    }
  };

  // Student mode interactive option selection
  const handleStudentSelectOption = (qKey: string, optLetter: string) => {
    setUserSelectedOpts(prev => ({ ...prev, [qKey]: optLetter }));
  };

  const toggleExpandAnswer = (qKey: string) => {
    setExpandedAnswers(prev => ({ ...prev, [qKey]: !prev[qKey] }));
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
            支持【🔳 缩略卡片网格】与【📄 详细列表】双视图自由切换，内置【🔢 题号直达导航盘】，一键批量加组卷！
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
                handleClearSelection();
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
              onClick={() => handleSelectSourceFilter('正式真题')}
            >
              🏆 青岛正式真题库 (2018–2025年)
            </button>
            <button
              className={`chip-btn ${sourceFilter === '区县模拟' ? 'active' : ''}`}
              onClick={() => handleSelectSourceFilter('区县模拟')}
            >
              🏫 青岛区县模拟题库 (35套一模二模)
            </button>
            <button
              className={`chip-btn ${sourceFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleSelectSourceFilter('all')}
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
                className={`chip-btn ${selectedYears.has(yr) ? 'active' : ''}`}
                onClick={() => handleToggleYearFilter(yr)}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>

        {/* District Filter (With Smart Source Linkage & Disable State) */}
        <div className="filter-row" style={{ opacity: sourceFilter === '正式真题' ? 0.55 : 1, transition: 'opacity 0.2s ease' }}>
          <div className="filter-label">区县筛选:</div>
          <div className="filter-chips">
            {districts.map(dist => {
              const isRealOnly = sourceFilter === '正式真题';
              const isMockOnly = sourceFilter === '区县模拟';

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

      {/* 4. Unified Export & Check Toolbar Card + View Mode & Nav Switcher */}
      <div className="filter-card no-print" style={{ padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="action-btn"
              onClick={handleSelectAllCurrent}
              style={{
                background: isAllCurrentSelected ? '#e0f2fe' : '#f8fafc',
                borderColor: isAllCurrentSelected ? '#0284c7' : '#cbd5e1',
                color: isAllCurrentSelected ? '#0284c7' : '#475569',
                fontWeight: 600
              }}
            >
              {isAllCurrentSelected ? (
                <CheckSquare className="w-4 h-4 text-sky-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>全选本页 ({categorizedQuestions.length}题)</span>
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

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* View Switcher: Grid vs List */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.2rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <button
                className={`action-btn ${viewDisplayMode === 'grid' ? 'action-btn-primary' : ''}`}
                onClick={() => setViewDisplayMode('grid')}
                style={{
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: viewDisplayMode === 'grid' ? '#0284c7' : 'transparent',
                  color: viewDisplayMode === 'grid' ? '#fff' : '#475569'
                }}
                title="网格平铺渲染，一屏展示多题，高效率扫读"
              >
                <LayoutGrid className="w-4 h-4" /> 🔳 缩略卡片
              </button>
              <button
                className={`action-btn ${viewDisplayMode === 'list' ? 'action-btn-primary' : ''}`}
                onClick={() => setViewDisplayMode('list')}
                style={{
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: viewDisplayMode === 'list' ? '#0284c7' : 'transparent',
                  color: viewDisplayMode === 'list' ? '#fff' : '#475569'
                }}
                title="传统流式展示，渲染完整题干与选项"
              >
                <List className="w-4 h-4" /> 📄 详细列表
              </button>
            </div>

            {/* Question Nav Matrix Drawer Button */}
            <button
              className="action-btn"
              onClick={() => setShowNavMatrix(!showNavMatrix)}
              style={{
                background: showNavMatrix ? '#e0f2fe' : '#ffffff',
                borderColor: showNavMatrix ? '#0284c7' : '#cbd5e1',
                color: showNavMatrix ? '#0284c7' : '#334155',
                fontWeight: 600
              }}
            >
              <Hash className="w-4 h-4" /> 🔢 题号导航盘 {showNavMatrix ? '▲' : '▼'}
            </button>

            {/* Cart Navigate Button */}
            <button
              className="action-btn action-btn-primary"
              onClick={onNavigateToCart}
              style={{ background: '#0284c7', borderColor: '#0284c7', padding: '0.55rem 1.25rem', fontSize: '0.9rem', fontWeight: 700 }}
            >
              <ShoppingCart className="w-4 h-4" /> 🛒 前往下载总览 (已选 {selectedQKeys.size} 题) <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* 4.5. Question Number Quick Navigation Matrix Panel */}
      {showNavMatrix && (
        <div className="q-nav-matrix-panel no-print">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Hash className="w-4 h-4 text-sky-600" />
              <span>题号快速直达盘（共 {categorizedQuestions.length} 道，已勾选 {selectedQKeys.size} 道）</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>💡 点击题号即可平滑滚动直达目标试题</span>
          </div>

          <div className="q-nav-matrix-grid">
            {categorizedQuestions.map((item, idx) => {
              const isSelected = selectedQKeys.has(item.qKey);
              return (
                <button
                  key={item.qKey}
                  onClick={() => scrollToQuestion(item.qKey)}
                  className={`q-nav-btn ${isSelected ? 'selected' : ''}`}
                  title={`筛选第${idx + 1}题 (原卷第${item.origIndex}题): ${getSnippet(item.question.stem, 35)}`}
                >
                  {idx + 1}
                  {isSelected && <span style={{ fontSize: '0.65rem', marginLeft: '1px' }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Main Questions Stream / Grid Render */}
      {categorizedQuestions.length === 0 ? (
        <div className="filter-card" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <Filter className="w-12 h-12 text-slate-400 mb-2" style={{ margin: '0 auto 0.5rem' }} />
          <p>未筛选到符合条件的专项试题，请调整筛选条件试试。</p>
        </div>
      ) : viewDisplayMode === 'grid' ? (
        /* 🔳 COMPACT CARD GRID VIEW */
        <div className="questions-grid-container">
          {categorizedQuestions.map((item, idx) => {
            const { qKey, examCategory, year, district, question: q } = item;
            const isChecked = selectedQKeys.has(qKey);
            const isHighlighted = highlightedQKey === qKey;

            return (
              <div
                key={qKey}
                id={`qcard-${qKey}`}
                className={`question-grid-card ${isChecked ? 'is-checked' : ''} ${isHighlighted ? 'highlight-pulse' : ''}`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="grid-card-header">
                    <div className="grid-card-title" onClick={() => handleToggleSelectQ(qKey)}>
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-sky-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                      <span>第 {idx + 1} 题</span>
                    </div>

                    <div className="grid-card-badges">
                      <span className="badge badge-orig-index" style={{ fontSize: '0.7rem' }}>原卷第 {item.origIndex} 题</span>
                      <span className="badge badge-mock" style={{ fontSize: '0.7rem' }}>{year}</span>
                      <span className="badge badge-real" style={{ fontSize: '0.7rem' }}>{examCategory}</span>
                      <span className="badge badge-mock" style={{ fontSize: '0.7rem' }}>{district}</span>
                    </div>
                  </div>

                  {/* Passage Badge (If text exists) */}
                  {q.passage && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span className="shejie-badge" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>
                        📖 含阅读语段
                      </span>
                    </div>
                  )}

                  {/* Stem Snippet Preview */}
                  <div className="grid-card-snippet" title={cleanStem(q.stem)}>
                    {getSnippet(q.stem, 90)}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="grid-card-footer">
                  <button
                    className={`action-btn ${isChecked ? 'action-btn-primary' : ''}`}
                    onClick={() => handleToggleSelectQ(qKey)}
                    style={{ flex: 1, fontSize: '0.82rem', padding: '0.4rem' }}
                  >
                    {isChecked ? (
                      <>
                        <CheckSquare className="w-4 h-4" /> 已选入组卷
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4" /> 加入组卷
                      </>
                    )}
                  </button>

                  <button
                    className="action-btn"
                    onClick={() => setPreviewItem({ qKey, examCategory, year, district, question: q, idx, origIndex: item.origIndex })}
                    style={{ fontSize: '0.82rem', color: '#0284c7', borderColor: '#bae6fd', padding: '0.4rem 0.65rem' }}
                    title="点击查看原题全貌、完整阅读材料与参考答案"
                  >
                    <Eye className="w-4 h-4" /> 查看全题
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 📄 FULL DETAILED LIST VIEW */
        <div className="questions-stream">
          {categorizedQuestions.map((item, idx) => {
            const { qKey, examCategory, year, district, question: q } = item;
            const isChecked = selectedQKeys.has(qKey);
            const userChoice = userSelectedOpts[qKey];
            const isAnswerShow = mode === 'teacher' || expandedAnswers[qKey];
            const isHighlighted = highlightedQKey === qKey;

            return (
              <div
                key={qKey}
                id={`qcard-${qKey}`}
                className={`question-item ${isHighlighted ? 'highlight-pulse' : ''}`}
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

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="badge badge-orig-index" style={{ fontSize: '0.8rem', padding: '0.2rem 0.55rem' }}>📄 原卷第 {item.origIndex} 题</span>
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
                    dangerouslySetInnerHTML={{ __html: cleanStem(q.stem) }}
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
          })}
        </div>
      )}

      {/* 6. FULL QUESTION PREVIEW MODAL */}
      {previewItem && (
        <div className="q-preview-modal-overlay" onClick={() => setPreviewItem(null)}>
          <div className="q-preview-modal-content" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="q-preview-modal-header">
              <div style={{ fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span>第 {previewItem.idx + 1} 题全貌预览</span>
                <span className="badge badge-orig-index" style={{ background: '#059669', color: '#ffffff', border: 'none' }}>原卷第 {previewItem.origIndex} 题</span>
                <span className="badge badge-mock" style={{ background: '#38bdf8', color: '#0f172a' }}>{previewItem.year}</span>
                <span className="badge badge-real">{previewItem.examCategory}</span>
                <span className="badge badge-mock">{previewItem.district}</span>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="q-preview-modal-body">
              {/* Passage */}
              {previewItem.question.passage && (
                <div className="passage-box" style={{ background: '#f8fafc', borderLeft: '4px solid #0284c7', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 700, color: '#0284c7', fontSize: '0.9rem', marginBottom: '0.5rem' }}>📖 【阅读语段 / 背景材料】</div>
                  <div style={{ color: '#334155', fontSize: '0.95rem', lineHeight: '2.2', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: previewItem.question.passage }} />
                </div>
              )}

              {/* Stem */}
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '1rem 0', lineHeight: 1.6 }}>
                <div dangerouslySetInnerHTML={{ __html: cleanStem(previewItem.question.stem) }} />
              </div>

              {/* Options */}
              {previewItem.question.options && previewItem.question.options.length > 0 && (
                <div className="options-list" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
                  {previewItem.question.options.map((opt, optIdx) => (
                    <div key={optIdx} className="option-item" dangerouslySetInnerHTML={{ __html: opt }} />
                  ))}
                </div>
              )}

              {/* Answer & Analysis Box */}
              <div className="answer-box" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.9rem', marginBottom: '0.4rem' }}>🎯 【参考答案】</div>
                <div style={{ color: '#14532d', fontSize: '0.95rem', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: previewItem.question.answer }} />
                <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.9rem', marginTop: '0.85rem', marginBottom: '0.4rem' }}>💡 【详细解析】</div>
                <div style={{ color: '#14532d', fontSize: '0.95rem', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: previewItem.question.analysis }} />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="q-preview-modal-footer">
              <button
                className={`action-btn ${selectedQKeys.has(previewItem.qKey) ? 'action-btn-primary' : ''}`}
                onClick={() => handleToggleSelectQ(previewItem.qKey)}
                style={{ padding: '0.6rem 1.25rem', fontWeight: 700, background: selectedQKeys.has(previewItem.qKey) ? '#0284c7' : '#ffffff', color: selectedQKeys.has(previewItem.qKey) ? '#ffffff' : '#334155' }}
              >
                {selectedQKeys.has(previewItem.qKey) ? (
                  <>
                    <CheckSquare className="w-4 h-4" /> 🟢 已加入切片组卷库 (点击可取消勾选)
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4" /> ➕ 加入切片组卷库
                  </>
                )}
              </button>

              <button className="action-btn" onClick={() => setPreviewItem(null)} style={{ padding: '0.6rem 1.25rem' }}>
                关闭预览
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
