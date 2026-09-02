import os
import sys
import json
import docx
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = r'E:\中考库\中考语文\wiki\写作专项\中考必备七大类主题作文_结构化数据库.json'
WIKI_DIR = r'E:\中考库\中考语文\wiki\写作专项'
OUTPUT_DIR = r'E:\中考库\中考语文\outputs'
os.makedirs(WIKI_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

with open(DB_PATH, 'r', encoding='utf-8') as f:
    db = json.load(f)

print("=== 1. 生成 Wiki 原子 Markdown 词条 ===")

# Generate Overview Index
overview_md = f"""# 中考必备七大类主题作文 · 全景导航与备考指南

> **核心摘要**：本专题总结自中考语文写作高频母题库，涵盖**奋斗成长、情感他人、生活哲思、文化自信、家国情怀、社会热点、奇幻想象**七大核心主题。每个主题均配备“通用写作结构 + 历年真题放送 + 审题破题要诀 + 满分范文逐篇精析 + 分层万能模板 + 名篇领航阅读”，助力中考考生突破审题难关、搭建严密骨架、沉淀灵动文笔。

---

## 📌 七大核心主题导航卡片

| 主题序号 | 主题名称 | 核心锚点与考向 | 双向链接词条 |
| :--- | :--- | :--- | :--- |
| **主题一** | 奋斗与成长 | 困境突围、自我蜕变、习惯习得、磨砺坚持 | [[20260902_中考作文_主题一_奋斗与成长]] |
| **主题二** | 情感与他人 | 凡人微光、亲情相伴、师恩难忘、善意互助 | [[20260902_中考作文_主题二_情感与他人]] |
| **主题三** | 生活与哲思 | 自然启迪、细节顿悟、圆缺辩证、生活清欢 | [[20260902_中考作文_主题三_生活与哲思]] |
| **主题四** | 文化自信 | 传统技艺、非遗瑰宝、典籍流芳、古风民俗 | [[20260902_中考作文_主题四_文化自信]] |
| **主题五** | 家国情怀 | 时代楷模、奉献精神、科技强国、故土深情 | [[20260902_中考作文_主题五_家国情怀]] |
| **主题六** | 社会热点思辨 | 快慢辩证、科技向善、网络空间、生态文明 | [[20260902_中考作文_主题六_社会热点思辨]] |
| **主题七** | 奇幻想象类 | 时空穿梭、角色相逢、科幻探索、童话新编 | [[20260902_中考作文_主题七_奇幻想象类]] |

---

## 📖 备考使用黄金法则 (SOP)
1. **结构先行**：熟背各大主题的【通用写作结构】，确保考场上5分钟内搭建出起承转合清晰的四段或五段式骨架。
2. **真题对照**：比对【真题放送】与【审题指导】，牢记“抓题眼、定立意、避偏题”三部曲。
3. **范文仿写**：精读【满分范文】及名师评析，借鉴细节描写、心理刻画与升华扣题的笔法。
4. **模板化用**：熟练掌握【万能模板】中的分层递进句式，严禁死记硬背生搬硬套，注重融入自己的真情实感。
5. **名篇涵养**：朗读【名篇领航】经典文本，涵养文学底蕴与语言韵味。

---
*关联索引：[[20260819_INDEX]] | 原始素材：[`中考必备七大类主题作文.pdf`](file:///E:/%E4%B8%AD%E8%80%83%E5%BA%93/%E4%B8%AD%E8%80%83%E8%AF%AD%E6%96%87/raw/%E5%86%99%E4%BD%9C%E4%B8%93%E9%A1%B9/%E4%B8%AD%E8%80%83%E5%BF%85%E5%A4%87%E4%B8%83%E5%A4%A7%E7%B1%BB%E4%B8%BB%E9%A2%98%E4%BD%9C%E6%96%87.pdf)*
"""

with open(os.path.join(WIKI_DIR, '20260902_中考作文_总指南与七大主题架构.md'), 'w', encoding='utf-8') as f:
    f.write(overview_md)

# Generate individual Theme Markdown files
for t in db['themes']:
    t_id = t['theme_id']
    t_name = t['theme_name']
    t_title = t['title']
    focus = t['focus']
    pages = t['page_range']
    
    md_content = f"""# {t_title} · 满分写作专项与真题范文

> **考点摘要**：本词条对应中考语文写作核心考向——**【{t_name}】**（源自 PDF P{pages[0]}-P{pages[1]}）。核心聚焦于“{focus}”。本篇汇聚通用写作骨架、经典中考原题点拨、{len(t['exemplary_essays'])} 篇中考满分标杆范文（附逐段评析）、万能句式支架以及名家文学示范。

---

## 🧭 一、通用写作结构与布局

"""
    for l in t.get('structure', []):
        md_content += f"{l}\n\n"
        
    for k, v in t.get('special_addons', {}).items():
        md_content += f"### 💡 特别指引：{k}\n\n"
        for l in v:
            md_content += f"- {l}\n"
        md_content += "\n"

    md_content += """---

## 🎯 二、中考真题放送与审题指导

### 1. 经典中考真题
"""
    for l in t.get('exam_prompts', []):
        md_content += f"> {l}\n>\n"
        
    md_content += "\n### 2. 审题立意与避坑要诀\n"
    for l in t.get('audit_guide', []):
        md_content += f"- {l}\n"

    md_content += """
---

## 🏆 三、中考满分标杆范文与名师逐段评析

"""
    for idx, essay in enumerate(t.get('exemplary_essays', [])):
        e_title = essay['title']
        md_content += f"### 范文标杆 {idx+1}：{e_title}\n\n"
        for p in essay['paragraphs']:
            md_content += f"　　{p}\n\n"
        if essay['analysis']:
            md_content += f"> **【名师精析】**\n>\n"
            for al in essay['analysis'].split('\n'):
                if al.strip():
                    md_content += f"> {al}\n"
            md_content += "\n"
        md_content += "---\n\n"

    md_content += """## ⚡ 四、万能模板与高分句式支架

"""
    for l in t.get('templates', []):
        if l.startswith('〖') or l.startswith('（') or '层' in l:
            md_content += f"#### {l}\n\n"
        else:
            md_content += f"{l}\n\n"

    mp = t.get('masterpiece', {})
    if mp and mp['title']:
        md_content += f"""---

## 📚 五、名篇领航及文学鉴赏

### 《{mp['title']}》
**作者：{mp['author']}**

"""
        for l in mp.get('content', []):
            md_content += f"　　{l}\n\n"
        if mp.get('commentary'):
            md_content += f"> **【名家赏析与中考借鉴】**\n>\n"
            for cl in mp['commentary'].split('\n'):
                if cl.strip():
                    md_content += f"> {cl}\n"
            md_content += "\n"

    md_content += f"""
---
*相关知识卡片：[[20260902_中考作文_总指南与七大主题架构]] | [[20260819_INDEX]]*
"""

    theme_file = os.path.join(WIKI_DIR, f"20260902_中考作文_{t_id}_{t_name}.md")
    with open(theme_file, 'w', encoding='utf-8') as f:
        f.write(md_content)
    print(f"Generated wiki card: {theme_file}")

print("=== Wiki Markdown cards generated successfully! ===")
