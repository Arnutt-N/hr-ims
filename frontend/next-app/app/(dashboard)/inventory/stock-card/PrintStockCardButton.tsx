'use client';

export function PrintStockCardButton() {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            className="no-print rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
            พิมพ์บัตรคุมวัสดุ
        </button>
    );
}
