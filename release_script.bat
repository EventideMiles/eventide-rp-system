@echo off

REM Create releases directory if it doesn't exist
mkdir releases

REM Compile files excluding src, node_modules, package.json, and .ignore
REM Assuming compilation involves copying files to a temp directory
set TEMP_DIR=%TEMP%\eventide_rp_temp
mkdir "%TEMP_DIR%"

REM Copy all files except the excluded ones to the temp directory
xcopy * "%TEMP_DIR%" /E /I /EXCLUDE:exclude.txt

REM Remove existing zip file if it exists
if exist releases\eventide-rp-system.zip (
    del releases\eventide-rp-system.zip
)

REM Create the zip file in the releases folder
powershell -command "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath 'releases\eventide-rp-system.zip'"

REM Clean up the temporary directory
rmdir /S /Q "%TEMP_DIR%"
