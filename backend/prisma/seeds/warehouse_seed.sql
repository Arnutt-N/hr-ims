-- Seed Script: Create Initial Warehouses and Migrate Stock

-- 1. Create Central Warehouse (คลังกลาง)
INSERT INTO Warehouse (name, code, type, isActive, createdAt, updatedAt)
VALUES ('คลังกลาง - กองบริหารการคลัง', 'WH-CENTRAL', 'central', 1, datetime('now'), datetime('now'));

-- 2. Create IT Warehouse (คลัง IT)
INSERT INTO Warehouse (name, code, type, isActive, createdAt, updatedAt)
VALUES ('คลังอุปกรณ์ไอที - ศูนย์เทคโนโลยีฯ', 'WH-IT', 'central', 1, datetime('now'), datetime('now'));

-- 3. Migrate Existing Stock to Central Warehouse
-- Copy all existing item stock to StockLevel table under Central warehouse
INSERT INTO StockLevel (warehouseId, itemId, quantity, updatedAt)
SELECT 
    1 AS warehouseId,  -- ID ของคลังกลาง
    id AS itemId,
    stock AS quantity,
    datetime('now') AS updatedAt
FROM InventoryItem
WHERE stock > 0;

-- Optional: Set minStock threshold for all items (10% of current stock)
UPDATE StockLevel
SET minStock = CAST(quantity * 0.1 AS INTEGER)
WHERE quantity > 10;
