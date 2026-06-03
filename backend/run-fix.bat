@echo off
echo Running fix script...
node fix-collections-simple.js > fix-output.txt 2>&1
echo Output saved to fix-output.txt
type fix-output.txt
pause
