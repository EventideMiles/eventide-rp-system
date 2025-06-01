import fs from 'fs';
import path from 'path';
import { minify } from 'terser';

async function minifyJsFiles(directory) {
    const files = fs.readdirSync(directory, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(directory, file.name);

        if (file.isDirectory()) {
            // Skip node_modules and src directories
            if (file.name !== 'node_modules' && file.name !== 'src') {
                await minifyJsFiles(fullPath);
            }
        } else if (file.name.endsWith('.js') || file.name.endsWith('.mjs')) {
            const code = fs.readFileSync(fullPath, 'utf8');
            try {
                const result = await minify(code, {
                    sourceMap: false,
                    module: true,
                    compress: {
                        defaults: true
                    },
                    format: {
                        comments: false
                    }
                });

                if (result.code) {
                    fs.writeFileSync(fullPath, result.code);
                    console.log(`Minified: ${fullPath}`);
                }
            } catch (error) {
                console.error(`Error minifying ${fullPath}:`, error);
            }
        }
    }
}

// Get the directory from command line argument
const directory = process.argv[2];
if (!directory) {
    console.error('Please provide a directory path');
    process.exit(1);
}

minifyJsFiles(directory).catch(console.error);
