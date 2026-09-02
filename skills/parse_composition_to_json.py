import os
import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

OCR_JSON = r'D:\Ai_Vibe_Coding\scratch\ocr_raw_results.json'

with open(OCR_JSON, 'r', encoding='utf-8-sig') as f:
    raw_pages = json.load(f)

def clean_cjk_line(line):
    line = re.sub(r'(?<=[\u4e00-\u9fa5\w\d\(\)（）《》“”、，。！？；：·\-\—])\s+(?=[\u4e00-\u9fa5\w\d\(\)（）《》“”、，。！？；：·\-\—])', '', line)
    line = re.sub(r'〖\s*', '〖', line)
    line = re.sub(r'\s*〗', '〗', line)
    line = re.sub(r'\s+', ' ', line).strip()
    return line

def is_noise(line):
    noise_patterns = [
        r'^小红书店铺',
        r'学力引擎.*侵权必究',
        r'学力引擎\s*×\s*苏粉老师',
        r'请勿盗版及转卖',
        r'^作\s*者\s*：\s*学力引擎',
        r'己申请版权保护',
        r'^\d+$'
    ]
    for np in noise_patterns:
        if re.search(np, line):
            return True
    return False

pages_dict = {}
for p in raw_pages:
    pno = p['page']
    cleaned = []
    for l in p['lines']:
        cl = clean_cjk_line(l)
        if cl and not is_noise(cl):
            cleaned.append(cl)
    pages_dict[pno] = cleaned

SECTION_KEYWORDS = [
    "〖通用写作结构〗",
    "〖传统文化好入手的题材〗",
    "〖分层具象解读〗",
    "〖真题放送〗",
    "〖审题指导〗",
    "〖满分范文〗",
    "〖万能模板〗",
    "〖万能模版〗",
    "〖中考避坑小贴士〗",
    "〖名篇领航及评析〗"
]

THEME_CONFIGS = [
    {
        "id": "theme_01",
        "title": "主题一：奋斗与成长",
        "theme_name": "奋斗与成长",
        "pages": list(range(7, 13)),
        "focus": "困境突围、自我蜕变、习惯习得、磨砺坚持",
        "masterpiece_meta": {"title": "我二十一岁那年（有删节）", "author": "史铁生"}
    },
    {
        "id": "theme_02",
        "title": "主题二：情感与他人",
        "theme_name": "情感与他人",
        "pages": list(range(13, 19)),
        "focus": "凡人微光、亲情相伴、师恩难忘、善意互助",
        "masterpiece_meta": {"title": "花边饺", "author": "肖复兴"}
    },
    {
        "id": "theme_03",
        "title": "主题三：生活与哲思",
        "theme_name": "生活与哲思",
        "pages": list(range(19, 24)),
        "focus": "自然启迪、细节顿悟、圆缺辩证、生活清欢",
        "masterpiece_meta": {"title": "会飞的太阳（节选）", "author": "丁立梅"}
    },
    {
        "id": "theme_04",
        "title": "主题四：文化自信",
        "theme_name": "文化自信",
        "pages": list(range(24, 30)),
        "focus": "传统技艺、非遗瑰宝、典籍流芳、古风民俗",
        "masterpiece_meta": {"title": "杨家埠的画儿", "author": "冯骥才"}
    },
    {
        "id": "theme_05",
        "title": "主题五：家国情怀",
        "theme_name": "家国情怀",
        "pages": list(range(30, 36)),
        "focus": "时代楷模、奉献精神、科技强国、故土深情",
        "masterpiece_meta": {"title": "到橘子林去（有删改）", "author": "李广田"}
    },
    {
        "id": "theme_06",
        "title": "主题六：社会热点思辨",
        "theme_name": "社会热点思辨",
        "pages": list(range(36, 42)),
        "focus": "快慢辩证、科技向善、网络空间、生态文明",
        "masterpiece_meta": {"title": "红绿灯下", "author": "迟子建"}
    },
    {
        "id": "theme_07",
        "title": "主题七：奇幻想象类",
        "theme_name": "奇幻想象类",
        "pages": list(range(42, 48)),
        "focus": "时空穿梭、角色相逢、科幻探索、童话新编",
        "masterpiece_meta": {"title": "拾月光（节选）", "author": "迟子建"}
    }
]

