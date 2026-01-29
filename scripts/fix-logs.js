
const fs = require('fs');
const path = require('path');

const baseDir = 'd:\\02 genAI\\hr-ims\\project-log-md';
const folders = ['common', 'antigravity', 'claude_code', 'kilo', 'codex', 'archive'];

console.log(`Working on: ${baseDir}`);

try {
    // Create folders
    folders.forEach(folder => {
        const dirPath = path.join(baseDir, folder);
        try {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`Created: ${folder}`);
            } else {
                console.log(`Exists: ${folder}`);
            }
        } catch (e) {
            console.error(`Failed to create ${folder}: ${e.message}`);
        }
    });

    // Configure moves
    const moves = [
        { pattern: /^git-.*\.md$/, dest: 'common' },
        { pattern: /.md$/, dest: 'archive' }
    ];

    const files = fs.readdirSync(baseDir);
    console.log(`Found ${files.length} files`);

    files.forEach(file => {
        const fullPath = path.join(baseDir, file);
        try {
            if (fs.statSync(fullPath).isDirectory()) return;

            for (const move of moves) {
                if (move.pattern.test(file)) {
                    const destPath = path.join(baseDir, move.dest, file);
                    fs.renameSync(fullPath, destPath);
                    console.log(`Moved ${file} to ${move.dest}`);
                    break;
                }
            }
        } catch (e) {
            console.error(`Failed to move ${file}: ${e.message}`);
        }
    });
} catch (e) {
    console.error(`Critical error: ${e.message}`);
}
