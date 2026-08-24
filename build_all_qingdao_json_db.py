import os
import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r'E:\中考库\中考语文'
QD_DIR = os.path.join(BASE_DIR, '01_青岛中考')

REAL_SINGLE_DIR = os.path.join(QD_DIR, '正式真题', '单卷解析')
REAL_JSON_DIR = os.path.join(QD_DIR, '正式真题', 'JSON数据库')

MOCK_SINGLE_DIR = os.path.join(QD_DIR, '区县模拟', '单卷解析')
MOCK_JSON_DIR = os.path.join(QD_DIR, '区县模拟', 'JSON数据库')

def clean_passage_noise(passage):
    if not passage:
        return ""
    lines = passage.split('\n')
    cleaned = []
    for l in lines:
        raw = l.strip()
        if not raw:
            continue
        if raw.startswith('# ') or raw.startswith('---') or raw.startswith('> 📌') or '初中学业水平考试' in raw or '语文试题' in raw:
            continue
        if '![' in raw and 'image1' in raw:
            continue
        cleaned.append(l)
    return '\n'.join(cleaned).strip()

def clean_stem_numbering(stem):
    if not stem:
        return ""
    stem = re.sub(r'^\d+[\.．、\s]+\d+[\.．、\s]+', '', stem)
    stem = re.sub(r'^\d+[\.．、\s]+', '', stem)
    return stem.strip()

def inject_high_fidelity_layout(questions):
    """High-Fidelity Layout Injection Engine to inject <b>, <u>, wavy lines, dot-emphasis, and blanks into passage/stem/options."""
    for q in questions:
        passage = q.get("passage", "")
        stem = q.get("stem", "")
        analysis = q.get("analysis", "")
        options = q.get("options", [])

        # 1. Inject Blank Underlines
        if passage and "  " in passage:
            passage = re.sub(r'(\s{4,})', r'<span class="blank-underline">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>', passage)
        if stem and "  " in stem:
            stem = re.sub(r'(\s{4,})', r'<span class="blank-underline">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>', stem)

        # 2. Extract Bold / Underline / Wavy / Dot targets
        bold_chars = set()
        if "加粗" in stem:
            b_matches = re.findall(r'[“"‘\']([\u4e00-\u9fa5])[”"’\']', analysis or "")
            for bm in b_matches:
                bold_chars.add(bm)

        underline_words = set()
        if "画横线" in stem or "划线" in stem:
            u_matches = re.findall(r'[A-D][\.．\s]*[“"‘\']?([\u4e00-\u9fa5]{2,6})[”"’\']?', analysis or "")
            for um in u_matches:
                underline_words.add(um)

        wavy_sentences = set()
        if "画波浪线" in stem or "波浪线" in stem:
            w_matches = re.findall(r'[“"‘\']([^”"’\']{6,40})[”"’\']', analysis or "")
            for wm in w_matches:
                wavy_sentences.add(wm)

        dot_words = set()
        if "加点" in stem:
            d_matches = re.findall(r'[“"‘\']([^”"’\']{1,8})[”"‘\']', analysis or "")
            for dm in d_matches:
                if dm not in bold_chars and dm not in underline_words:
                    dot_words.add(dm)

        # 3. Apply Injections
        for b in bold_chars:
            if passage and b in passage and f'<b>{b}</b>' not in passage:
                passage = passage.replace(b, f'<b>{b}</b>')
            if stem and b in stem and f'<b>{b}</b>' not in stem:
                stem = stem.replace(b, f'<b>{b}</b>')

        for u in underline_words:
            if passage and u in passage and f'<u>{u}</u>' not in passage:
                passage = passage.replace(u, f'<u>{u}</u>')
            if stem and u in stem and f'<u>{u}</u>' not in stem:
                stem = stem.replace(u, f'<u>{u}</u>')

        for w in wavy_sentences:
            if passage and w in passage and '<span class="wavy-underline">' not in passage:
                passage = passage.replace(w, f'<span class="wavy-underline">{w}</span>')
            if stem and w in stem and '<span class="wavy-underline">' not in stem:
                stem = stem.replace(w, f'<span class="wavy-underline">{w}</span>')

        for d in dot_words:
            if passage and d in passage and '<span class="dot-emphasis">' not in passage:
                passage = passage.replace(d, f'<span class="dot-emphasis">{d}</span>')
            if stem and d in stem and '<span class="dot-emphasis">' not in stem:
                stem = stem.replace(d, f'<span class="dot-emphasis">{d}</span>')
            new_opts = []
            for opt in options:
                opt_s = opt
                if d in opt_s and '<span class="dot-emphasis">' not in opt_s:
                    opt_s = opt_s.replace(d, f'<span class="dot-emphasis">{d}</span>')
                new_opts.append(opt_s)
            options = new_opts

        q["passage"] = passage
        q["stem"] = stem
        q["options"] = options

    return questions

