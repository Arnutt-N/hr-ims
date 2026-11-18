-- Manual TiDB/MySQL migration for stock count rounds.
-- Source: backend/prisma/schema.prisma (2026-11-18 examples review proposal 3)
-- Run: npx prisma db execute --url "$TIDB_URL" --file prisma/migrations/manual/2026-11-18_stock_count.sql
-- Safe to re-run: each CREATE TABLE is guarded by information_schema.TABLES.

SET @table_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'StockCountRound'
);
SET @sql := IF(@table_exists = 0,
  'CREATE TABLE StockCountRound (
     id INT AUTO_INCREMENT PRIMARY KEY,
     warehouseId INT NOT NULL,
     createdById INT NOT NULL,
     assignedToId INT NOT NULL,
     approvedById INT NULL,
     status VARCHAR(191) NOT NULL DEFAULT ''counting'',
     countedAt DATETIME(3) NULL,
     approvedAt DATETIME(3) NULL,
     appliedAt DATETIME(3) NULL,
     note TEXT NULL,
     createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
     updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
     INDEX StockCountRound_warehouseId_idx (warehouseId),
     INDEX StockCountRound_status_idx (status),
     CONSTRAINT StockCountRound_warehouseId_fkey FOREIGN KEY (warehouseId) REFERENCES Warehouse(id) ON DELETE RESTRICT ON UPDATE CASCADE,
     CONSTRAINT StockCountRound_createdById_fkey FOREIGN KEY (createdById) REFERENCES User(id) ON DELETE RESTRICT ON UPDATE CASCADE,
     CONSTRAINT StockCountRound_assignedToId_fkey FOREIGN KEY (assignedToId) REFERENCES User(id) ON DELETE RESTRICT ON UPDATE CASCADE,
     CONSTRAINT StockCountRound_approvedById_fkey FOREIGN KEY (approvedById) REFERENCES User(id) ON DELETE SET NULL ON UPDATE CASCADE
   ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
  'SELECT ''StockCountRound already exists'' AS note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @table_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'StockCountLine'
);
SET @sql := IF(@table_exists = 0,
  'CREATE TABLE StockCountLine (
     id INT AUTO_INCREMENT PRIMARY KEY,
     roundId INT NOT NULL,
     itemId INT NOT NULL,
     systemQuantity INT NOT NULL,
     countedQuantity INT NULL,
     variance INT NULL,
     note TEXT NULL,
     createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
     updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
     UNIQUE INDEX StockCountLine_roundId_itemId_key (roundId, itemId),
     INDEX StockCountLine_itemId_idx (itemId),
     CONSTRAINT StockCountLine_roundId_fkey FOREIGN KEY (roundId) REFERENCES StockCountRound(id) ON DELETE CASCADE ON UPDATE CASCADE,
     CONSTRAINT StockCountLine_itemId_fkey FOREIGN KEY (itemId) REFERENCES InventoryItem(id) ON DELETE RESTRICT ON UPDATE CASCADE
   ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
  'SELECT ''StockCountLine already exists'' AS note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
