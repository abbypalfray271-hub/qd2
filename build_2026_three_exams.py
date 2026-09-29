# -*- coding: utf-8 -*-
"""
2026年青岛三套新试卷自动化入库流水线脚本
- 李沧区中考一模
- 即墨区中考一模
- 市北区中考二模
"""

import os
import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

# 导入三套试卷数据
import data_2026_licang as licang
import data_2026_jimo as jimo
import data_2026_shibei as shibei

PROJECT_ROOT = r'E:\中考库\青岛中考试题'
QD_DIR = os.path.join(PROJECT_ROOT, '01_青岛中考')
MOCK_SINGLE_DIR = os.path.join(QD_DIR, '区县模拟', '单卷解析')
MOCK_JSON_DIR = os.path.join(QD_DIR, '区县模拟', 'JSON数据库')
MOCK_BRANCH_DIR = os.path.join(QD_DIR, '区县模拟', '分项练习')
WEB_PUBLIC_DATA = os.path.join(PROJECT_ROOT, 'web-app', 'public', 'data', 'exams_data.json')
WEB_SRC_DATA = os.path.join(PROJECT_ROOT, 'web-app', 'src', 'data', 'exams_data.json')

EXAMS = [
    (licang.EXAM_META, licang.QUESTIONS),
    (jimo.EXAM_META, jimo.QUESTIONS),
    (shibei.EXAM_META, shibei.QUESTIONS)
]

def generate_single_markdown(meta, questions):
    """生成高保真单卷解析 Markdown"""
    lines = []
    lines.append(f"# {meta['title']}（解析版）\n")
    lines.append(f"> 📌 **试题标定**：山东省青岛市{meta['district']} | {meta['year']} | {meta['title'][-4:]}\n")
    lines.append("---\n")
    lines.append("<b>九年级语文试题</b>\n")
    lines.append("<b>（考试时间：120分钟；满分：120分）</b>\n")
    lines.append("<b>本试题共三道大题、23或24道小题。所有题目均在答题卡上作答，在试题上作答无效。其中，选择题部分必须用2B铅笔在答题卡相应位置涂写；笔答题部分必须用0.5毫米黑色签字笔在答题卡相应位置作答。</b>\n")
    
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
            
        # 2. 二级子目录
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
        # 保证题号格式统一
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
            # 去除可能自带的【答案】重复
            clean_anal = anal
            if clean_anal.startswith("【答案】"):
                clean_anal = clean_anal.split("\n", 1)[-1].strip()
            lines.append(f"【解析】\n{clean_anal}\n")
            
    return "\n".join(lines)

def build_single_md_and_json():
    print("==================================================")
    print("🚀 1. 开始生成 3 套试卷单卷解析 Markdown 与全要素 JSON 数据库")
    print("==================================================")
    
    os.makedirs(MOCK_SINGLE_DIR, exist_ok=True)
    os.makedirs(MOCK_JSON_DIR, exist_ok=True)
    
    for meta, questions in EXAMS:
        # A. 生成 Markdown
        md_content = generate_single_markdown(meta, questions)
        md_filename = f"{meta['title']}（解析版）.md"
        md_path = os.path.join(MOCK_SINGLE_DIR, md_filename)
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(md_content)
        size_kb = round(os.path.getsize(md_path) / 1024, 2)
        print(f"📄 单卷解析 Markdown 已就绪: {md_filename} ({size_kb} KB)")
        
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
                "module": q.get("module", "01_基础积累与运用"),
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
        print(f"📊 全要素解构 JSON 数据库已就绪: {json_filename} ({jsize_kb} KB, {len(json_items)} 题)")

