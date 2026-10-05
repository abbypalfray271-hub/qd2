# -*- coding: utf-8 -*-
"""
2026年青岛12套新增中考试卷全量自动化入库构建流水线脚本
包含：
1. 市南区中考一模
2. 市北区中考一模
3. 崂山区中考一模
4. 崂山区中考二模
5. 青岛实验初级中学等校中考二模
6. 青岛大学附属中学中考二模
7. 崂山区实验初级中学中考二模
8. 胶州市中考二模
9. 黄岛区中考前调研
10. 莱西市中考一模
11. 初中学业水平考试模拟试题（二）
12. 初中学业水平考试模拟试题（三）

功能：
1. 一键生成 12 篇单卷解析 Markdown（01_青岛中考/区县模拟/单卷解析/）
2. 一键生成 12 套全要素解构 JSON 数据库（01_青岛中考/区县模拟/JSON数据库/）
3. 同步扩充 7 大核心模块分项练习库（01_青岛中考/区县模拟/分项练习/）
4. 全量注入前端总库 exams_data.json（web-app/public/data/ 与 web-app/src/data/，从39套扩充到51套）
"""

import os
import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
QD_DIR = os.path.join(PROJECT_ROOT, '01_青岛中考')
MOCK_SINGLE_DIR = os.path.join(QD_DIR, '区县模拟', '单卷解析')
MOCK_JSON_DIR = os.path.join(QD_DIR, '区县模拟', 'JSON数据库')
MOCK_BRANCH_DIR = os.path.join(QD_DIR, '区县模拟', '分项练习')
WEB_PUBLIC_DATA = os.path.join(PROJECT_ROOT, 'web-app', 'public', 'data', 'exams_data.json')
WEB_SRC_DATA = os.path.join(PROJECT_ROOT, 'web-app', 'src', 'data', 'exams_data.json')

# 12套试卷模块配置
MODULE_NAMES = [
    'data_2026_shinan1',
    'data_2026_shibei1',
    'data_2026_laoshan1',
    'data_2026_laoshan2',
    'data_2026_qdsy2',
    'data_2026_qdfz2',
    'data_2026_laoshan_sy2',
    'data_2026_jiaozhou2',
    'data_2026_huangdao',
    'data_2026_laixi1',
    'data_2026_moni2',
    'data_2026_moni3'
]

DISTRICT_MAP = {
    'data_2026_shinan1': '市南区',
    'data_2026_shibei1': '市北区',
    'data_2026_laoshan1': '崂山区',
    'data_2026_laoshan2': '崂山区',
    'data_2026_qdsy2': '市南区',
    'data_2026_qdfz2': '市南区',
    'data_2026_laoshan_sy2': '崂山区',
    'data_2026_jiaozhou2': '胶州市',
    'data_2026_huangdao': '黄岛区',
    'data_2026_laixi1': '莱西市',
    'data_2026_moni2': '青岛市级',
    'data_2026_moni3': '青岛市级'
}

def load_all_new_exams():
    exams = []
    for mod_name in MODULE_NAMES:
        m = __import__(mod_name)
        meta = getattr(m, 'EXAM_INFO', None) or getattr(m, 'EXAM_META', None)
        title = meta.get('title') or meta.get('name')
        exam_id = meta.get('id')
        district = DISTRICT_MAP.get(mod_name, meta.get('district') or meta.get('region', '青岛市级'))
        
        normalized_meta = {
            "id": exam_id,
            "title": title,
            "name": title,
            "category": meta.get('category', '区县模拟'),
            "year": "2026年",
            "district": district,
            "region": district,
            "term": meta.get('term', '模拟'),
            "total_score": 120,
            "time_limit": 120,
            "source_file": meta.get('source_pdf') or meta.get('source_file', f"{title}.pdf"),
            "description": meta.get('description', '')
        }
        
        # 严格检查与广播兜底，确保没有任何“同上”占位符逃逸
        cleaned_questions = []
        cur_p = ""
        cur_sec = ""
        for q in m.QUESTIONS:
            q_copy = dict(q)
            p = q_copy.get("passage", "").strip()
            sec = q_copy.get("section_title", "")
            if not p:
                if sec != cur_sec:
                    cur_p = ""
                    cur_sec = sec
            elif ('同上' in p and len(p) < 40) or p in ['（文同上）', '(文同上)', '【材料】（文同上）', '【文言文阅读】（文同上）', '【文学类文本阅读】（文同上）']:
                if cur_p:
                    q_copy["passage"] = cur_p
                else:
                    raise ValueError(f"试卷 {title} 题目 {q_copy['id']} 包含同上占位符且无法回溯材料！")
            else:
                cur_p = q_copy.get("passage", "")
                cur_sec = sec
            cleaned_questions.append(q_copy)
            
        exams.append((normalized_meta, cleaned_questions))
    return exams

