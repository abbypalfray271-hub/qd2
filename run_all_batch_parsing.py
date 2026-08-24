import os
import sys
import json
import re
import shutil
import docx
from docx.oxml.ns import qn

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r'E:\中考库\中考语文'
RAW_DIR = os.path.join(BASE_DIR, 'raw')

# Regional Top-level Folders
REGION_QINGDAO = os.path.join(BASE_DIR, '01_青岛中考')
REGION_SHANDONG = os.path.join(BASE_DIR, '02_山东中考')
REGION_NATIONAL = os.path.join(BASE_DIR, '03_全国中考')

# Sub-track Folder Structure Definition
TRACKS = [
    (REGION_QINGDAO, "正式真题"), (REGION_QINGDAO, "区县模拟"),
    (REGION_SHANDONG, "正式真题"), (REGION_SHANDONG, "地市模拟"),
    (REGION_NATIONAL, "正式真题"), (REGION_NATIONAL, "全国模拟")
]

# Initialize Target Directories
for base, sub in TRACKS:
    os.makedirs(os.path.join(base, sub, '单卷解析'), exist_ok=True)
    os.makedirs(os.path.join(base, sub, '分项练习'), exist_ok=True)
    os.makedirs(os.path.join(base, sub, 'images'), exist_ok=True)

# Clean legacy unclassified folders if present
legacy_folders = [
    os.path.join(BASE_DIR, '中考真题'),
    os.path.join(BASE_DIR, '区县模拟'),
    os.path.join(BASE_DIR, '分项练习')
]
for lf in legacy_folders:
    if os.path.exists(lf):
        try:
            shutil.rmtree(lf)
            print(f"🧹 已清理旧版混合目录: {lf}")
        except Exception as e:
            pass

def classify_region_and_type(filepath):
    filename = os.path.basename(filepath)
    rel_path = os.path.relpath(filepath, RAW_DIR)
    combined = (filename + " " + rel_path).lower()
    
    # 1. Year
    m_year = re.search(r'(20\d{2})年?', filename)
    year = m_year.group(1) + "年" if m_year else "2025年"
    
    # 2. Region Classification
    qingdao_keys = ["青岛", "市南", "市北", "李沧", "崂山", "黄岛", "城阳", "即墨", "平度", "莱西", "西海岸"]
    shandong_keys = ["山东", "济南", "潍坊", "烟台", "临沂", "济宁", "淄博", "威海", "东营", "泰安", "德州", "聊城", "滨州", "菏泽", "枣庄", "日照", "莱芜"]
    
    region_dir = REGION_NATIONAL
    region_name = "全国中考"
    province = "全国"
    city = ""
    district = ""
    
    if any(k in filename or k in rel_path for k in qingdao_keys):
        region_dir = REGION_QINGDAO
        region_name = "青岛中考"
        province = "山东省"
        city = "青岛市"
        for d in qingdao_keys[1:]:
            if d in filename or d in rel_path:
                district = d + "区" if not d.endswith("市") and not d.endswith("区") else d
                break
    elif any(k in filename or k in rel_path for k in shandong_keys):
        region_dir = REGION_SHANDONG
        region_name = "山东中考"
        province = "山东省"
        for c in shandong_keys[1:]:
            if c in filename or c in rel_path:
                city = c + "市" if not c.endswith("市") else c
                break
    else:
        # Check province from filename
        provinces = ["北京", "天津", "上海", "重庆", "河北", "山西", "辽宁", "吉林", "黑龙江", "江苏", "浙江", "安徽", "福建", "江西", "河南", "湖北", "湖南", "广东", "广西", "海南", "四川", "贵州", "云南", "陕西", "甘肃", "青海", "内蒙古", "西藏", "宁夏", "新疆"]
        for p in provinces:
            if p in filename or p in rel_path:
                province = p + "省" if not p in ["北京", "天津", "上海", "重庆", "广西", "内蒙古", "西藏", "宁夏", "新疆"] else p
                break
                
    # 3. Real vs Mock Exam Classification
    is_real = False
    if ("真题" in filename or "试题（解析版）" in filename or "试题（解析）" in filename or "精品解析" in filename) and not district and not ("模拟" in filename or "一模" in filename or "二模" in filename):
        is_real = True
        
    sub_track = "正式真题" if is_real else ("区县模拟" if region_name == "青岛中考" else ("地市模拟" if region_name == "山东中考" else "全国模拟"))
    exam_type = "中考真题" if is_real else ("中考一模" if "一模" in filename else ("中考二模" if "二模" in filename else "中考模拟试题"))
    
    loc_str = f"{province}{city}{district}".strip()
    if not loc_str:
        loc_str = "全国通用"
        
    return {
        "region_dir": region_dir,
        "region_name": region_name,
        "sub_track": sub_track,
        "is_real": is_real,
        "province": province,
        "city": city,
        "district": district,
        "location": loc_str,
        "year": year,
        "exam_type": exam_type,
        "filename": filename,
        "filepath": filepath
    }

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

