@echo off
title 青岛中考语文 - 全套服务启动器
echo ===================================================
echo   正在启动青岛中考语文题库系统（前端 + 后端）...
echo ===================================================

echo [1/2] 正在启动后端 Word/PDF 导出服务 (Port 3001)...
start "青岛中考语文-后端服务(3001)" /D "%~dp0server" cmd /k "npm start"

echo [2/2] 正在启动前端 Web 界面服务 (Port 5173)...
start "青岛中考语文-前端界面(5173)" /D "%~dp0web-app" cmd /k "npm run dev"

echo.
echo [OK] 服务启动指令已全部发出！
echo 浏览器访问地址: http://localhost:5173/
echo.
pause
