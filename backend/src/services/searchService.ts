import { MeiliSearch } from 'meilisearch';
import { logError, logInfo } from '../utils/logger';

const MEILI_HOST = process.env.MEILI_HOST || 'http://localhost:7700';
const MEILI_MASTER_KEY = process.env.MEILI_MASTER_KEY || 'hr-ims-dev-key';

export const meiliClient = new MeiliSearch({
    host: MEILI_HOST,
    apiKey: MEILI_MASTER_KEY,
});

const INVENTORY_INDEX = 'inventory';

/**
 * Sync an item to Meilisearch
 */
export async function syncItemToMeilisearch(item: any) {
    try {
        await meiliClient.index(INVENTORY_INDEX).addDocuments([{
            id: item.id,
            name: item.name,
            category: item.category,
            type: item.type,
            serial: item.serial,
            status: item.status,
            repairNotes: item.repairNotes
        }]);
    } catch (error) {
        logError('Failed to sync item to Meilisearch', error);
    }
}

/**
 * Remove an item from Meilisearch
 */
export async function removeItemFromMeilisearch(id: number) {
    try {
        await meiliClient.index(INVENTORY_INDEX).deleteDocument(id);
    } catch (error) {
        logError('Failed to remove item from Meilisearch', error);
    }
}
