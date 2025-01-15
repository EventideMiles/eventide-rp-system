#!/bin/bash

# Create releases directory if it doesn't exist
mkdir -p releases

# Remove existing zip file if it exists
if [ -f releases/eventide-rp-system.zip ]; then
    rm releases/eventide-rp-system.zip
fi

# Compile files excluding src, node_modules, package.json, and .ignore
# Assuming compilation involves copying files to a temp directory
TEMP_DIR=$(mktemp -d)

# Copy all files except the excluded ones to the temp directory
rsync -av --exclude='src/' --exclude='node_modules/' --exclude='package.json' --exclude='package-lock.json' --exclude='.gitignore' --exclude='.prettierignore' --exclude='.vscode/' --exclude='exclude.txt' --exclude='css/eventide-rp-system.css.map' --exclude='release_script.sh' --exclude='release_script.bat' --exclude='minify.js' . "$TEMP_DIR"

# Create the zip file in the releases folder
zip -r releases/eventide-rp-system.zip "$TEMP_DIR"/* 

# Clean up the temporary directory
rm -rf "$TEMP_DIR"
