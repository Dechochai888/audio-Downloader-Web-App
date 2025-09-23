@echo off
set URL=%1
if "%URL%"=="" set /p URL=วางลิงก์แล้วกด Enter:

rem ดึงคุกกี้จาก Chrome อัตโนมัติ
yt-dlp --cookies-from-browser chrome -f "bestvideo*+bestaudio/best" --merge-output-format mp4 "%URL%"
pause
