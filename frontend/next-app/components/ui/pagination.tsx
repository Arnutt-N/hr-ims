'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

export default function Pagination({ totalPages }: { totalPages: number }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { replace } = useRouter();
    const currentPage = Number(searchParams.get('page')) || 1;

    const createPageURL = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', pageNumber.toString());
        return `${pathname}?${params.toString()}`;
    };

    const handlePageChange = (page: number) => {
        replace(createPageURL(page));
    }

    return (
        <div className="flex w-full justify-center gap-2 mt-4">
            <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
            >
                <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <div className="flex items-center text-sm font-medium">
                Page {currentPage} of {totalPages}
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
            >
                Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
    );
}