def generate_single_markdown(meta, questions):
    """生成高保真单卷解析 Markdown"""
    lines = []
    lines.append(f"# {meta['title']}（解析版）\n")
    lines.append(f"> 📌 **试题标定**：山东省青岛市{meta['district']} | {meta['year']} | 满分：120分 | 时间：120分钟\n")
    lines.append("---\n")
    lines.append("<b>九年级语文试题</b>\n")
    lines.append("<b>（考试时间：120分钟；满分：120分）</b>\n")
    lines.append("<b>本试题共三道大题，所有题目均在答题卡上作答，在试题上作答无效。其中，选择题部分必须用2B铅笔在答题卡相应位置涂写；笔答题部分必须用0.5毫米黑色签字笔在答题卡相应位置作答。</b>\n")
    
    current_sec = ""
    current_grp = ""
    last_passage = ""
    
    for q in questions:
        sec = q.get("section_title", "")
        grp = q.get("group_title", "")
        passage = q.get("passage", "")
        
        # 1. 一级大题
        if sec and sec != current_sec:
            current_sec = sec
            lines.append(f"\n<b>{sec}</b>\n")
            
        # 2. 二级子说明
        if grp and grp != current_grp and grp != sec:
            current_grp = grp
            lines.append(f"\n<b>{grp}</b>\n")
            
        # 3. 阅读材料
        if passage and passage != last_passage:
            lines.append(f"\n{passage}\n")
            last_passage = passage
            
        # 4. 题干
        q_id = q["id"]
        score_str = f"（{q['score']}分）" if q.get("score") else ""
        stem = q["stem"]
        if not re.match(r'^\d+[\.．、]', stem):
            stem_display = f"{q_id}. {stem}{score_str}"
        else:
            stem_display = stem
        lines.append(f"\n{stem_display}\n")
        
        # 5. 选项
        opts = q.get("options", [])
        if opts:
            for opt in opts:
                lines.append(f"{opt}\n")
                
        # 6. 答案与解析
        ans = q.get("answer", "")
        anal = q.get("analysis", "")
        lines.append(f"\n【答案】{ans}\n")
        if anal:
            clean_anal = anal
            if clean_anal.startswith("【答案】"):
                clean_anal = clean_anal.split("\n", 1)[-1].strip()
            lines.append(f"【解析】\n{clean_anal}\n")
            
    return "\n".join(lines)

def build_single_md_and_json(exams):
    print("=" * 60)
    print("🚀 1. 开始生成 12 套试卷单卷解析 Markdown 与全要素 JSON 数据库")
    print("=" * 60)
    
    os.makedirs(MOCK_SINGLE_DIR, exist_ok=True)
    os.makedirs(MOCK_JSON_DIR, exist_ok=True)
    
    for idx, (meta, questions) in enumerate(exams, 1):
        # A. 生成 Markdown
        md_content = generate_single_markdown(meta, questions)
        md_filename = f"{meta['title']}（解析版）.md"
        md_path = os.path.join(MOCK_SINGLE_DIR, md_filename)
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(md_content)
        size_kb = round(os.path.getsize(md_path) / 1024, 2)
        print(f"[{idx:02d}/12] 📄 单卷解析 Markdown 已就绪: {md_filename} ({size_kb} KB)")
        
        # B. 生成全要素解构 JSON 数据库
        json_items = []
        for q in questions:
            item = {
                "id": q["id"],
                "section_title": q.get("section_title", ""),
                "group_title": q.get("group_title", ""),
                "source_info": {
                    "province": "山东省",
                    "city": "青岛市",
                    "district": meta["district"],
                    "year": meta["year"],
                    "exam_type": meta["category"],
                    "subject": "中考语文",
                    "source_file": md_filename
                },
                "score": q.get("score", 2),
                "question_type": q.get("question_type", "单项选择题"),
                "category": q.get("category", "区县模拟考点"),
                "module": q.get("module", "01_基础知识积累与运用"),
                "knowledge_points": q.get("knowledge_points", []),
                "passage": q.get("passage", ""),
                "stem": q.get("stem", ""),
                "options": q.get("options", []),
                "answer": q.get("answer", ""),
                "analysis": q.get("analysis", "")
            }
            json_items.append(item)
            
        json_filename = f"{meta['title']}（解析版）_全要素数据库.json"
        json_path = os.path.join(MOCK_JSON_DIR, json_filename)
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(json_items, f, ensure_ascii=False, indent=2)
        jsize_kb = round(os.path.getsize(json_path) / 1024, 2)
        print(f"       📊 全要素解构 JSON 数据库已就绪: {json_filename} ({jsize_kb} KB, {len(json_items)} 题)")

