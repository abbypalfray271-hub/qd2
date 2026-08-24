import os
import sys
import json
import re
import docx
from docx.oxml.ns import qn

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r'E:\中考库\中考语文'
QD_DIR = os.path.join(BASE_DIR, '01_青岛中考')
RAW_DIR = os.path.join(BASE_DIR, 'raw')

REAL_DIR = os.path.join(QD_DIR, '正式真题')
MOCK_DIR = os.path.join(QD_DIR, '区县模拟')

MODULE_KEYS = [
    "01_基础积累与运用",
    "02_名著阅读",
    "03_诗歌阅读",
    "04_文言文阅读",
    "05_现代文阅读Ⅰ",
    "06_现代文阅读Ⅱ",
    "07_写作"
]

FAMOUS_BOOKS = [
    "钢铁是怎样炼成的", "西游记", "水浒传", "骆驼祥子", "朝花夕拾", 
    "红星照耀中国", "昆虫记", "简·爱", "简爱", "名人传", "儒林外史", 
    "格列佛游记", "经典常谈", "海底两万里"
]

def run_to_formatted_text(run):
    text = run.text
    if not text:
        return ''
    text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    if run.bold:
        text = f"<b>{text}</b>"
    u_val = None
    rPr = run._r.get_or_add_rPr()
    u_elem = rPr.find(qn('w:u'))
    if u_elem is not None:
        u_val = u_elem.get(qn('w:val'))
    if u_val in ['wave', 'wavy']:
        text = f'<u style="text-decoration: wavy;">{text}</u>'
    elif u_val is not None and u_val != 'none':
        text = f'<u>{text}</u>'
    elif run.underline:
        text = f'<u>{text}</u>'
    return text

def extract_docx_blocks(docx_path, target_img_dir, rel_img_prefix):
    doc = docx.Document(docx_path)
    os.makedirs(target_img_dir, exist_ok=True)
    
    image_map = {}
    for rel_id, rel in doc.part.rels.items():
        if 'image' in rel.target_ref:
            img_filename = os.path.basename(rel.target_ref)
            img_path = os.path.join(target_img_dir, img_filename)
            with open(img_path, 'wb') as f:
                f.write(rel.target_part.blob)
            image_map[rel_id] = os.path.join(rel_img_prefix, img_filename).replace('\\', '/')
            
    blocks = []
    for child in doc.element.body:
        if child.tag.endswith('p'):
            para = docx.text.paragraph.Paragraph(child, doc)
            parts = []
            for r_child in para._p:
                if r_child.tag.endswith('r'):
                    r_obj = docx.text.run.Run(r_child, para)
                    drawings = r_child.findall('.//' + qn('w:drawing'))
                    if drawings:
                        for d in drawings:
                            blips = d.findall('.//' + qn('a:blip'))
                            for b in blips:
                                embed = b.get(qn('r:embed'))
                                if embed in image_map:
                                    img_rel_path = image_map[embed]
                                    parts.append(f"\n\n![图片]({img_rel_path})\n\n")
                    parts.append(run_to_formatted_text(r_obj))
            fmt = ''.join(parts).strip()
            if fmt:
                blocks.append({'type': 'paragraph', 'content': fmt, 'raw': para.text.strip()})
        elif child.tag.endswith('tbl'):
            table = docx.table.Table(child, doc)
            md_lines = []
            for row in table.rows:
                row_cells = [cell.text.strip().replace('\n', '<br>') for cell in row.cells]
                md_lines.append('| ' + ' | '.join(row_cells) + ' |')
            if len(md_lines) > 0:
                header_sep = '| ' + ' | '.join(['---'] * len(table.rows[0].cells)) + ' |'
                md_lines.insert(1, header_sep)
            md_tbl = '\n'.join(md_lines)
            if md_tbl:
                blocks.append({'type': 'table', 'content': md_tbl, 'raw': md_tbl})
                
    return blocks