def parse_md_to_question_json(md_path, meta):
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split questions by ### 第 X 题 or N. 题号
    lines = content.split('\n')
    questions = []
    
    current_q = None
    q_id = 0
    current_passage = ""
    current_module = "01_基础积累与运用"
    is_capturing_analysis = False
    is_capturing_answer = False
    
    for line in lines:
        raw_l = line.strip()
        if not raw_l:
            continue
            
        # Detect section modules
        if '一、' in raw_l or '积累与运用' in raw_l:
            current_module = "01_基础积累与运用"
        elif '名著阅读' in raw_l:
            current_module = "02_名著阅读"
        elif '诗歌阅读' in raw_l:
            current_module = "03_诗歌阅读"
        elif '文言文阅读' in raw_l:
            current_module = "04_文言文阅读"
        elif '现代文阅读1' in raw_l or '现代文阅读Ⅰ' in raw_l or '说明文' in raw_l:
            current_module = "05_现代文阅读Ⅰ"
        elif '现代文阅读2' in raw_l or '现代文阅读Ⅱ' in raw_l or '记叙文' in raw_l:
            current_module = "06_现代文阅读Ⅱ"
        elif '三、写作' in raw_l or '写作' in raw_l or '作文' in raw_l:
            current_module = "07_写作"

        # Detect Question Headers
        m_q = re.match(r'^(\d+)[\.．、\s]+(.*)', raw_l) or re.match(r'^###\s*第\s*(\d+)\s*题', raw_l)
        if m_q and not raw_l.startswith('20'):
            q_id += 1
            if current_q:
                current_q["passage"] = clean_passage_noise(current_q["passage"])
                current_q["stem"] = clean_stem_numbering(current_q["stem"])
                questions.append(current_q)
                
            raw_stem = m_q.group(2) if len(m_q.groups()) >= 2 else ""
            q_type = "单项选择题" if ("选择" in raw_stem or "下列" in raw_stem or "A." in content) else "主观简答题"
            if "作文" in raw_stem or "写作" in raw_stem or current_module == "07_写作":
                q_type = "写作题"
                
            current_q = {
                "id": q_id,
                "source_info": {
                    "province": "山东省",
                    "city": "青岛市",
                    "district": meta.get("district", ""),
                    "year": meta.get("year", ""),
                    "exam_type": meta.get("exam_type", ""),
                    "subject": "中考语文",
                    "source_file": os.path.basename(md_path)
                },
                "score": "",  # Remove score badge globally
                "question_type": q_type,
                "category": meta.get("exam_type", "") + "考点",
                "module": current_module,
                "passage": current_passage,
                "stem": raw_stem,
                "options": [],
                "answer": "",
                "analysis": ""
            }
            current_passage = ""
            is_capturing_analysis = False
            is_capturing_answer = False
        elif current_q:
            if '【参考答案】' in raw_l or '【答案】' in raw_l:
                is_capturing_answer = True
                is_capturing_analysis = False
                ans_text = re.sub(r'\*|\#|【参考答案】|【答案】', '', raw_l).strip()
                if ans_text:
                    current_q["answer"] = ans_text
            elif '【详细解析】' in raw_l or '【解析】' in raw_l or '【详解】' in raw_l:
                is_capturing_analysis = True
                is_capturing_answer = False
                anal_text = re.sub(r'\*|\#|【详细解析】|【解析】', '', raw_l).strip()
                if anal_text:
                    current_q["analysis"] += anal_text + "\n"
            elif is_capturing_answer:
                if raw_l.startswith('**【') or raw_l.startswith('###') or raw_l.startswith('【详解'):
                    is_capturing_answer = False
                else:
                    if current_q["answer"]:
                        current_q["answer"] += " " + raw_l.strip()
                    else:
                        current_q["answer"] = raw_l.strip()
            elif is_capturing_analysis:
                current_q["analysis"] += raw_l + "\n"
            elif re.match(r'^[A-D][\.．\s]', raw_l):
                current_q["options"].append(raw_l)
            else:
                if not current_q["answer"] and not is_capturing_analysis:
                    if raw_l.startswith('**【题干】**') or raw_l.startswith('> 📌'):
                        continue
                    current_q["stem"] += "\n" + raw_l
        else:
            current_passage += raw_l + "\n"

    if current_q:
        current_q["passage"] = clean_passage_noise(current_q["passage"])
        current_q["stem"] = clean_stem_numbering(current_q["stem"])
        questions.append(current_q)
        
    # Apply High-Fidelity Layout Injection Engine
    questions = inject_high_fidelity_layout(questions)
    return questions

