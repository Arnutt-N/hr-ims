-- CreateTable: Warehouse
CREATE TABLE IF NOT EXISTS "Warehouse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL UNIQUE,
    "type" TEXT NOT NULL,
    "divisionId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable: StockLevel
CREATE TABLE IF NOT EXISTS "StockLevel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "warehouseId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER,
    "maxStock" INTEGER,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE,
    FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE,
    UNIQUE("warehouseId", "itemId")
);

-- CreateTable: StockTransfer
CREATE TABLE IF NOT EXISTS "StockTransfer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fromWarehouseId" INTEGER NOT NULL,
    "toWarehouseId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" INTEGER NOT NULL,
    "approvedBy" INTEGER,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id"),
    FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id"),
    FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id")
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS "StockLevel_warehouseId_idx" ON "StockLevel"("warehouseId");
CREATE INDEX IF NOT EXISTS "StockLevel_itemId_idx" ON "StockLevel"("itemId");
CREATE INDEX IF NOT EXISTS "StockTransfer_status_idx" ON "StockTransfer"("status");
