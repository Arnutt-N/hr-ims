import { MeiliSearch } from 'meilisearch';

const MEILI_HOST = process.env.NEXT_PUBLIC_MEILI_HOST || 'http://localhost:7700';
// Only use search key on the frontend ideally.
// For development, we'll use the master key if we don't have a search key.
const MEILI_SEARCH_KEY = process.env.NEXT_PUBLIC_MEILI_SEARCH_KEY || 'hr-ims-dev-key';

export const meiliClient = new MeiliSearch({
    host: MEILI_HOST,
    apiKey: MEILI_SEARCH_KEY,
});

export const INVENTORY_INDEX = 'inventory';

/**
 * Perform a full-text search on inventory items
 * @param query The search text
 * @returns Array of item IDs that match the query
 */
export async function searchInventoryItems(query: string): Promise<number[]> {
    if (!query) return [];

    try {
        // Perform search and request only 'id' to save bandwidth
        const searchResult = await meiliClient.index(INVENTORY_INDEX).search(query, {
            attributesToRetrieve: ['id'],
            limit: 100, // Reasonable cap for search
        });

        return searchResult.hits.map(hit => hit.id as number);
    } catch (error) {
        console.error('Meilisearch query failed:', error);
        // Fallback to empty array if Meilisearch is down
        return [];
    }
}
