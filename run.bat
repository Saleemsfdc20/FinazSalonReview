@echo off
cd /d "%~dp0"
echo Starting Review Machine server...
start http://localhost:3000
node server.js
pause
