'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, Search, Folder, FolderOpen } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CollectionNode {
    id: string;
    name: string;
    slug: string;
    children?: CollectionNode[];
}

interface CategoryCheckboxTreeProps {
    collectionTree: CollectionNode[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}

export default function CategoryCheckboxTree({
    collectionTree,
    selectedIds,
    onChange,
}: CategoryCheckboxTreeProps) {
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');

    const toggleExpand = (id: string) => {
        setExpandedIds((prev: Record<string, boolean>) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCheckboxChange = (id: string, checked: boolean) => {
        if (checked) {
            onChange([...selectedIds, id]);
        } else {
            onChange(selectedIds.filter((x) => x !== id));
        }
    };

    // Helper to determine if a node or any of its descendants matches search
    const matchesSearch = (node: CollectionNode, query: string): boolean => {
        if (!query) return true;
        const normalizedQuery = query.toLowerCase();
        if (node.name.toLowerCase().includes(normalizedQuery)) return true;
        if (node.children) {
            return node.children.some((child) => matchesSearch(child, query));
        }
        return false;
    };

    // Recursively expand all nodes that have children matching search
    const handleExpandAllMatching = (nodes: CollectionNode[], query: string, acc: Record<string, boolean> = {}): Record<string, boolean> => {
        if (!query) return {};
        for (const node of nodes) {
            if (node.children && node.children.length > 0) {
                const childMatches = node.children.some(child => matchesSearch(child, query));
                if (childMatches) {
                    acc[node.id] = true;
                    handleExpandAllMatching(node.children, query, acc);
                }
            }
        }
        return acc;
    };

    // Auto-expand parents matching search
    useEffect(() => {
        if (searchQuery) {
            const newExpanded = handleExpandAllMatching(collectionTree, searchQuery);
            setExpandedIds((prev: Record<string, boolean>) => {
                const hasNew = Object.keys(newExpanded).some(k => !prev[k]);
                if (hasNew) {
                    return { ...prev, ...newExpanded };
                }
                return prev;
            });
        }
    }, [searchQuery, collectionTree]);

    const expandAll = () => {
        const acc: Record<string, boolean> = {};
        const recurse = (nodes: CollectionNode[]) => {
            for (const node of nodes) {
                if (node.children && node.children.length > 0) {
                    acc[node.id] = true;
                    recurse(node.children);
                }
            }
        };
        recurse(collectionTree);
        setExpandedIds(acc);
    };

    const collapseAll = () => {
        setExpandedIds({});
    };

    // Render tree node recursively
    const renderNode = (node: CollectionNode, depth = 0) => {
        if (searchQuery && !matchesSearch(node, searchQuery)) {
            return null;
        }

        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = !!expandedIds[node.id];
        const isChecked = selectedIds.includes(node.id);

        return (
            <div key={node.id} className="select-none">
                <div 
                    className="flex items-center gap-2 py-1.5 px-2 hover:bg-muted/40 rounded-lg transition-colors cursor-pointer group"
                    style={{ paddingLeft: `${Math.max(8, depth * 24)}px` }}
                >
                    {/* Expand/Collapse Chevron */}
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                toggleExpand(node.id);
                            }}
                            className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors flex items-center justify-center shrink-0 w-6 h-6"
                        >
                            {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                            ) : (
                                <ChevronRight className="w-4 h-4" />
                            )}
                        </button>
                    ) : (
                        <div className="w-6 shrink-0" /> // spacer
                    )}

                    {/* Checkbox */}
                    <Checkbox
                        id={`category-${node.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked: boolean | 'indeterminate') => handleCheckboxChange(node.id, checked === true)}
                        className="rounded border-muted-foreground/30 focus-visible:ring-primary/20 shrink-0"
                    />

                    {/* Label/Icon */}
                    <label
                        htmlFor={`category-${node.id}`}
                        className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer flex-grow py-0.5"
                    >
                        {hasChildren ? (
                            isExpanded ? (
                                <FolderOpen className="w-4 h-4 text-primary/70 shrink-0" />
                            ) : (
                                <Folder className="w-4 h-4 text-primary/70 shrink-0" />
                            )
                        ) : (
                            <Folder className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                        )}
                        <span className={isChecked ? 'font-bold text-primary' : ''}>
                            {node.name}
                        </span>
                    </label>
                </div>

                {/* Children */}
                {hasChildren && isExpanded && (
                    <div className="mt-0.5 border-l border-border/50 ml-5 pl-1 transition-all duration-300">
                        {node.children!.map((child) => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-3 border border-border bg-card rounded-xl p-4 shadow-sm">
            {/* Header controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Rechercher une catégorie..."
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-lg"
                    />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={expandAll}
                        className="h-9 px-3 text-[10px] uppercase font-bold tracking-wider"
                    >
                        Tout dérouler
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={collapseAll}
                        className="h-9 px-3 text-[10px] uppercase font-bold tracking-wider"
                    >
                        Tout replier
                    </Button>
                </div>
            </div>

            {/* Tree Container */}
            <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1 divide-y divide-border/20 border-t pt-2 mt-2">
                {collectionTree.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Aucune catégorie disponible</p>
                ) : (
                    collectionTree.map((node) => renderNode(node, 0))
                )}
            </div>
            
            {/* Summary of selections */}
            {selectedIds.length > 0 && (
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold border-t pt-2.5 flex items-center justify-between">
                    <span>{selectedIds.length} catégorie(s) sélectionnée(s)</span>
                    <button
                        type="button"
                        onClick={() => onChange([])}
                        className="text-destructive hover:underline font-extrabold"
                    >
                        Tout décocher
                    </button>
                </div>
            )}
        </div>
    );
}
