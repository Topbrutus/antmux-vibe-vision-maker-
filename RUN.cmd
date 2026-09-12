@echo off
title GENESIS VECTOR SCOPE - Laboratoire Audio X/Y
echo ========================================================
echo         GENESIS VECTOR SCOPE - LANCEUR WINDOWS
echo ========================================================
echo Verification de l'environnement Python...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Python n'est pas detecte sur votre systeme Windows.
    echo Veuillez installer Python 3.10+ depuis https://www.python.org/
    pause
    exit /b
)

echo Verification et installation des dependances (PySide6, NumPy, SciPy, SoundDevice, PyQtGraph)...
pip install -r requirements.txt

echo.
echo Lancement du laboratoire GENESIS VECTOR SCOPE...
python main.py

if %errorlevel% neq 0 (
    echo.
    echo [ATTENTION] L'application s'est terminee avec un code d'erreur (%errorlevel%).
    pause
)