def parse_filename_meta(filename):
    m_year = re.search(r'(20\d{2})年?', filename)
    year = m_year.group(1) + "年" if m_year else "2025年"
    
    districts = ["市北区", "市南区", "李沧区", "崂山区", "黄岛区", "城阳区", "即墨区", "即墨市", "平度市", "莱西市", "西海岸新区"]
    district = ""
    for d in districts:
        if d in filename:
            district = d
            break
            
    is_real = ("真题" in filename or "精品解析" in filename) and not district and ("中考语文真题" in filename or "中考语文试题" in filename)
    exam_type = "中考真题" if is_real else ("中考一模" if "一模" in filename else ("中考二模" if "二模" in filename else "中考模拟"))
    location = f"山东省青岛市{district}".strip()
    
    return {
        "is_real": is_real,
        "year": year,
        "location": location,
        "exam_type": exam_type,
        "filename": filename
    }

def is_true_writing_header(raw):
    if any(ex in raw for ex in ['写作特点', '写作手法', '写作顺序', '写作技巧', '写作特色', '写作说明', '写作背景', '写作要求', '写作方向']):
        return False
    if re.search(r'^(一|二|三|四|五|六|七|八)[\.．、\s]*(写作|作文)', raw):
        return True
    if '写作（' in raw or '写作(' in raw or raw.startswith('写作题') or raw.startswith('作文（') or raw.startswith('作文('):
        return True
    if re.search(r'^\d+[\.．]\s*阅读下面的材料.*写作', raw):
        return True
    return False

def split_blocks_by_module(blocks):
    module_content = {m: [] for m in MODULE_KEYS}
    current_mod = "01_基础积累与运用"
    
    for b in blocks:
        raw = b['raw']
        
        # Section switching state machine
        if is_true_writing_header(raw):
            current_mod = "07_写作"
        elif '二、阅读' in raw or '二、 阅读' in raw or ('二、' in raw and '阅读' in raw):
            current_mod = "02_名著阅读"
        elif ('名著阅读' in raw or '名著' in raw or any(book in raw for book in FAMOUS_BOOKS)) and not ('1.' in raw or '2.' in raw or '【答案】' in raw):
            current_mod = "02_名著阅读"
        elif ('诗歌阅读' in raw or '诗歌赏析' in raw or '古诗赏析' in raw) and not ('1.' in raw or '2.' in raw or '【答案】' in raw):
            current_mod = "03_诗歌阅读"
        elif '文言文阅读' in raw and not ('1.' in raw or '2.' in raw or '【答案】' in raw):
            current_mod = "04_文言文阅读"
        elif ('现代文阅读1' in raw or '现代文阅读Ⅰ' in raw or '现代文阅读 1' in raw or '说明文阅读' in raw or '非连续性文本' in raw or '实用类文本' in raw or '材料阅读' in raw) and not ('1.' in raw or '2.' in raw or '【答案】' in raw):
            current_mod = "05_现代文阅读Ⅰ"
        elif ('现代文阅读2' in raw or '现代文阅读Ⅱ' in raw or '现代文阅读 2' in raw or '记叙文阅读' in raw or '散文阅读' in raw or '文学类文本' in raw) and not ('1.' in raw or '2.' in raw or '【答案】' in raw):
            current_mod = "06_现代文阅读Ⅱ"
        elif '一、积累与运用' in raw or '一、语言积累' in raw or '【栏目一' in raw:
            current_mod = "01_基础积累与运用"

        if current_mod == "02_名著阅读" and ('八、作文' in raw or '作文（本大题' in raw or '从以下两题中任选一题' in raw):
            current_mod = "07_写作"
            
        module_content[current_mod].append(b['content'])
        
    return module_content

