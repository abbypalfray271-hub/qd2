import os
import sys
import json
import re
import docx
from docx.oxml.ns import qn

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r'E:\中考库\中考语文'
RAW_DIR = os.path.join(BASE_DIR, 'raw')
OUTPUT_DIR = BASE_DIR
IMAGES_BASE_DIR = os.path.join(BASE_DIR, 'images')
BRANCH_DIR = os.path.join(BASE_DIR, '分项练习')
BANK_JSON_PATH = os.path.join(BASE_DIR, 'chinese_question_bank.json')

os.makedirs(IMAGES_BASE_DIR, exist_ok=True)
os.makedirs(BRANCH_DIR, exist_ok=True)

MODULE_MAPPING_NAME = {
    "基础": "01_基础积累与运用",
    "名著": "02_名著阅读",
    "诗歌": "03_诗歌阅读",
    "文言文": "04_文言文阅读",
    "现代文1": "05_现代文阅读Ⅰ",
    "现代文2": "06_现代文阅读Ⅱ",
    "写作": "07_写作"
}

def parse_metadata_from_filename(filepath):
    filename = os.path.basename(filepath)
    
    # Year
    m_year = re.search(r'(20\d{2})年?', filename)
    year = m_year.group(1) + "年" if m_year else "2025年"
    
    # Location
    province = "山东省"
    city = "青岛市"
    district = ""
    
    districts = ["市北区", "市南区", "李沧区", "崂山区", "黄岛区", "城阳区", "即墨区", "即墨市", "胶州市", "平度市", "莱西市", "西海岸新区"]
    for d in districts:
        if d in filename:
            district = d
            break
            
    location = f"{province}{city}{district}"
    
    # Exam type
    if "一模" in filename:
        exam_type = "中考一模"
    elif "二模" in filename:
        exam_type = "中考二模"
    elif "真题" in filename:
        exam_type = "中考真题"
    else:
        exam_type = "中考模拟试题"
        
    return {
        "province": province,
        "city": city,
        "district": district,
        "location": location,
        "year": year,
        "exam_type": exam_type,
        "filename": filename
    }

def run_to_formatted_text(run, image_map):
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

def extract_docx_content(docx_path, doc_id):
    doc = docx.Document(docx_path)
    img_dir = os.path.join(IMAGES_BASE_DIR, doc_id)
    os.makedirs(img_dir, exist_ok=True)
    
    image_map = {}
    for rel_id, rel in doc.part.rels.items():
        if 'image' in rel.target_ref:
            img_filename = os.path.basename(rel.target_ref)
            img_path = os.path.join(img_dir, img_filename)
            with open(img_path, 'wb') as f:
                f.write(rel.target_part.blob)
            image_map[rel_id] = os.path.join('images', doc_id, img_filename)
            
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
                    parts.append(run_to_formatted_text(r_obj, image_map))
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

def process_single_exam_docx(docx_path):
    doc_id = os.path.splitext(os.path.basename(docx_path))[0]
    doc_id = re.sub(r'[^\w\-\u4e00-\u9fa5]', '_', doc_id)
    
    meta = parse_metadata_from_filename(docx_path)
    print(f"--> 正在解析试卷: {meta['filename']} [{meta['location']} | {meta['year']} | {meta['exam_type']}]")
    
    blocks = extract_docx_content(docx_path, doc_id)
    print(f"    提取有效数据块: {len(blocks)} 条")
    
    return {
        "metadata": meta,
        "doc_id": doc_id,
        "blocks_count": len(blocks)
    }

def append_question_to_branch_file(branch_file_name, q_data):
    file_path = os.path.join(BRANCH_DIR, branch_file_name)
    file_exists = os.path.exists(file_path)
    
    with open(file_path, 'a', encoding='utf-8') as f:
        if not file_exists:
            f.write(f"# 青岛中考语文分项专项练习 —— {branch_file_name.replace('.md', '')}\n\n")
            f.write("> 说明：本练习汇集青岛及各区县历年中考真题与一模/二模优质试题，包含完整背景材料与标定卡片。\n\n---\n\n")
            
        f.write(f"## 第 {q_data['id']} 题：{q_data['category']}（{q_data['score']}分）\n\n")
        f.write(f"> 📌 **试题来源与标定信息**\n")
        f.write(f"> - **来源地区**：{q_data['source_info']['location']}\n")
        f.write(f"> - **考试年份**：{q_data['source_info']['year']}\n")
        f.write(f"> - **考试类型**：{q_data['source_info']['exam_type']}\n")
        f.write(f"> - **学科模块**：中考语文 ➔ {branch_file_name.replace('.md', '')}\n")
        f.write(f"> - **考点分类**：{q_data['category']}\n")
        f.write(f"> - **题目类型**：{q_data['question_type']}（{q_data['score']}分）\n\n")
        
        f.write(f"### 【共用背景材料】\n{q_data['passage']}\n\n")
        f.write(f"### 【试题内容】\n{q_data['stem']}\n\n")
        if q_data.get('options'):
            f.write("**【选项】**\n" + "\n".join(q_data['options']) + "\n\n")
        f.write(f"### 【参考答案】\n{q_data['answer']}\n\n")
        f.write(f"### 【详细解析与考点说明】\n{q_data['analysis']}\n\n")
        f.write("\n" + "="*50 + "\n\n")

if __name__ == '__main__':
    print("=== 🛠️ 语文试卷解析与分项归档 Skill 引擎已就位 ===")
    if len(sys.argv) > 1:
        target_path = sys.argv[1]
        if os.path.exists(target_path):
            process_single_exam_docx(target_path)
    else:
        print("可用方法：python batch_parse_chinese_exams.py <试卷docx绝对路径>")
