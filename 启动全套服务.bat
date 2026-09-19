@echo off
chcp 65001 >nul
title 中考语文 - 全套服务启动器
echo ===================================================
echo 🚀 正在启动中考语文题库系统（前端 + 后端）...
echo ===================================================

echo [1/2] 启动后端 Word/PDF 导出服务 (Port 3001)...
start "中考语文-后端服务(3001)" cmd /k "cd /d %~dp0server && npm start"

echo [2/2] 启动前端 Web 界面服务 (Port 5173)...
start "中考语文-前端界面(5173)" cmd /k "cd /d %~dp0web-app && npm run dev"

echo.
echo ✅ 服务启动指令已发出！
echo 浏览器访问地址: http://localhost:5173/
echo.
pause
