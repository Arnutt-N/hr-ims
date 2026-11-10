-- Manual TiDB migration to sync with local Prisma schema
-- Run: npx prisma db execute --url "$TIDB_URL" --file prisma/migrations/manual/2026-04-14_tidb_sync.sql
-- Safe to re-run: both statements use IF NOT EXISTS semantics where supported; where not, we handle errors at runtime.

-- 1) Add `reserved` column to StockLevel (from commit f778360 feat: reserve stock for pending requests)
-- TiDB/MySQL: use information_schema guard since ADD COLUMN IF NOT EXISTS is MySQL 8.0.29+
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'StockLevel' AND COLUMN_NAME = 'reserved'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE StockLevel ADD COLUMN reserved INT NOT NULL DEFAULT 0',
  'SELECT ''StockLevel.reserved already exists'' AS note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Add index on RolePermission.roleId (from dashboard-performance-optimization plan, Task 6)
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'RolePermission' AND INDEX_NAME = 'RolePermission_roleId_idx'
);
SET @sql := IF(@idx_exists = 0,
  'CREATE INDEX RolePermission_roleId_idx ON RolePermission(roleId)',
  'SELECT ''RolePermission(roleId) index already exists'' AS note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