def update_exams_data_json():
    print("\n==================================================")
    print("🚀 2. 更新前端全量试卷库 exams_data.json (36套 -> 39套)")
    print("==================================================")
    
    if not os.path.exists(WEB_PUBLIC_DATA):
        print(f"❌ 找不到文件: {WEB_PUBLIC_DATA}")
        return
        
    with open(WEB_PUBLIC_DATA, 'r', encoding='utf-8') as f:
        exams_list = json.load(f)
        
    existing_ids = {e["id"] for e in exams_list}
    existing_titles = {e["title"] for e in exams_list}
    
    added_count = 0
    new_exam_entries = []
    
    for meta, questions in EXAMS:
        if meta["id"] in existing_ids or meta["title"] in existing_titles:
            print(f"⚠️ 试卷已存在，执行热更覆盖: {meta['title']}")
            # 找到对应项并更新
            for idx, e in enumerate(exams_list):
                if e["id"] == meta["id"] or e["title"] == meta["title"]:
                    exams_list[idx] = {
                        "id": meta["id"],
                        "title": meta["title"],
                        "category": meta["category"],
                        "year": meta["year"],
                        "district": meta["district"],
                        "questions": questions
                    }
                    break
        else:
            new_entry = {
                "id": meta["id"],
                "title": meta["title"],
                "category": meta["category"],
                "year": meta["year"],
                "district": meta["district"],
                "questions": questions
            }
            new_exam_entries.append(new_entry)
            added_count += 1
            
    # 将 2026 年新试卷插入在真题后面、2025 年模拟试卷前面
    if new_exam_entries:
        insert_idx = 1 # 紧随 2026 青岛真题之后
        for ne in reversed(new_exam_entries):
            exams_list.insert(insert_idx, ne)
            
    # 写回 public 和 src
    for target_path in [WEB_PUBLIC_DATA, WEB_SRC_DATA]:
        if os.path.exists(os.path.dirname(target_path)):
            with open(target_path, 'w', encoding='utf-8') as f:
                json.dump(exams_list, f, ensure_ascii=False, indent=2)
            f_size = round(os.path.getsize(target_path) / 1024, 2)
            print(f"✨ 成功写入主库: {target_path} ({f_size} KB, 总计 {len(exams_list)} 套试卷)")

def update_branch_bank():
    print("\n==================================================")
    print("🚀 3. 同步扩充 7 大核心模块分项练习库")
    print("==================================================")
    
    os.makedirs(MOCK_BRANCH_DIR, exist_ok=True)
    
    # 模块对应字典
    module_files = {
        "01_基础积累与运用": "01_基础积累与运用(模拟).md",
        "02_名著阅读": "02_名著阅读(模拟).md",
        "03_诗歌阅读": "03_诗歌阅读(模拟).md",
        "04_文言文阅读": "04_文言文阅读(模拟).md",
        "05_现代文阅读Ⅰ": "05_现代文阅读Ⅰ(模拟).md",
        "06_现代文阅读Ⅱ": "06_现代文阅读Ⅱ(模拟).md",
        "07_写作": "07_写作(模拟).md"
    }
    
    for mod_key, filename in module_files.items():
        file_path = os.path.join(MOCK_BRANCH_DIR, filename)
        if not os.path.exists(file_path):
            continue
            
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        append_blocks = []
        for meta, questions in EXAMS:
            exam_mod_questions = [q for q in questions if q.get("module") == mod_key]
            if not exam_mod_questions:
                continue
                
            block_header = f"### 📌 试题来源与标定卡片：山东省青岛市{meta['district']} • {meta['year']}{meta['title'][-4:]}\n\n"
            block_header += f"> - **来源试卷**：{meta['title']}\n"
            block_header += f"> - **考试年份**：{meta['year']}\n"
            block_header += f"> - **所属模块**：{mod_key}\n\n"
            
            # 避免重复追加
            if meta['title'] in content:
                continue
                
            q_texts = []
            last_p = ""
            for q in exam_mod_questions:
                if q.get("passage") and q["passage"] != last_p:
                    q_texts.append(q["passage"] + "\n")
                    last_p = q["passage"]
                q_texts.append(f"{q['id']}. {q['stem']}\n")
                if q.get("options"):
                    q_texts.append("\n".join(q["options"]) + "\n")
                q_texts.append(f"\n【答案】{q['answer']}\n")
                if q.get("analysis"):
                    q_texts.append(f"【解析】\n{q['analysis']}\n")
                    
            item_block = block_header + "\n".join(q_texts) + "\n\n" + "="*60 + "\n\n"
            append_blocks.append(item_block)
            
        if append_blocks:
            with open(file_path, 'a', encoding='utf-8') as f:
                f.write("\n" + "\n".join(append_blocks))
            print(f"📦 已扩充分项练习: {filename} (追加了 {len(append_blocks)} 套试卷切片)")
        else:
            print(f"ℹ️ 分项练习无需重复追加: {filename}")

if __name__ == '__main__':
    build_single_md_and_json()
    update_exams_data_json()
    update_branch_bank()
    print("\n🎉 2026年三套新试卷入库构建全部顺利完成！")