def parse_theme(conf):
    theme_id = conf['id']
    title = conf['title']
    pages = conf['pages']
    
    all_lines = []
    for p in pages:
        all_lines.extend(pages_dict.get(p, []))
        
    sections = {}
    current_sec = "导语与概述"
    sections[current_sec] = []
    
    for line in all_lines:
        matched_sec = None
        for sk in SECTION_KEYWORDS:
            if sk in line:
                matched_sec = sk.replace("〖", "").replace("〗", "").strip()
                if "万能模" in matched_sec:
                    matched_sec = "万能模板"
                break
        if matched_sec:
            current_sec = matched_sec
            if current_sec not in sections:
                sections[current_sec] = []
        else:
            sections[current_sec].append(line)
            
    # Parse Exemplary Essays
    essays = []
    raw_essay_lines = sections.get("满分范文", [])
    current_essay = None
    
    for l in raw_essay_lines:
        is_essay_start = False
        # Match common essay start indicators
        if re.search(r'^(满分[范例]文[一二三四]|范文[一二三四])', l):
            is_essay_start = True
        elif conf['id'] == 'theme_05' and l.strip() == "这也是一种爱国":
            if not current_essay or current_essay.get("is_in_analysis"):
                is_essay_start = True
        elif "满分范文" in l and len(l) <= 35:
            is_essay_start = True
            
        if is_essay_start:
            if current_essay:
                essays.append(current_essay)
            title_text = l
            if conf['id'] == 'theme_05':
                idx = len(essays) + 1
                subs = ["（青团文化视角·外婆）", "（维修工具箱视角·父亲）", "（护林员守青山视角·爷爷）"]
                sub = subs[idx - 1] if idx <= len(subs) else ""
                title_text = f"满分范文{['一','二','三'][idx-1]}：《这也是一种爱国》{sub}"
            current_essay = {
                "title": title_text,
                "paragraphs": [],
                "analysis": "",
                "is_in_analysis": False
            }
        elif current_essay:
            if re.search(r'^(评析|【名师评析】|名师点评|亮点点评|评点)', l) or ("评析" in l[:6] and len(l) <= 10):
                current_essay["is_in_analysis"] = True
            elif current_essay["is_in_analysis"]:
                current_essay["analysis"] += l + "\n"
            else:
                current_essay["paragraphs"].append(l)
    if current_essay:
        essays.append(current_essay)
        
    # Clean up essay titles
    for e in essays:
        e["analysis"] = e["analysis"].strip()
        
    # Parse Masterpiece
    masterpiece_lines = sections.get("名篇领航及评析", [])
    mp_meta = conf["masterpiece_meta"]
    masterpiece = {
        "title": mp_meta["title"],
        "author": mp_meta["author"],
        "content": [],
        "commentary": ""
    }
    is_in_comment = False
    for l in masterpiece_lines:
        if re.search(r'^(评析|【评析】|赏析|评点)', l) or ("评析" in l[:6] and len(l) <= 10):
            is_in_comment = True
        elif is_in_comment:
            masterpiece["commentary"] += l + "\n"
        else:
            # Skip title and author lines if already matched
            if l == mp_meta["title"] or l == mp_meta["author"]:
                continue
            masterpiece["content"].append(l)
    masterpiece["commentary"] = masterpiece["commentary"].strip()

    return {
        "theme_id": theme_id,
        "title": title,
        "theme_name": conf["theme_name"],
        "page_range": [pages[0], pages[-1]],
        "focus": conf["focus"],
        "structure": sections.get("通用写作结构", []),
        "exam_prompts": sections.get("真题放送", []),
        "audit_guide": sections.get("审题指导", []),
        "special_addons": {k: v for k, v in sections.items() if k in ["传统文化好入手的题材", "分层具象解读", "中考避坑小贴士"]},
        "templates": sections.get("万能模板", []),
        "exemplary_essays": essays,
        "masterpiece": masterpiece
    }

guide_lines = []
for p in [5, 6]:
    guide_lines.extend(pages_dict.get(p, []))

all_themes_data = [parse_theme(c) for c in THEME_CONFIGS]

composition_db = {
    "book_title": "中考必备七大类主题作文",
    "version": "2026版",
    "source_pdf": "E:\\中考库\\中考语文\\raw\\写作专项\\中考必备七大类主题作文.pdf",
    "total_pages": 47,
    "user_guide": guide_lines,
    "themes": all_themes_data
}

target_json = r'E:\中考库\中考语文\wiki\写作专项\中考必备七大类主题作文_结构化数据库.json'
os.makedirs(os.path.dirname(target_json), exist_ok=True)
with open(target_json, 'w', encoding='utf-8') as f:
    json.dump(composition_db, f, ensure_ascii=False, indent=2)

print(f"Database exported successfully: {target_json}")
for t in all_themes_data:
    print(f"[{t['theme_name']}] 范文数量: {len(t['exemplary_essays'])}, 名篇: 《{t['masterpiece']['title']}》 ({t['masterpiece']['author']})")
