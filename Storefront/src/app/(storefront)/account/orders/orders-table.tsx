'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Price } from '@/components/commerce/price';
import { OrderStatusBadge } from '@/components/commerce/order-status-badge';
import { formatDate } from '@/lib/format';

interface Order {
    id: string;
    code: string;
    state: string;
    totalWithTax: number;
    currencyCode: string;
    createdAt: string;
    lines: { id: string }[];
}

interface OrdersTableProps {
    orders: Order[];
    totalPages: number;
    currentPage: number;
}

export function OrdersTable({ orders, totalPages, currentPage }: OrdersTableProps) {
    if (orders.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Vous n&apos;avez pas encore passé de commande.</p>
            </div>
        );
    }

    return (
        <>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead>Numéro de commande</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Articles</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium">
                                    <Link
                                        href={`/account/orders/${order.code}`}
                                        className="inline-flex items-center gap-2 border rounded-md px-3 py-1.5 text-sm font-medium bg-background shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                                    >
                                        {order.code} <ArrowRightIcon className="h-4 w-4" />
                                    </Link>
                                </TableCell>
                                <TableCell>{formatDate(order.createdAt)}</TableCell>
                                <TableCell>
                                    <OrderStatusBadge state={order.state} />
                                </TableCell>
                                <TableCell>
                                    {order.lines.length}{' '}
                                    {order.lines.length === 1 ? 'article' : 'articles'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Price value={order.totalWithTax} currencyCode={order.currencyCode} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="mt-6">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href={
                                        currentPage > 1
                                            ? `/account/orders?page=${currentPage - 1}`
                                            : '#'
                                    }
                                    className={
                                        currentPage === 1
                                            ? 'pointer-events-none opacity-50'
                                            : ''
                                    }
                                />
                            </PaginationItem>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                if (
                                    page === 1 ||
                                    page === totalPages ||
                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                ) {
                                    return (
                                        <PaginationItem key={page}>
                                            <PaginationLink
                                                href={`/account/orders?page=${page}`}
                                                isActive={page === currentPage}
                                            >
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                } else if (
                                    page === currentPage - 2 ||
                                    page === currentPage + 2
                                ) {
                                    return (
                                        <PaginationItem key={page}>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    );
                                }
                                return null;
                            })}

                            <PaginationItem>
                                <PaginationNext
                                    href={
                                        currentPage < totalPages
                                            ? `/account/orders?page=${currentPage + 1}`
                                            : '#'
                                    }
                                    className={
                                        currentPage === totalPages
                                            ? 'pointer-events-none opacity-50'
                                            : ''
                                    }
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </>
    );
}
