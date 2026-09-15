import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GET_COLLECTIONS, GET_CMS_COLLECTIONS_TREE, GET_FACETS } from './queries';
import { 
  ahizanAi, 
  ProductApprovalAnalysis, 
  ProposedOfficialProduct, 
  SuggestedOfficialImage,
  TechnicalSpec,
  OptionGroupSuggestion,
  VariantSuggestion,
  DetectedContradiction,
  HypothesisProposal
} from './ahizan-ai-client';

async function fetchGraphQL(query: string, variables?: any) {
  const res = await fetch('/admin-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

export interface CollectionTreeNode {
  id: string;
  name: string;
  slug?: string;
  children?: CollectionTreeNode[];
}

export interface AIProductAssistantModalProps {
  productId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onApplySuggestions: (data: {
    title: string;
    shortDescription: string;
    description: string;
    seoTitle: string;
    seoDescription: string;
    collectionId?: string;
    collectionIds?: string[];
    selectedImages: SuggestedOfficialImage[];
    specs: TechnicalSpec[];
    facetValueIds?: string[];
    optionGroups?: OptionGroupSuggestion[];
    selectedVariants?: VariantSuggestion[];
    isSpamRejection?: boolean;
    rejectionReason?: string;
    targetProductIdToRegraft?: string;
  }) => void;
}

// ── COMPOSANT ARBRE DE CATÉGORIES AVEC MULTI-SÉLECTION ──
function CategoryTreeSelector({
  collectionTree,
  selectedIds = [],
  onToggle,
  onRemove,
  onClearAll,
  aiSuggestedName
}: {
  collectionTree: CollectionTreeNode[];
  selectedIds: string[];
  onToggle: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  aiSuggestedName?: string;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Trouver récursivement les ancêtres pour auto-déplier l'arbre sur les catégories sélectionnées
  const getAncestorIds = (nodes: CollectionTreeNode[], targetId: string, path: string[] = []): string[] | null => {
    for (const node of nodes) {
      if (String(node.id) === String(targetId)) return path;
      if (node.children && node.children.length > 0) {
        const sub = getAncestorIds(node.children, targetId, [...path, node.id]);
        if (sub) return sub;
      }
    }
    return null;
  };

  // Trouver un nœud par ID
  const findNodeById = (nodes: CollectionTreeNode[], id?: string): CollectionTreeNode | null => {
    if (!id) return null;
    for (const node of nodes) {
      if (String(node.id) === String(id)) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedNodes = useMemo(() => {
    return selectedIds.map(id => findNodeById(collectionTree, id)).filter(Boolean) as CollectionTreeNode[];
  }, [collectionTree, selectedIds]);

  // Déplier automatiquement vers les catégories actives
  useEffect(() => {
    if (selectedIds.length > 0 && collectionTree.length > 0) {
      const allAncestors: string[] = [];
      for (const selId of selectedIds) {
        const anc = getAncestorIds(collectionTree, selId);
        if (anc) allAncestors.push(...anc);
      }
      if (allAncestors.length > 0) {
        setExpandedIds(prev => {
          const next = { ...prev };
          allAncestors.forEach(id => { next[id] = true; });
          return next;
        });
      }
    }
  }, [selectedIds, collectionTree]);

  const matchesSearch = (node: CollectionTreeNode, query: string): boolean => {
    if (!query) return true;
    const q = query.toLowerCase();
    if (node.name.toLowerCase().includes(q)) return true;
    if (node.children) return node.children.some(child => matchesSearch(child, query));
    return false;
  };

  const expandAll = () => {
    const acc: Record<string, boolean> = {};
    const recurse = (nodes: CollectionTreeNode[]) => {
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

  const collapseAll = () => setExpandedIds({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (node: CollectionTreeNode, depth = 0) => {
    if (searchQuery && !matchesSearch(node, searchQuery)) return null;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = !!expandedIds[node.id];
    const isChecked = selectedIds.includes(String(node.id));

    return (
      <div key={node.id} style={{ userSelect: 'none' }}>
        <div
          onClick={() => onToggle(node.id, node.name)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px',
            paddingLeft: `${Math.max(8, depth * 22)}px`,
            borderRadius: '8px',
            background: isChecked ? '#ecfdf5' : 'transparent',
            border: isChecked ? '1px solid #a7f3d0' : '1px solid transparent',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
            margin: '2px 0'
          }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => toggleExpand(node.id, e)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '2px 4px',
                cursor: 'pointer',
                fontSize: '11px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <div style={{ width: '16px' }} />
          )}

          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => onToggle(node.id, node.name)}
            style={{ cursor: 'pointer', accentColor: '#16a34a' }}
          />

          <span style={{ fontSize: '14px' }}>
            {hasChildren ? (isExpanded ? '📂' : '📁') : '🏷️'}
          </span>

          <span style={{
            fontSize: '12px',
            fontWeight: isChecked ? 800 : 500,
            color: isChecked ? '#065f46' : '#1e293b'
          }}>
            {node.name}
          </span>

          {isChecked && (
            <span style={{
              marginLeft: 'auto',
              fontSize: '10px',
              background: '#059669',
              color: '#ffffff',
              padding: '2px 6px',
              borderRadius: '6px',
              fontWeight: 800
            }}>
              Sélectionnée
            </span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div style={{ marginLeft: '12px', borderLeft: '1px solid #e2e8f0', paddingLeft: '4px' }}>
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>📁</span>
          <label style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
            Catégories / Collections Officielles (Multi-choix possible)
          </label>
        </div>
        {aiSuggestedName && (
          <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
            ✨ IA Détectée : {aiSuggestedName}
          </span>
        )}
      </div>

      {/* Selected Categories Highlight Banner with Tags */}
      <div style={{
        background: selectedNodes.length > 0 ? '#f0fdf4' : '#fffbeb',
        border: selectedNodes.length > 0 ? '1px solid #bbf7d0' : '1px solid #fde68a',
        borderRadius: '10px',
        padding: '10px 14px',
        marginBottom: '12px'
      }}>
        <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: selectedNodes.length > 0 ? '#166534' : '#92400e', marginBottom: '6px' }}>
          {selectedNodes.length > 0 ? `${selectedNodes.length} Collection(s) Assignée(s) à la Fiche :` : '⚠️ Aucune collection sélectionnée'}
        </div>
        
        {selectedNodes.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            {selectedNodes.map(node => (
              <span
                key={node.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  color: '#166534',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                <span>📁 {node.name} (ID: #{node.id})</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(node.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#dc2626',
                    fontWeight: 900,
                    padding: 0,
                    marginLeft: '2px',
                    fontSize: '13px'
                  }}
                  title="Retirer cette catégorie"
                >
                  ✕
                </button>
              </span>
            ))}

            {selectedNodes.length > 1 && (
              <button
                type="button"
                onClick={onClearAll}
                style={{
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#b91c1c',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Tout désélectionner
              </button>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>
            Veuillez cocher une ou plusieurs collections dans l'arborescence ci-dessous.
          </div>
        )}
      </div>

      {/* Search & Actions Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <input
            type="text"
            placeholder="🔍 Rechercher une catégorie..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <button
          type="button"
          onClick={expandAll}
          style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Tout déplier
        </button>
        <button
          type="button"
          onClick={collapseAll}
          style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Tout replier
        </button>
      </div>

      {/* Tree View Container */}
      <div style={{
        maxHeight: '220px',
        overflowY: 'auto',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '8px',
        background: '#f8fafc'
      }}>
        {collectionTree.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
            Chargement de l'arbre des catégories...
          </div>
        ) : (
          collectionTree.map(node => renderNode(node, 0))
        )}
      </div>
    </div>
  );
}

export function AIProductAssistantModal({
  productId,
  isOpen,
  onClose,
  onApplySuggestions,
}: AIProductAssistantModalProps) {
  if (!isOpen || !productId) return null;

  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<ProductApprovalAnalysis | null>(null);
  const [proposal, setProposal] = useState<ProposedOfficialProduct | null>(null);
  const [selectedHypothesisId, setSelectedHypothesisId] = useState<'VISUAL_TRUTH' | 'SELLER_CLAIM' | 'RAW' | 'CUSTOM'>('VISUAL_TRUTH');
  const [customPromptInput, setCustomPromptInput] = useState('');
  const [isSwitchingHypothesis, setIsSwitchingHypothesis] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [primaryImageId, setPrimaryImageId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'images' | 'audit'>('overview');
  const [collectionTree, setCollectionTree] = useState<CollectionTreeNode[]>([]);
  const [availableCollections, setAvailableCollections] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [availableFacets, setAvailableFacets] = useState<Array<any>>([]);
  const [selectedFacetValueIds, setSelectedFacetValueIds] = useState<Set<string>>(new Set());
  const [facetSearchTerm, setFacetSearchTerm] = useState('');
  const [collapsedFacetGroupIds, setCollapsedFacetGroupIds] = useState<Set<string>>(new Set());
  const [descViewMode, setDescViewMode] = useState<'preview' | 'html'>('preview');
  const [regeneratingField, setRegeneratingField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Charger l'arbre des collections (CMS Tree) avec fallback sur collections plates
  useEffect(() => {
    fetchGraphQL(GET_CMS_COLLECTIONS_TREE)
      .then(res => {
        if (res?.cmsCollectionsTree && res.cmsCollectionsTree.length > 0) {
          setCollectionTree(res.cmsCollectionsTree);
        } else {
          // Fallback sur GET_COLLECTIONS
          return fetchGraphQL(GET_COLLECTIONS, { options: { take: 200 } });
        }
      })
      .then(res2 => {
        if (res2?.collections?.items) {
          const items = res2.collections.items;
          setAvailableCollections(items);
          if (collectionTree.length === 0) {
            setCollectionTree(items.map((it: any) => ({ id: it.id, name: it.name, slug: it.slug })));
          }
        }
      })
      .catch(e => console.warn('Failed to load collections tree in AI modal', e));

    fetchGraphQL(GET_FACETS, { options: { take: 100 } })
      .then(res => {
        if (res?.facets?.items) {
          setAvailableFacets(res.facets.items);
        }
      })
      .catch(e => console.warn('Failed to load facets in AI modal', e));
  }, []);

  // Recherche récursive d'une collection par nom
  const findCollectionByName = (nodes: CollectionTreeNode[], name: string): CollectionTreeNode | null => {
    const q = name.toLowerCase().trim();
    for (const node of nodes) {
      if (node.name.toLowerCase().includes(q) || q.includes(node.name.toLowerCase())) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = findCollectionByName(node.children, name);
        if (found) return found;
      }
    }
    return null;
  };

  // Résolution et sélection automatique de la collection dès que l'arbre est chargé
  useEffect(() => {
    if (proposal && collectionTree.length > 0) {
      if ((!proposal.collectionId || selectedCollectionIds.length === 0) && proposal.categoryName) {
        const match = findCollectionByName(collectionTree, proposal.categoryName);
        if (match) {
          setProposal(prev => prev ? { ...prev, collectionId: match.id, categoryName: match.name } : null);
          setSelectedCollectionIds(prev => prev.includes(match.id) ? prev : [match.id, ...prev]);
        }
      }
    }
  }, [collectionTree, proposal?.categoryName, proposal?.collectionId]);

  // Auto-association des facettes plateforme correspondantes aux specs IA
  const matchFacetValues = (prop: ProposedOfficialProduct, facetsList: any[]) => {
    if (!facetsList || facetsList.length === 0) return;
    const newFacetIds = new Set<string>();
    const brandLower = (prop.brand || '').toLowerCase().trim();
    const specs = prop.technicalSpecs || [];

    for (const facet of facetsList) {
      for (const fv of facet.values || []) {
        const fvNameLower = (fv.name || '').toLowerCase().trim();
        if (brandLower && fvNameLower === brandLower) {
          newFacetIds.add(fv.id);
        }
        for (const sp of specs) {
          const valLower = (sp.value || '').toLowerCase().trim();
          if (valLower && (valLower === fvNameLower || fvNameLower.includes(valLower) || valLower.includes(fvNameLower))) {
            newFacetIds.add(fv.id);
          }
        }
      }
    }
    if (newFacetIds.size > 0) {
      setSelectedFacetValueIds(prev => {
        const merged = new Set(prev);
        newFacetIds.forEach(id => merged.add(id));
        return merged;
      });
    }
  };

  const applyProposalToState = (prop: ProposedOfficialProduct) => {
    let updatedProp = { ...prop };
    // Si l'IA n'a pas mis d'ID mais un nom de catégorie, on résout l'ID immédiatement
    if (!updatedProp.collectionId && updatedProp.categoryName && collectionTree.length > 0) {
      const match = findCollectionByName(collectionTree, updatedProp.categoryName);
      if (match) {
        updatedProp.collectionId = match.id;
      }
    }
    setProposal(updatedProp);
    if (updatedProp.collectionId) {
      setSelectedCollectionIds(prev => prev.includes(updatedProp.collectionId!) ? prev : [updatedProp.collectionId!]);
    }
    if (availableFacets.length > 0) {
      matchFacetValues(updatedProp, availableFacets);
    }
    if (Array.isArray(updatedProp?.suggestedOfficialImages)) {
      const initialSelected = new Set(updatedProp.suggestedOfficialImages.map((img: SuggestedOfficialImage) => img.id));
      setSelectedImageIds(initialSelected);
      const primary = updatedProp.suggestedOfficialImages.find((img: SuggestedOfficialImage) => img.isPrimary) || updatedProp.suggestedOfficialImages[0];
      if (primary) setPrimaryImageId(primary.id);
    }
  };

  const handleToggleCollection = (id: string, name: string) => {
    setSelectedCollectionIds(prev => {
      const isAlready = prev.includes(id);
      const next = isAlready ? prev.filter(x => x !== id) : [...prev, id];
      if (proposal) {
        setProposal({
          ...proposal,
          collectionId: next[0] || undefined,
          categoryName: isAlready ? (next.length > 0 ? proposal.categoryName : undefined) : name
        });
      }
      return next;
    });
  };

  const handleRemoveCollection = (id: string) => {
    setSelectedCollectionIds(prev => {
      const next = prev.filter(x => x !== id);
      if (proposal) {
        setProposal({ ...proposal, collectionId: next[0] || undefined });
      }
      return next;
    });
  };

  const handleClearAllCollections = () => {
    setSelectedCollectionIds([]);
    if (proposal) {
      setProposal({ ...proposal, collectionId: undefined });
    }
  };

  const toggleFacetGroup = (id: string) => {
    setCollapsedFacetGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllFacetGroups = () => setCollapsedFacetGroupIds(new Set());

  const collapseAllFacetGroups = () => {
    const all = new Set(availableFacets.map(f => String(f.id)));
    setCollapsedFacetGroupIds(all);
  };

  const toggleFacetValue = (fvId: string) => {
    setSelectedFacetValueIds(prev => {
      const next = new Set(prev);
      if (next.has(fvId)) next.delete(fvId);
      else next.add(fvId);
      return next;
    });
  };

  // Chargement de l'analyse IA au montage
  useEffect(() => {
    if (!productId || !isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    ahizanAi.analyzeProductApproval(productId)
      .then(res => {
        if (!isMounted) return;
        setAnalysis(res);
        if (res.proposals && res.proposals.VISUAL_TRUTH) {
          applyProposalToState(res.proposals.VISUAL_TRUTH);
          setSelectedHypothesisId('VISUAL_TRUTH');
        } else if (res.proposedOfficialProduct) {
          applyProposalToState(res.proposedOfficialProduct);
        }
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Error fetching AI analysis:', err);
        setError(err.message || 'Impossible de générer l\'analyse Copilot IA');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [productId, isOpen]);

  // Bascule d'hypothèse
  const handleSelectHypothesis = async (hypId: 'VISUAL_TRUTH' | 'SELLER_CLAIM' | 'RAW' | 'CUSTOM') => {
    if (!analysis || hypId === selectedHypothesisId) return;

    setSelectedHypothesisId(hypId);

    if (hypId === 'CUSTOM') {
      return; // Attente de la saisie utilisateur
    }

    if (analysis.proposals && analysis.proposals[hypId]) {
      applyProposalToState(analysis.proposals[hypId]!);
      return;
    }

    setIsSwitchingHypothesis(true);
    try {
      const res = await ahizanAi.reanalyzeHypothesis(productId, hypId);
      applyProposalToState(res);
    } catch (err: any) {
      alert('Erreur lors du calcul de l\'hypothèse : ' + err.message);
    } finally {
      setIsSwitchingHypothesis(false);
    }
  };

  const handleCustomRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPromptInput.trim()) return;
    setSelectedHypothesisId('CUSTOM');
    setIsSwitchingHypothesis(true);
    try {
      const res = await ahizanAi.products.analyze(productId, { forcedMode: 'CUSTOM', customQuery: customPromptInput.trim() });
      setAnalysis(res);
      if (res.proposedOfficialProduct) {
        applyProposalToState(res.proposedOfficialProduct);
      }
    } catch (err: any) {
      alert(`Erreur génération personnalisée : ${err.message}`);
    } finally {
      setIsSwitchingHypothesis(false);
    }
  };

  const handleRegenerate = async (fieldName: string) => {
    if (!proposal) return;
    setRegeneratingField(fieldName);
    try {
      const updated = await ahizanAi.regenerateField(productId, fieldName, proposal);
      setProposal(prev => {
        if (!prev) return null;
        const next = { ...prev, ...updated };
        if (fieldName === 'images' && Array.isArray(updated.suggestedOfficialImages)) {
          setSelectedImageIds(new Set(updated.suggestedOfficialImages.map((img: SuggestedOfficialImage) => img.id)));
          if (!primaryImageId && updated.suggestedOfficialImages.length > 0) {
            setPrimaryImageId(updated.suggestedOfficialImages[0].id);
          }
        }
        return next;
      });
    } catch (err: any) {
      alert(`Erreur régénération ${fieldName} : ${err.message}`);
    } finally {
      setRegeneratingField(null);
    }
  };

  const toggleImageSelection = (imgId: string) => {
    setSelectedImageIds(prev => {
      const next = new Set(prev);
      if (next.has(imgId)) next.delete(imgId);
      else next.add(imgId);
      return next;
    });
  };

  const setAsPrimaryImage = (imgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrimaryImageId(imgId);
    setSelectedImageIds(prev => new Set(prev).add(imgId));
  };

  const toggleVariantSelection = (index: number) => {
    setSelectedVariantIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const [isSaving, setIsSaving] = useState(false);

  // Sauvegarde principale (overrideRegraft: true = re-greffage forcé, false = sauvegarde officielle directe)
  const handleApply = async (overrideRegraft: boolean = false) => {
    if (!proposal) return;

    const selectedImages = (proposal.suggestedOfficialImages || [])
      .filter(img => selectedImageIds.has(img.id))
      .map(img => ({
        ...img,
        isPrimary: img.id === primaryImageId || img.isPrimary,
      }));

    setIsSaving(true);
    try {
      await onApplySuggestions({
        title: proposal.name,
        shortDescription: proposal.shortDescription,
        description: proposal.description || '',
        seoTitle: proposal.seoTitle,
        seoDescription: proposal.seoDescription,
        collectionId: selectedCollectionIds[0] || proposal.collectionId,
        collectionIds: selectedCollectionIds.length > 0 ? selectedCollectionIds : (proposal.collectionId ? [proposal.collectionId] : undefined),
        selectedImages,
        specs: proposal.technicalSpecs || [],
        facetValueIds: Array.from(selectedFacetValueIds),
        isSpamRejection: !proposal.isValidSubmission,
        rejectionReason: proposal.rejectionSuggestedMessage,
        targetProductIdToRegraft: (overrideRegraft && analysis?.duplicateMatch?.found) ? analysis.duplicateMatch.targetProductId : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getTruthColor = (score: number) => {
    if (score >= 80) return { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
    if (score >= 50) return { bg: '#fef9c3', text: '#a16207', border: '#fde047' };
    return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
  };

  const truthColor = getTruthColor(proposal?.truthScore || 0);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: '#f8fafc',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '1200px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          background: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 0 15px rgba(168, 85, 247, 0.4)'
            }}>
              ✨
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                  Copilote Ahizan AI — Audit & Normalisation
                </h3>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'rgba(99, 102, 241, 0.2)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  Catalogue Mutualisé
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Fiche Maître Universelle • Matrice Multi-Vendeurs • Packshots HD • Zéro Duplication
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#ffffff',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {isLoading && (
            <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', border: '4px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Analyse multimodale en cours...</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  L'IA inspecte les cartons, lit l'OCR, résout les contradictions et sélectionne la bonne catégorie.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', padding: '16px', color: '#991b1b', fontSize: '13px' }}>
              <strong>Erreur :</strong> {error}
            </div>
          )}

          {!isLoading && proposal && (
            <>
              {/* ── SECTION SÉLECTION D'HYPOTHÈSES / STYLES DE NORMALISATION ── */}
              <div style={{
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1px solid #fde68a',
                borderRadius: '16px',
                padding: '16px 20px',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)'
              }}>
                {analysis?.detectedContradictions && analysis.detectedContradictions.length > 0 ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '18px' }}>⚡</span>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#92400e' }}>
                        Contradiction Détectée entre l'Écrit du Vendeur et la Photo
                      </h4>
                    </div>

                    <div style={{ display: 'grid', gap: '8px', marginBottom: '14px' }}>
                      {analysis.detectedContradictions.map((c, idx) => (
                        <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.7)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: '#78350f', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                          <strong>[{c.field.toUpperCase()}]</strong> : Déclaré par le vendeur : <span style={{ color: '#dc2626', fontWeight: 700 }}>"{c.sellerValue}"</span> ⚡ Constaté sur photo : <span style={{ color: '#16a34a', fontWeight: 700 }}>"{c.visualValue}"</span>
                          <div style={{ fontSize: '11px', color: '#92400e', marginTop: '2px', fontStyle: 'italic' }}>{c.explanation}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>🧠</span>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#92400e' }}>
                          Style de Normalisation & Hypothèse Copilot IA
                        </h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#b45309' }}>
                          Choisissez si vous souhaitez prioriser l'inspection visuelle des photos, la déclaration écrite du vendeur ou les données brutes.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Boutons de sélection d'hypothèse */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => handleSelectHypothesis('VISUAL_TRUTH')}
                    disabled={isSwitchingHypothesis}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: selectedHypothesisId === 'VISUAL_TRUTH' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                      background: selectedHypothesisId === 'VISUAL_TRUTH' ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: selectedHypothesisId === 'VISUAL_TRUTH' ? '0 2px 6px rgba(22,163,74,0.2)' : 'none'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#166534' }}>🖼️ Hypothèse A : Vérité Visuelle & IA</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Titre riche normalisé d'après l'inspection des photos</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectHypothesis('SELLER_CLAIM')}
                    disabled={isSwitchingHypothesis}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: selectedHypothesisId === 'SELLER_CLAIM' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                      background: selectedHypothesisId === 'SELLER_CLAIM' ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: selectedHypothesisId === 'SELLER_CLAIM' ? '0 2px 6px rgba(59,130,246,0.2)' : 'none'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#1d4ed8' }}>📱 Hypothèse B : Déclaration Vendeur</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Basée sur le titre & description déclarés par le vendeur</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectHypothesis('RAW')}
                    disabled={isSwitchingHypothesis}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: selectedHypothesisId === 'RAW' ? '2px solid #64748b' : '1px solid #cbd5e1',
                      background: selectedHypothesisId === 'RAW' ? '#f1f5f9' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: selectedHypothesisId === 'RAW' ? '0 2px 6px rgba(100,116,139,0.2)' : 'none'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>📝 Hypothèse C : Choix Brut</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Conserve le texte brut soumis sans retouche</div>
                  </button>
                </div>

                {/* Saisie personnalisée */}
                <form onSubmit={handleCustomRegenerate} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Ou saisissez le produit exact (ex: Microphone à Condensateur Professionnel ZGEER NW-800)..."
                    value={customPromptInput}
                    onChange={e => setCustomPromptInput(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                  <button
                    type="submit"
                    disabled={isSwitchingHypothesis || !customPromptInput.trim()}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#d97706', color: '#ffffff', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    ⚡ Générer pour ce produit
                  </button>
                </form>
              </div>

              {/* ── BANNIÈRE SCORE QUALITÉ FQS & INSPECTION IA ÉPURÉE ── */}
              {(() => {
                const photosScore = Math.min(25, (proposal.suggestedOfficialImages?.length || 0) * 8);
                const textScore = (proposal.description ? 12 : 0) + (proposal.seoTitle ? 8 : 0);
                const variantsScore = Math.min(25, (proposal.variantsMatrix?.length || 0) * 10);
                const specsScore = Math.min(15, (proposal.technicalSpecs?.length || 0) * 3);
                const truthBonus = Math.round(((proposal.truthScore || 80) / 100) * 15);
                const totalFqs = Math.min(100, photosScore + textScore + variantsScore + specsScore + truthBonus);

                const getBadge = (s: number) => {
                  if (s >= 85) return { label: 'Excellent', color: '#16a34a', bg: '#dcfce7', border: '#86efac' };
                  if (s >= 70) return { label: 'Bon', color: '#2563eb', bg: '#dbeafe', border: '#93c5fd' };
                  if (s >= 50) return { label: 'Moyen', color: '#d97706', bg: '#fef3c7', border: '#fde68a' };
                  return { label: 'À compléter', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' };
                };
                const badge = getBadge(totalFqs);

                return (
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    {/* Top Row: Global FQS Score & Truth Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          background: badge.bg,
                          border: `1.5px solid ${badge.border}`,
                          color: badge.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: 900
                        }}>
                          {totalFqs}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                              Score FQS Fiche Officielle : <strong>{totalFqs}/100</strong>
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`
                            }}>
                              {badge.label}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            Évaluation de conformité marketplace Ahizan (Photos, Textes, Variantes, Attributs)
                          </span>
                        </div>
                      </div>

                      {/* Truth score chip */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: truthColor.bg,
                        border: `1px solid ${truthColor.border}`,
                        padding: '6px 14px',
                        borderRadius: '12px'
                      }}>
                        <span style={{ fontSize: '16px' }}>🎯</span>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: truthColor.text }}>
                            Taux de Vérité : {proposal.truthScore}%
                          </div>
                          <div style={{ fontSize: '10px', color: '#475569' }}>
                            {proposal.truthRationale}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: 4 Mini Progress Pillars */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '10px',
                      background: '#f8fafc',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid #f1f5f9'
                    }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          <span>📸 Photos HD</span>
                          <span>{photosScore}/25</span>
                        </div>
                        <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(photosScore / 25) * 100}%`, background: '#6366f1', borderRadius: '4px' }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          <span>📝 Textes & SEO</span>
                          <span>{textScore}/20</span>
                        </div>
                        <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(textScore / 20) * 100}%`, background: '#3b82f6', borderRadius: '4px' }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          <span>🔀 Déclinaisons</span>
                          <span>{variantsScore}/25</span>
                        </div>
                        <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(variantsScore / 25) * 100}%`, background: '#10b981', borderRadius: '4px' }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          <span>⚙️ Attributs</span>
                          <span>{specsScore}/15</span>
                        </div>
                        <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(specsScore / 15) * 100}%`, background: '#f59e0b', borderRadius: '4px' }} />
                        </div>
                      </div>
                    </div>

                    {proposal.visualOcrInsights?.readOcrText && (
                      <div style={{ fontSize: '11px', color: '#475569', background: '#eff6ff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                        🔍 <strong>OCR sur photo produit :</strong> <em>"{proposal.visualOcrInsights.readOcrText}"</em>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── TABS NAVIGATION ── */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: '8px' }}>
                {[
                  { id: 'overview', label: '📝 Fiche Maître & Textes', count: undefined },
                  { id: 'specs', label: '⚙️ Spécifications & Facettes', count: proposal.technicalSpecs?.length },
                  { id: 'images', label: '🖼️ Packshots HD Officiels', count: proposal.suggestedOfficialImages?.length },
                  { id: 'audit', label: '🛡️ Audit Qualité & Doublons', count: analysis?.duplicateMatch?.found ? 'Doublon' : undefined }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      padding: '10px 16px',
                      border: 'none',
                      borderBottom: activeTab === tab.id ? '3px solid #6366f1' : '3px solid transparent',
                      background: activeTab === tab.id ? '#0f172a' : 'transparent',
                      color: activeTab === tab.id ? '#ffffff' : '#64748b',
                      fontSize: '12px',
                      fontWeight: 800,
                      borderRadius: '8px 8px 0 0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span style={{
                        fontSize: '10px',
                        background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                        color: activeTab === tab.id ? '#ffffff' : '#475569',
                        padding: '2px 6px',
                        borderRadius: '10px'
                      }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── TAB 1 : FICHE PRODUIT MAÎTRE & CONTENU ÉDITORIAL ── */}
              {activeTab === 'overview' && (
                <div style={{ display: 'grid', gap: '14px' }}>
                  
                  {/* Titre Produit Maître Normalisé */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                          Nom Commercial du Produit Maître (Universel & Épuré)
                        </label>
                        <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                          Exemple : "Samsung Galaxy S8" (Ne pas inclure "Silver" ou "64 Go" dans le nom maître)
                        </span>
                      </div>
                      <button
                        onClick={() => handleRegenerate('title')}
                        disabled={regeneratingField === 'title'}
                        style={{ fontSize: '11px', background: '#ede9fe', color: '#6366f1', border: 'none', padding: '5px 10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {regeneratingField === 'title' ? '⏳...' : '🔄 Régénérer'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={proposal.name}
                      onChange={e => setProposal({ ...proposal, name: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 700, color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Marque & Modèle */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Marque Identifiée
                      </label>
                      <input
                        type="text"
                        value={proposal.brand}
                        onChange={e => setProposal({ ...proposal, brand: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Modèle / Gamme
                      </label>
                      <input
                        type="text"
                        value={proposal.model}
                        onChange={e => setProposal({ ...proposal, model: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  {/* ── SÉLECTEUR D'ARBRE DE CATÉGORIES AVEC MULTI-SÉLECTION ── */}
                  <CategoryTreeSelector
                    collectionTree={collectionTree}
                    selectedIds={selectedCollectionIds}
                    aiSuggestedName={proposal.categoryName}
                    onToggle={handleToggleCollection}
                    onRemove={handleRemoveCollection}
                    onClearAll={handleClearAllCollections}
                  />

                  {/* Description courte */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                        Description Courte (Accroche Marketing Marketplace)
                      </label>
                    </div>
                    <textarea
                      rows={2}
                      value={proposal.shortDescription}
                      onChange={e => setProposal({ ...proposal, shortDescription: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#334155', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>

                  {/* Description Longue HTML Complète */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                          Description Détaillée & Caractéristiques (HTML Riche)
                        </label>
                        <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                          Mise en valeur officielle : points forts, garantie Bénin, contenu de boîte.
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '2px' }}>
                          <button
                            type="button"
                            onClick={() => setDescViewMode('preview')}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              background: descViewMode === 'preview' ? '#ffffff' : 'transparent',
                              color: descViewMode === 'preview' ? '#0f172a' : '#64748b',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: descViewMode === 'preview' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                            }}
                          >
                            👁️ Aperçu Rendu
                          </button>
                          <button
                            type="button"
                            onClick={() => setDescViewMode('html')}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              background: descViewMode === 'html' ? '#ffffff' : 'transparent',
                              color: descViewMode === 'html' ? '#0f172a' : '#64748b',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: descViewMode === 'html' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                            }}
                          >
                            ✏️ Code HTML
                          </button>
                        </div>

                        <button
                          onClick={() => handleRegenerate('description')}
                          disabled={regeneratingField === 'description'}
                          style={{ fontSize: '11px', background: '#ede9fe', color: '#6366f1', border: 'none', padding: '5px 10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          {regeneratingField === 'description' ? '⏳...' : '🔄 Régénérer'}
                        </button>
                      </div>
                    </div>

                    {descViewMode === 'preview' ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: proposal.description || '<p style="color:#94a3b8">Aucune description saisie.</p>' }}
                        style={{
                          minHeight: '180px',
                          maxHeight: '340px',
                          overflowY: 'auto',
                          padding: '14px',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '13px',
                          lineHeight: '1.6',
                          color: '#334155'
                        }}
                      />
                    ) : (
                      <textarea
                        rows={10}
                        value={proposal.description}
                        onChange={e => setProposal({ ...proposal, description: e.target.value })}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'monospace', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                    )}
                  </div>

                  {/* Section Optimisation SEO Marketplace */}
                  <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '14px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>
                        🌐 Métadonnées SEO Marketplace (Google & Recherche Locale)
                      </label>
                      <button
                        onClick={() => handleRegenerate('seo')}
                        disabled={regeneratingField === 'seo'}
                        style={{ fontSize: '11px', background: '#ede9fe', color: '#6366f1', border: 'none', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {regeneratingField === 'seo' ? '⏳...' : '🔄 Régénérer'}
                      </button>
                    </div>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="Balise Title SEO (50-60 car.)..."
                        value={proposal.seoTitle}
                        onChange={e => setProposal({ ...proposal, seoTitle: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', color: '#0f172a', boxSizing: 'border-box' }}
                      />
                      <textarea
                        rows={2}
                        placeholder="Meta Description SEO (140-160 car.)..."
                        value={proposal.seoDescription}
                        onChange={e => setProposal({ ...proposal, seoDescription: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', color: '#334155', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>

                </div>
              )}



              {/* ── TAB 3 : PACKSHOTS HD OFFICIELS ── */}
              {activeTab === 'images' && (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                        Packshots HD & Visuels Officiels Suggérés
                      </h4>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                        Sélectionnez les images à associer au produit central Ahizan. Cliquez sur l'étoile pour définir l'image principale.
                      </p>
                    </div>
                    <button
                      onClick={() => handleRegenerate('images')}
                      disabled={regeneratingField === 'images'}
                      style={{ fontSize: '11px', background: '#ede9fe', color: '#6366f1', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {regeneratingField === 'images' ? '⏳...' : '🔄 Chercher Nouveaux Visuels'}
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                    {(proposal.suggestedOfficialImages || []).map(img => {
                      const isSelected = selectedImageIds.has(img.id);
                      const isPrimary = img.id === primaryImageId || img.isPrimary;
                      return (
                        <div
                          key={img.id}
                          onClick={() => toggleImageSelection(img.id)}
                          style={{
                            border: isSelected ? '2px solid #6366f1' : '1px solid #e2e8f0',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            position: 'relative',
                            cursor: 'pointer',
                            background: '#f8fafc',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', padding: '6px' }}>
                            <img src={img.previewUrl || img.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          </div>

                          <div style={{ padding: '6px 8px', fontSize: '10px', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                            <span style={{ truncate: true, maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {img.label || 'Packshot'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => setAsPrimaryImage(img.id, e)}
                              style={{
                                background: isPrimary ? '#fbbf24' : '#e2e8f0',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '2px 4px',
                                cursor: 'pointer',
                                fontSize: '10px'
                              }}
                              title="Définir comme image principale"
                            >
                              ⭐
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── TAB 4 : SPÉCIFICATIONS TECHNIQUES & FACETTES VENDURE AVEC RECHERCHE & ACCORDÉON ── */}
              {activeTab === 'specs' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  {/* Section Facettes Officielles Vendure */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                          🏷️ Facettes Marketplace (Filtres Storefront & Moteur de Recherche)
                        </h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                          Sélectionnez les valeurs de facettes officielles Vendure à associer à ce produit maître.
                        </p>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', border: '1px solid #bae6fd', padding: '4px 12px', borderRadius: '8px' }}>
                        {selectedFacetValueIds.size} facette(s) sélectionnée(s)
                      </span>
                    </div>

                    {/* Barre de Recherche & Contrôles d'Accordéon */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flexGrow: 1 }}>
                        <input
                          type="text"
                          placeholder="🔍 Rechercher une facette ou valeur (ex: Marque, Apple, RAM, Stockage, 8 Go)..."
                          value={facetSearchTerm}
                          onChange={e => setFacetSearchTerm(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            paddingRight: facetSearchTerm ? '30px' : '12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            boxSizing: 'border-box'
                          }}
                        />
                        {facetSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setFacetSearchTerm('')}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#64748b',
                              fontSize: '12px',
                              fontWeight: 900
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={expandAllFacetGroups}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Tout déplier
                      </button>
                      <button
                        type="button"
                        onClick={collapseAllFacetGroups}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Tout replier
                      </button>
                    </div>

                    {availableFacets.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                        Chargement des facettes de la marketplace...
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '14px' }}>
                        {availableFacets
                          .map((facet: any) => {
                            const term = facetSearchTerm.toLowerCase().trim();
                            const matchesFacetName = !term || (facet.name || '').toLowerCase().includes(term);
                            const matchingValues = (facet.values || []).filter((fv: any) => {
                              if (!term) return true;
                              return matchesFacetName || (fv.name || '').toLowerCase().includes(term) || (fv.code || '').toLowerCase().includes(term);
                            });

                            if (term && matchingValues.length === 0 && !matchesFacetName) {
                              return null;
                            }

                            const isCollapsed = collapsedFacetGroupIds.has(String(facet.id));
                            const selectedInGroupCount = (facet.values || []).filter((fv: any) => selectedFacetValueIds.has(String(fv.id))).length;

                            return (
                              <div
                                key={facet.id}
                                style={{
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '10px',
                                  overflow: 'hidden',
                                  background: '#ffffff'
                                }}
                              >
                                <div
                                  onClick={() => toggleFacetGroup(String(facet.id))}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px 14px',
                                    background: selectedInGroupCount > 0 ? '#f0f9ff' : '#f8fafc',
                                    borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0',
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', transition: 'transform 0.2s', display: 'inline-block', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                                      ▼
                                    </span>
                                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
                                      {facet.name}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                      ({facet.code})
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {selectedInGroupCount > 0 && (
                                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px' }}>
                                        {selectedInGroupCount} sélectionnée{selectedInGroupCount > 1 ? 's' : ''}
                                      </span>
                                    )}
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                      {matchingValues.length} valeur{matchingValues.length > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>

                                {!isCollapsed && (
                                  <div style={{ padding: '12px 14px', display: 'flex', flexWrap: 'wrap', gap: '8px', background: '#ffffff' }}>
                                    {matchingValues.length === 0 ? (
                                      <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                                        Aucune valeur correspondante
                                      </div>
                                    ) : (
                                      matchingValues.map((val: any) => {
                                        const isSelected = selectedFacetValueIds.has(String(val.id));
                                        return (
                                          <button
                                            key={val.id}
                                            type="button"
                                            onClick={() => toggleFacetValue(String(val.id))}
                                            style={{
                                              padding: '6px 12px',
                                              borderRadius: '8px',
                                              fontSize: '12px',
                                              fontWeight: isSelected ? 700 : 500,
                                              border: isSelected ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                                              background: isSelected ? '#eff6ff' : '#f8fafc',
                                              color: isSelected ? '#1d4ed8' : '#334155',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '6px',
                                              transition: 'all 0.15s ease'
                                            }}
                                          >
                                            <span>{isSelected ? '☑' : '☐'}</span>
                                            <span>{val.name}</span>
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                          .filter(Boolean)}
                      </div>
                    )}
                  </div>

                  {/* Section Caractéristiques Techniques Textuelles */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                          ⚙️ Spécifications & Caractéristiques Techniques
                        </h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                          Tableau des spécifications techniques suggérées par l'IA.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRegenerate('specs')}
                        disabled={regeneratingField === 'specs'}
                        style={{ fontSize: '11px', background: '#ede9fe', color: '#6366f1', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {regeneratingField === 'specs' ? '⏳...' : '🔄 Régénérer'}
                      </button>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px' }}>Caractéristique</th>
                          <th style={{ padding: '8px 12px' }}>Valeur</th>
                          <th style={{ padding: '8px 12px' }}>Clé Facette</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(proposal.technicalSpecs || []).map((spec, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: '#334155' }}>
                              <input
                                type="text"
                                value={spec.key}
                                onChange={e => {
                                  const updated = [...(proposal.technicalSpecs || [])];
                                  updated[idx] = { ...updated[idx], key: e.target.value };
                                  setProposal({ ...proposal, technicalSpecs: updated });
                                }}
                                style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', color: '#0f172a' }}
                              />
                            </td>
                            <td style={{ padding: '8px 12px', color: '#0f172a' }}>
                              <input
                                type="text"
                                value={spec.value}
                                onChange={e => {
                                  const updated = [...(proposal.technicalSpecs || [])];
                                  updated[idx] = { ...updated[idx], value: e.target.value };
                                  setProposal({ ...proposal, technicalSpecs: updated });
                                }}
                                style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', color: '#0f172a' }}
                              />
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace' }}>
                                {spec.facetKey || 'general'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── TAB 5 : AUDIT & DOUBLONS ── */}
              {activeTab === 'audit' && (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {analysis?.duplicateMatch?.found ? (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '14px', padding: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: 800 }}>
                        <span style={{ fontSize: '20px' }}>🔗</span>
                        <span>Fiche Officielle Existante Détectée (Re-greffage Recommandé)</span>
                      </div>
                      <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#166534' }}>
                        Ce produit existe déjà dans le catalogue central d'Ahizan sous l'identifiant <strong>#{analysis.duplicateMatch.targetProductId}</strong>. 
                        Vous pouvez soit re-greffer l'offre sur cette fiche existante en 1 clic via le bouton bleu ci-dessous, soit enregistrer une nouvelle fiche officielle via le bouton vert.
                      </p>
                    </div>
                  ) : (
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', textAlign: 'center', color: '#64748b' }}>
                      Aucun doublon trouvé dans le catalogue existant. Cette fiche sera créée comme nouvelle fiche officielle.
                    </div>
                  )}
                </div>
              )}

            </>
          )}

        </div>

        {/* ── MODAL FOOTER AVEC BOUTONS D'ACTION EXPLICITES ET INDÉPENDANTS ── */}
        <div style={{
          padding: '16px 24px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {proposal && (
              <span>
                <strong>{selectedImageIds.size}</strong> visuel(s) sélectionné(s) • <strong>{proposal.technicalSpecs?.length || 0}</strong> spécification(s)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Annuler
            </button>

            {proposal && (
              <>
                {/* 1. Bouton Re-greffage (Uniquement si doublon détecté, action secondaire claire) */}
                {analysis?.duplicateMatch?.found && (
                  <button
                    type="button"
                    onClick={() => handleApply(true)}
                    disabled={isSaving}
                    style={{
                      padding: '11px 20px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isSaving ? '#94a3b8' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    title="Re-greffe l'offre du vendeur sur la fiche existante sans créer de nouveau produit"
                  >
                    <span>🔗</span>
                    <span>Re-greffer sur fiche #{analysis.duplicateMatch.targetProductId}</span>
                  </button>
                )}

                {/* 2. Bouton Principal : Toujours enregistrer & valider la fiche officielle normalisée */}
                <button
                  type="button"
                  onClick={() => handleApply(false)}
                  disabled={isSaving}
                  style={{
                    padding: '11px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isSaving
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #16a34a 0%, #059669 100%)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    boxShadow: isSaving ? 'none' : '0 4px 14px rgba(22, 163, 74, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  title="Enregistre la fiche officielle normalisée, ses photos HD et ses métadonnées au catalogue"
                >
                  <span>{isSaving ? '⏳' : '💾'}</span>
                  <span>
                    {isSaving
                      ? 'Enregistrement en base de données...'
                      : 'Valider & Normaliser la Fiche'}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