def update_exams_data_json(exams):
    print("\n" + "=" * 60)
    print("🚀 2. 更新前端全量试卷库 exams_data.json (39套 -> 51套)")
    print("=" * 60)
    
    if not os.path.exists(WEB_PUBLIC_DATA):
        print(f"❌ 找不到文件: {WEB_PUBLIC_DATA}")
        return
        
    with open(WEB_PUBLIC_DATA, 'r', encoding='utf-8') as f:
        exams_list = json.load(f)
        
    existing_ids = {e["id"] for e in exams_list}
    existing_titles = {e["title"] for e in exams_list}
    
    added_count = 0
    updated_count = 0
    new_exam_entries = []
    
    for meta, questions in exams:
        exam_id = meta["id"]
        exam_title = meta["title"]
        
        entry = {
            "id": exam_id,
            "title": exam_title,
            "category": meta["category"],
            "year": meta["year"],
            "district": meta["district"],
            "questions": questions
        }
        
        if exam_id in existing_ids or exam_title in existing_titles:
            print(f"⚠️ 试卷已存在，执行热更覆盖: {exam_title}")
            for idx, e in enumerate(exams_list):
                if e["id"] == exam_id or e["title"] == exam_title:
                    exams_list[idx] = entry
                    updated_count += 1
                    break
        else:
            new_exam_entries.append(entry)
            added_count += 1
            
    # 将 2026 年新试卷统一插入在已有 2026 试卷后面
    if new_exam_entries:
        # 寻找 2026 试卷的最后一个位置
        insert_idx = 0
        for i, e in enumerate(exams_list):
            if str(e.get("year", "")) == "2026":
                insert_idx = i + 1
        if insert_idx == 0:
            insert_idx = 1
            
        for ne in reversed(new_exam_entries):
            exams_list.insert(insert_idx, ne)
            
    # 写回 public 和 src 两处
    for target_path in [WEB_PUBLIC_DATA, WEB_SRC_DATA]:
        if os.path.exists(os.path.dirname(target_path)):
            with open(target_path, 'w', encoding='utf-8') as f:
                json.dump(exams_list, f, ensure_ascii=False, indent=2)
            f_size = round(os.path.getsize(target_path) / 1024, 2)
            print(f"✨ 成功写入前端数据库: {target_path} ({f_size} KB, 总计 {len(exams_list)} 套试卷)")
            
    print(f"🎉 试卷库扩充完成：新增 {added_count} 套，更新 {updated_count} 套，当前试卷总数: {len(exams_list)} 套！")

def map_question_to_branch_module(q):
    """将题目的 module 映射到分项练习库的 7 大核心文件键名"""
    mod = q.get("module", "")
    cat = q.get("category", "")
    
    if any(k in mod or k in cat for k in ["基础", "字音", "字形", "词语", "成语", "病句", "排序", "衔接", "标点", "默写"]):
        return "01_基础积累与运用"
    elif any(k in mod or k in cat for k in ["名著", "西游记", "水浒传", "简·爱", "红星照耀中国", "骆驼祥子", "经典常谈", "钢铁是怎样炼成的", "朝花夕拾", "昆虫记"]):
        return "02_名著阅读"
    elif any(k in mod or k in cat for k in ["诗歌", "诗词"]):
        return "03_诗歌阅读"
    elif any(k in mod or k in cat for k in ["文言", "文言文"]):
        return "04_文言文阅读"
    elif any(k in mod or k in cat for k in ["非连续", "实用类", "说明", "科技", "信息"]):
        return "05_现代文阅读Ⅰ"
    elif any(k in mod or k in cat for k in ["文学", "散文", "小说", "记叙文"]):
        return "06_现代文阅读Ⅱ"
    elif any(k in mod or k in cat for k in ["写作", "作文"]):
        return "07_写作"
    else:
        return "01_基础积累与运用"

