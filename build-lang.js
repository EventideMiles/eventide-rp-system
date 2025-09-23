/**
 * build-lang.js
 *
 * This script combines multiple language source files into a single language file
 * for use with Foundry VTT. It processes all language subdirectories in the lang/src folder.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const sourceDir = path.join(__dirname, "lang", "src");
const outputDir = path.join(__dirname, "lang");

// Function to deep merge objects
/**
 * @param {{ [x: string]: any; }} target
 * @param {{ [x: string]: any; }} source
 */
function deepMerge(target, source) {
  const output = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (
        source[key] instanceof Object &&
        key in target &&
        target[key] instanceof Object
      ) {
        output[key] = deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }
  }

  return output;
}

// Function to build a language file for a specific language
/**
 * @param {string} langCode
 */
function buildLanguageFile(langCode) {
  console.log(`Building language file for ${langCode}...`);

  const langSourceDir = path.join(sourceDir, langCode);
  const outputFile = path.join(outputDir, `${langCode}.json`);

  try {
    // Read all JSON files from the language source directory
    const files = fs
      .readdirSync(langSourceDir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => path.join(langSourceDir, file));

    if (files.length === 0) {
      console.error(`No source files found for language: ${langCode}!`);
      return false;
    }

    console.log(`Found ${files.length} source files for ${langCode}:`);
    files.forEach((file) => console.log(`- ${path.basename(file)}`));

    // Merge all files into a single object
    let mergedData = {};

    for (const file of files) {
      const fileContent = fs.readFileSync(file, "utf8");
      const jsonData = JSON.parse(fileContent);
      mergedData = deepMerge(mergedData, jsonData);
    }

    // Write the merged data to the output file
    fs.writeFileSync(outputFile, JSON.stringify(mergedData, null, 2), "utf8");

    console.log(`Successfully built language file: ${outputFile}`);
    return true;
  } catch (error) {
    console.error(`Error building language file for ${langCode}:`, error);
    return false;
  }
}

// Main function to build all language files
function buildAllLanguageFiles() {
  console.log("Building all language files...");

  try {
    // Check if source directory exists
    if (!fs.existsSync(sourceDir)) {
      console.error(`Error: Source directory ${sourceDir} does not exist!`);
      process.exit(1);
    }

    // Get all language subdirectories
    const langDirs = fs
      .readdirSync(sourceDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    if (langDirs.length === 0) {
      console.error("No language directories found!");
      process.exit(1);
    }

    console.log(`Found ${langDirs.length} language(s): ${langDirs.join(", ")}`);

    // Build language file for each language
    let successCount = 0;
    for (const langCode of langDirs) {
      const success = buildLanguageFile(langCode);
      if (success) successCount++;
    }

    console.log(
      `Successfully built ${successCount} out of ${langDirs.length} language files.`,
    );
  } catch (error) {
    console.error("Error building language files:", error);
    process.exit(1);
  }
}

// Run the build
buildAllLanguageFiles();