def parse_and_save_exam(filepath):
    meta = classify_region_and_type(filepath)
    
    clean_name = os.path.splitext(meta["filename"])[0]
    doc_id = re.sub(r'[^\w\-\u4e00-\u9fa5]', '_', clean_name)
    
    base_target = os.path.join(meta["region_dir"], meta["sub_track"])
    target_img_dir = os.path.join(base_target, 'images', doc_id)
    rel_img_prefix = f"../images/{doc_id}"
    
    try:
        blocks = extract_docx_blocks(filepath, target_img_dir, rel_img_prefix)
    except Exception as e:
        print(f"⚠️  [读取坏文档失败跳过] {meta['filename']}: {e}")
        return None
    
    has_answers = any('【答案】' in b['raw'] or '【解析】' in b['raw'] or '参考答案' in b['raw'] for b in blocks)
    if not has_answers:
        print(f"⚠️  [跳过无答案原卷] {meta['filename']}")
        return None

    print(f"✅ [{meta['region_name']} • {meta['sub_track']}] 解析归档: {meta['filename']} (共 {len(blocks)} 块)")
    
    # Save Single Exam Markdown in 单卷解析/
    single_md_path = os.path.join(base_target, '单卷解析', f"{clean_name}.md")
    with open(single_md_path, 'w', encoding='utf-8') as f:
        f.write(f"# {clean_name}\n\n")
        f.write(f"> 📌 **试题标定**：{meta['location']} | {meta['year']} | {meta['exam_type']}\n\n---\n\n")
        for b in blocks:
            if b['content'].startswith("一、") or b['content'].startswith("二、") or b['content'].startswith("三、"):
                f.write(f"## {b['content']}\n\n")
            elif b['content'].startswith("【栏目") or b['content'].startswith("（一）") or b['content'].startswith("（二）") or b['content'].startswith("（三）") or b['content'].startswith("（四）") or b['content'].startswith("（五）"):
                f.write(f"### {b['content']}\n\n")
            else:
                f.write(f"{b['content']}\n\n")
                
    return meta

def run_all_batch():
    print("==================================================")
    print("🚀 启动【青岛中考】/【山东中考】/【全国中考】三级地域分流跑批程序")
    print("==================================================")
    
    files_to_process = []
    for root, dirs, files in os.walk(RAW_DIR):
        for f in files:
            if f.endswith('.docx') and not f.startswith('~$'):
                files_to_process.append(os.path.join(root, f))
                
    print(f"共扫描到 Word 文档: {len(files_to_process)} 个\n")
    
    qingdao_count = 0
    shandong_count = 0
    national_count = 0
    skipped_count = 0
    
    for fp in files_to_process:
        res = parse_and_save_exam(fp)
        if res is None:
            skipped_count += 1
        elif res["region_name"] == "青岛中考":
            qingdao_count += 1
        elif res["region_name"] == "山东中考":
            shandong_count += 1
        else:
            national_count += 1
            
    print("\n==================================================")
    print(f"🎉 三级地域分流全量跑批完成！统计结果：")
    print(f"   - 🌊  青岛中考专库 (01_青岛中考): {qingdao_count} 套")
    print(f"   - 泰山  山东中考专库 (02_山东中考): {shandong_count} 套")
    print(f"   - 🇨🇳  全国中考专库 (03_全国中考): {national_count} 套")
    print(f"   - ⚠️  跳过无答案原卷/坏文档: {skipped_count} 套")
    print("==================================================")

if __name__ == '__main__':
    run_all_batch()