def update_branch_bank(exams):
    print("\n" + "=" * 60)
    print("🚀 3. 同步扩充 7 大核心模块分项练习库")
    print("=" * 60)
    
    os.makedirs(MOCK_BRANCH_DIR, exist_ok=True)
    
    module_files = {
        "01_基础积累与运用": "01_基础积累与运用(模拟).md",
        "02_名著阅读": "02_名著阅读(模拟).md",
        "03_诗歌阅读": "03_诗歌阅读(模拟).md",
        "04_文言文阅读": "04_文言文阅读(模拟).md",
        "05_现代文阅读Ⅰ": "05_现代文阅读Ⅰ(模拟).md",
        "06_现代文阅读Ⅱ": "06_现代文阅读Ⅱ(模拟).md",
        "07_写作": "07_写作(模拟).md"
    }
    
    new_exam_titles = {meta['title'] for meta, _ in exams}
    
    for mod_key, filename in module_files.items():
        file_path = os.path.join(MOCK_BRANCH_DIR, filename)
        if not os.path.exists(file_path):
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(f"# 青岛中考区县模拟试题分项练习：{mod_key}\n\n---\n\n")
                
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 剥离属于本次 12 套试卷的旧切片（防止旧版本‘文同上’残留）
        raw_parts = re.split(r'(### 📌 试题来源与标定卡片：[^\n]+)', content)
        cleaned_parts = [raw_parts[0]]
        for i in range(1, len(raw_parts), 2):
            b_hdr = raw_parts[i]
            b_body = raw_parts[i+1] if i+1 < len(raw_parts) else ""
            is_new = any(t in b_hdr or t in b_body for t in new_exam_titles)
            if not is_new:
                cleaned_parts.append(b_hdr + b_body)
                
        base_content = "".join(cleaned_parts).rstrip() + "\n\n"
            
        append_blocks = []
        for meta, questions in exams:
            exam_mod_questions = [q for q in questions if map_question_to_branch_module(q) == mod_key]
            if not exam_mod_questions:
                continue
                
            block_header = f"### 📌 试题来源与标定卡片：山东省青岛市{meta['district']} • {meta['year']}{meta['title'][-4:]}\n\n"
            block_header += f"> - **来源试卷**：{meta['title']}\n"
            block_header += f"> - **考试年份**：{meta['year']}\n"
            block_header += f"> - **所属模块**：{mod_key}\n\n"
            
            q_texts = []
            last_p = ""
            for q in exam_mod_questions:
                if q.get("passage") and q["passage"] != last_p:
                    q_texts.append(q["passage"] + "\n")
                    last_p = q["passage"]
                score_str = f"（{q['score']}分）" if q.get("score") else ""
                q_texts.append(f"{q['id']}. {q['stem']}{score_str}\n")
                if q.get("options"):
                    q_texts.append("\n".join(q["options"]) + "\n")
                q_texts.append(f"\n【答案】{q['answer']}\n")
                if q.get("analysis"):
                    q_texts.append(f"【解析】\n{q['analysis']}\n")
                    
            item_block = block_header + "\n".join(q_texts) + "\n\n" + "="*60 + "\n\n"
            append_blocks.append(item_block)
            
        final_content = base_content + "\n".join(append_blocks)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(final_content)
        print(f"📦 已全新刷新分项练习: {filename} (注入 {len(append_blocks)} 套新试卷切片，零占位符)")

if __name__ == '__main__':
    all_exams = load_all_new_exams()
    print(f"已加载 {len(all_exams)} 套 2026 年新试卷数据，准备执行全量入库构建！")
    
    build_single_md_and_json(all_exams)
    update_exams_data_json(all_exams)
    update_branch_bank(all_exams)
    
    print("\n" + "=" * 60)
    print("🏆 恭喜！2026 年青岛中考新增 12 套试卷全量入库构建全部圆满完成！")
    print("=" * 60)
