@echo off
chcp 65001
echo ===================================================
echo 🚀【舌姐中文】生产环境打包与 Git 双端部署脚本
echo ===================================================

cd /d %~dp0web-app
echo 📦 [1/4] 正在执行生产编译 (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 编译失败，请检查代码！
    pause
    exit /b %errorlevel%
)

cd /d %~dp0
echo 📂 [2/4] 强制添加产物 dist/ 至 Git 版本控制...
git add -f web-app/dist/
git add .

set /p msg=请输入本次提交日志说明 (直接回车默认: build: 生产部署打包): 
if "%msg%"=="" set msg=build: 生产部署打包

echo 📝 [3/4] 正在提交 Commit...
git commit -m "%msg%"

echo 🚀 [4/4] 正在推送到 GitHub 与 Gitee 双端仓库...
git push github master --tags
git push gitee master --tags

echo ===================================================
echo ✅ 双端推送成功！远程服务器只需执行 git pull 即可秒级更新！
echo ===================================================
pause
