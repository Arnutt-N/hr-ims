-- Will fail if StockLevel.reserved does not exist
-- Will fail if RolePermission.roleId index is missing (forces index use)
SELECT SUM(reserved) AS total_reserved FROM StockLevel;
SELECT COUNT(*) AS rolepermission_count FROM RolePermission FORCE INDEX (RolePermission_roleId_idx);
