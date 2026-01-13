const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath);

console.log('🔧 Running Warehouse Migration...\n');

try {
    // Read and execute migration SQL
    const migrationSQL = fs.readFileSync(
        path.join(__dirname, 'prisma', 'migrations', '20260113_add_warehouse.sql'),
        'utf8'
    );

    // Split by semicolon and execute each statement
    const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    statements.forEach((stmt, idx) => {
        try {
            db.exec(stmt);
            console.log(`✅  Statement ${idx + 1}/${statements.length} executed`);
        } catch (err) {
            // Ignore "table already exists" errors
            if (!err.message.includes('already exists')) {
                console.error(`❌  Error in statement ${idx + 1}:`, err.message);
            } else {
                console.log(`ℹ️  Statement ${idx + 1} skipped (already exists)`);
            }
        }
    });

    console.log('\n🎉 Migration completed successfully!\n');

    // Verify tables were created
    const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name IN ('Warehouse', 'StockLevel', 'StockTransfer')
  `).all();

    console.log('📋 Created tables:', tables.map(t => t.name).join(', '));

} catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
} finally {
    db.close();
}