def generate_all_json_databases():
    print("==================================================")
    print("🚀 全自动全量生成 41 套试卷纯净数据库（分值全局移除 & 答案解析全量导入）")
    print("==================================================")
    
    os.makedirs(REAL_JSON_DIR, exist_ok=True)
    os.makedirs(MOCK_JSON_DIR, exist_ok=True)
    
    # 1. Process Real Exams
    real_files = [f for f in os.listdir(REAL_SINGLE_DIR) if f.endswith('.md')]
    for rf in real_files:
        md_path = os.path.join(REAL_SINGLE_DIR, rf)
        m_year = re.search(r'(20\d{2})年?', rf)
        year = m_year.group(1) + "年" if m_year else "2025年"
        
        meta = {"district": "市级", "year": year, "exam_type": "中考真题"}
        q_list = parse_md_to_question_json(md_path, meta)
        
        json_name = f"{year}_青岛中考语文真题全要素数据库.json"
        json_path = os.path.join(REAL_JSON_DIR, json_name)
        
        with open(json_path, 'w', encoding='utf-8') as jf:
            json.dump(q_list, jf, ensure_ascii=False, indent=2)

    # 2. Process Mock Exams
    mock_files = [f for f in os.listdir(MOCK_SINGLE_DIR) if f.endswith('.md')]
    for mf in mock_files:
        md_path = os.path.join(MOCK_SINGLE_DIR, mf)
        m_year = re.search(r'(20\d{2})年?', mf)
        year = m_year.group(1) + "年" if m_year else "2025年"
        
        districts = ["市北区", "市南区", "李沧区", "崂山区", "黄岛区", "城阳区", "即墨区", "即墨市", "平度市", "莱西市", "西海岸新区"]
        district = "青岛区县"
        for d in districts:
            if d in mf:
                district = d
                break
                
        meta = {"district": district, "year": year, "exam_type": "区县模拟"}
        q_list = parse_md_to_question_json(md_path, meta)
        
        clean_name = os.path.splitext(mf)[0]
        json_name = f"{clean_name}_全要素数据库.json"
        json_path = os.path.join(MOCK_JSON_DIR, json_name)
        
        with open(json_path, 'w', encoding='utf-8') as jf:
            json.dump(q_list, jf, ensure_ascii=False, indent=2)

    print("🎉 全自动全量 41 套试卷数据库重构完成！")

if __name__ == '__main__':
    generate_all_json_databases()
