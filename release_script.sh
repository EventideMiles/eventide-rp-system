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
WORKING_DIR=$(pwd)


# Create a new directory for the release
mkdir -p "$TEMP_DIR/eventide-rp-system"

# Copy all files into the new directory with comprehensive exclusions
rsync -av \
    --exclude='src/' \
    --exclude='node_modules/' \
    --exclude='package.json' \
    --exclude='package-lock.json' \
    --exclude='.gitignore' \
    --exclude='.gitattributes' \
    --exclude='.prettierignore' \
    --exclude='.prettierrc.json' \
    --exclude='.stylelintrc' \
    --exclude='eslint.config.js' \
    --exclude='.vscode/' \
    --exclude='exclude.txt' \
    --exclude='css/eventide-rp-system.css.map' \
    --exclude='release_script.sh' \
    --exclude='release_script.bat' \
    --exclude='minify.js' \
    --exclude='.git/' \
    --exclude='releases/' \
    --exclude='build-lang.js' \
    --exclude='.claude/' \
    --exclude='plans/' \
    --exclude='tests/' \
    --exclude='jest.config.js' \
    --exclude='coverage/' \
    --exclude='.husky/' \
    --exclude='types/' \
    --exclude='jsconfig.json' \
    . "$TEMP_DIR/eventide-rp-system/"

# Minify JavaScript files
node minify.js "$TEMP_DIR/eventide-rp-system"

# Create the zip file in the temp directory
cd "$TEMP_DIR" && zip -r eventide-rp-system.zip *

# Move the zip file to the releases directory
mv "$TEMP_DIR/eventide-rp-system.zip" "$WORKING_DIR/releases/eventide-rp-system.zip"

# Clean up the temporary directory
rm -rf "$TEMP_DIR"