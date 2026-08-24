import os
import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

QD_DIR = r'E:\中考库\中考语文\01_青岛中考'

def audit_all_files():
    print("==================================================")
    print("🧐 启动【01_青岛中考】全量文件 One-by-One 逐个深度审核")
    print("==================================================")
    
    issues = []
    total_files = 0
    
    # 1. 审核 [正式真题/单卷解析]
    real_single_dir = os.path.join(QD_DIR, '正式真题', '单卷解析')
    if os.path.exists(real_single_dir):
        files = os.listdir(real_single_dir)
        print(f"\n1. 📁 【正式真题/单卷解析】({len(files)} 个文件):")
        for f in files:
            total_files += 1
            fp = os.path.join(real_single_dir, f)
            size_kb = round(os.path.getsize(fp)/1024, 2)
            print(f"   - 📄 {f} ({size_kb} KB)")
            
            # Check filename typo
            if '青岛市市' in f:
                issues.append({
                    "category": "文件名命名错字",
                    "file": f,
                    "detail": "文件名中包含重复错字'青岛市市'"
                })
                
            with open(fp, 'r', encoding='utf-8') as file_obj:
                content = file_obj.read()
                # Check image paths
                img_links = re.findall(r'!\[.*?\]\((.*?)\)', content)
                for link in img_links:
                    abs_img = os.path.normpath(os.path.join(real_single_dir, link))
                    if not os.path.exists(abs_img):
                        issues.append({
                            "category": "图片失效断链",
                            "file": f,
                            "detail": f"关联图片不存在: {link}"
                        })

    # 2. 审核 [正式真题/分项练习]
    real_branch_dir = os.path.join(QD_DIR, '正式真题', '分项练习')
    if os.path.exists(real_branch_dir):
        files = os.listdir(real_branch_dir)
        print(f"\n2. 📁 【正式真题/分项练习】({len(files)} 个文件):")
        for f in files:
            total_files += 1
            fp = os.path.join(real_branch_dir, f)
            size_kb = round(os.path.getsize(fp)/1024, 2)
            print(f"   - 📄 {f} ({size_kb} KB)")
            if size_kb < 1.0:
                issues.append({
                    "category": "内容偏少预警",
                    "file": f,
                    "detail": f"分项练习文件体量仅 {size_kb} KB"
                })

    # 3. 审核 [区县模拟/单卷解析]
    mock_single_dir = os.path.join(QD_DIR, '区县模拟', '单卷解析')
    if os.path.exists(mock_single_dir):
        files = os.listdir(mock_single_dir)
        print(f"\n3. 📁 【区县模拟/单卷解析】({len(files)} 个文件):")
        for f in files:
            total_files += 1
            fp = os.path.join(mock_single_dir, f)
            size_kb = round(os.path.getsize(fp)/1024, 2)
            print(f"   - 📄 {f} ({size_kb} KB)")

    # 4. 审核 [区县模拟/分项练习]
    mock_branch_dir = os.path.join(QD_DIR, '区县模拟', '分项练习')
    if os.path.exists(mock_branch_dir):
        files = os.listdir(mock_branch_dir)
        print(f"\n4. 📁 【区县模拟/分项练习】({len(files)} 个文件):")
        for f in files:
            total_files += 1
            fp = os.path.join(mock_branch_dir, f)
            size_kb = round(os.path.getsize(fp)/1024, 2)
            print(f"   - 📄 {f} ({size_kb} KB)")
            if size_kb < 1.0:
                issues.append({
                    "category": "分项缺乏预警",
                    "file": f,
                    "detail": f"青岛区县模拟在该考点下暂无题块 (体量 {size_kb} KB)"
                })

    # 5. 审核 JSON 数据库
    print("\n5. 📁 【JSON 结构化数据库】:")
    for j_path in [os.path.join(QD_DIR, '正式真题', 'qingdao_real_exams.json'), os.path.join(QD_DIR, '区县模拟', 'qingdao_mock_exams.json')]:
        if os.path.exists(j_path):
            total_files += 1
            size_kb = round(os.path.getsize(j_path)/1024, 2)
            with open(j_path, 'r', encoding='utf-8') as jf:
                db_data = json.load(jf)
            print(f"   - 📊 {os.path.basename(j_path)} ({size_kb} KB, 包含 {len(db_data)} 条记录)")

    print("\n==================================================")
    print(f"🎯 审核汇总：共逐一审核 {total_files} 个文件，发现 {len(issues)} 处需改进问题:")
    if issues:
        for idx, iss in enumerate(issues, 1):
            print(f"  {idx}. [{iss['category']}] {iss['file']}: {iss['detail']}")
    else:
        print("  🎉 未发现任何严重物理异常！")
    print("==================================================")

if __name__ == '__main__':
    audit_all_files()
