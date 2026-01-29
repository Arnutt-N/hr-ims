
const fs = require('fs');
const path = require('path');

const baseDir = 'd:\\02 genAI\\hr-ims\\project-log-md';
const folders = ['common', 'antigravity', 'claude_code', 'kilo', 'codex', 'archive'];

// Create folders
folders.forEach(folder => {
    const dirPath = path.join(baseDir, folder);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created: ${folder}`);
    } else {
        console.log(`Exists: ${folder}`);
    }
});

// Configure moves
const moves = [
    { pattern: /^git-.*\.md$/, dest: 'common' },
    { pattern: /.md$/, dest: 'archive' } // Catch-all for remaining md files (logs)
];

const files = fs.readdirSync(baseDir);

files.forEach(file => {
    const fullPath = path.join(baseDir, file);
    if (fs.statSync(fullPath).isDirectory()) return;

    for (const move of moves) {
        if (move.pattern.test(file)) {
            const destPath = path.join(baseDir, move.dest, file);
            // Don't move if it's already in a subfolder (which we checked with isDirectory, 
            // but just to be safe from script logic errors, we only move files in the root of baseDir)
            fs.renameSync(fullPath, destPath);
            console.log(`Moved ${file} to ${move.dest}`);
            break; // Stop after first match
        }
    }
});
