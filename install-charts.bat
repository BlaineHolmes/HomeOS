@echo off
echo.
echo ========================================
echo   HomeOS - Installing Chart Dependencies
echo ========================================
echo.
echo Installing recharts for Emporia Energy charts...
echo.

npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ SUCCESS! Charts are now ready!
    echo.
    echo 🎉 You can now view interactive Emporia Energy charts:
    echo    - Real-time usage timeline
    echo    - Channel usage breakdown
    echo    - Comparative bar charts
    echo.
    echo 🚀 Restart your dev server to see the changes:
    echo    npm run dev
    echo.
) else (
    echo.
    echo ❌ Installation failed. Please check the error above.
    echo.
    echo 💡 Try running this manually:
    echo    npm install recharts
    echo.
)

pause
