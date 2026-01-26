'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import DeleteMappingButton from './DeleteMappingButton';

interface MappingClientProps {
    initialMappings: any[];
}

const ITEMS_PER_PAGE = 10;

export default function MappingClient({ initialMappings }: MappingClientProps) {
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const filteredMappings = useMemo(() => {
        const query = search.toLowerCase().trim();
        if (!query) return initialMappings;
        return initialMappings.filter(m =>
            m.department.toLowerCase().includes(query) ||
            m.warehouse.name.toLowerCase().includes(query)
        );
    }, [initialMappings, search]);

    // Pagination
    const totalPages = Math.ceil(filteredMappings.length / ITEMS_PER_PAGE);
    const paginatedMappings = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredMappings.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredMappings, currentPage]);

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-indigo-500" />
                            Active Mappings
                        </CardTitle>
                        <CardDescription>
                            Users from these departments will automatically be assigned to the corresponding warehouse.
                        </CardDescription>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search mappings..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {paginatedMappings.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        {search ? (
                            <div className="flex flex-col items-center gap-2">
                                <Search className="h-8 w-8 text-slate-300" />
                                <p>No mappings found matching "{search}"</p>
                                <Button variant="link" onClick={() => setSearch('')}>Clear search</Button>
                            </div>
                        ) : (
                            "No mappings configured yet."
                        )}
                    </div>
                ) : (
                    <>
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Default Warehouse</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedMappings.map((mapping: any) => (
                                        <TableRow key={mapping.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-slate-400" />
                                                    {mapping.department}
                                                </div>
                                            </TableCell>
                                            <TableCell>{mapping.warehouse.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DeleteMappingButton id={mapping.id} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 px-2">
                                <p className="text-sm text-slate-500">
                                    Page {currentPage} of {totalPages}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