def build_all_qingdao_banks():
    print("==================================================")
    print("🚀 启动【01_青岛中考】全域大题状态机重构与基础积累隔离")
    print("==================================================")
    
    files_to_parse = []
    for root, dirs, files in os.walk(RAW_DIR):
        for f in files:
            if f.endswith('.docx') and not f.startswith('~$') and ('青岛' in f or '青岛' in root):
                if '解析' in f or '答案' in f:
                    files_to_parse.append(os.path.join(root, f))
                    
    print(f"找到青岛解析版 Word 文件: {len(files_to_parse)} 个")

    real_branch_data = {m: [] for m in MODULE_KEYS}
    mock_branch_data = {m: [] for m in MODULE_KEYS}
    
    real_json_list = []
    mock_json_list = []

    for fp in files_to_parse:
        meta = parse_filename_meta(os.path.basename(fp))
        target_dir = REAL_DIR if meta["is_real"] else MOCK_DIR
        
        clean_name = os.path.splitext(meta["filename"])[0]
        doc_id = re.sub(r'[^\w\-\u4e00-\u9fa5]', '_', clean_name)
        img_dir = os.path.join(target_dir, 'images', doc_id)
        
        try:
            blocks = extract_docx_blocks(fp, img_dir, f"../images/{doc_id}")
        except Exception as e:
            continue
            
        has_answers = any('【答案】' in b['raw'] or '【解析】' in b['raw'] or '参考答案' in b['raw'] for b in blocks)
        if not has_answers:
            continue
            
        mod_dict = split_blocks_by_module(blocks)
        target_accumulator = real_branch_data if meta["is_real"] else mock_branch_data
        
        for m_key, content_list in mod_dict.items():
            if content_list:
                item_md = f"### 📌 试题来源与标定卡片：{meta['location']} • {meta['year']}{meta['exam_type']}\n\n"
                item_md += f"> - **来源试卷**：{clean_name}\n"
                item_md += f"> - **考试年份**：{meta['year']}\n"
                item_md += f"> - **所属模块**：{m_key}\n\n"
                item_md += "\n\n".join(content_list)
                item_md += "\n\n" + "="*60 + "\n\n"
                
                target_accumulator[m_key].append(item_md)
                
        json_item = {
            "meta": meta,
            "doc_id": doc_id,
            "filename": meta["filename"],
            "blocks_count": len(blocks)
        }
        if meta["is_real"]:
            real_json_list.append(json_item)
        else:
            mock_json_list.append(json_item)

    # Output Markdown Branch Files
    for base_path, acc_data, tag in [(REAL_DIR, real_branch_data, "真题"), (MOCK_DIR, mock_branch_data, "模拟")]:
        branch_dir = os.path.join(base_path, '分项练习')
        os.makedirs(branch_dir, exist_ok=True)
        
        for m_key, md_chunks in acc_data.items():
            file_name = f"{m_key}({tag}).md"
            full_path = os.path.join(branch_dir, file_name)
            
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(f"# 🌊 青岛中考语文分项专项练习 —— {m_key}({tag})\n\n")
                f.write(f"> 📌 **收录说明**：本练习全量收录自青岛市{tag}试卷中该考点的所有试题、背景材料与详细解析（共收录 {len(md_chunks)} 套试卷切片）。\n\n---\n\n")
                f.write("\n".join(md_chunks))
                
            file_size_kb = round(os.path.getsize(full_path) / 1024, 2)
            print(f"✨ 成功落盘纯净版分项练习: {file_name} ({file_size_kb} KB, 包含 {len(md_chunks)} 组题块)")

    with open(os.path.join(REAL_DIR, 'qingdao_real_exams.json'), 'w', encoding='utf-8') as f:
        json.dump(real_json_list, f, ensure_ascii=False, indent=2)
        
    with open(os.path.join(MOCK_DIR, 'qingdao_mock_exams.json'), 'w', encoding='utf-8') as f:
        json.dump(mock_json_list, f, ensure_ascii=False, indent=2)

    print("\n🎉 青岛全域 14 个纯净版分项练习全量落盘完成！")

if __name__ == '__main__':
    build_all_qingdao_banks()
