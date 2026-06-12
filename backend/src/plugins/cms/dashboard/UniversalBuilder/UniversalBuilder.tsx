import React, { useEffect, useState, useCallback } from 'react';
import { EditorProvider, useEditor } from './hooks/EditorContext';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { LivePreview } from './components/LivePreview';
import { SectionEditorFactory } from './components/SectionEditorFactory';
import { CodeEditor } from './components/CodeEditor';
import { SeasonManager } from '../views/SeasonManager';
import { HabillageManager } from './components/HabillageManager';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as queries from '../queries';
const { GET_PAGE, GET_PAGES, CREATE_SECTION, UPDATE_SECTION, DELETE_SECTION } = queries;

import './styles/builder-styles.css';
import { fetchGraphQL } from '../lib/utils';


const GET_PAGES_QUERY = GET_PAGES;

// --- Habillage GraphQL Operations ---
const CREATE_INSTANT_HABILLAGE = `
  mutation CreateInstantHabillage($name: String!) {
    createInstantHabillage(name: $name) {
      id name sectionsJson isDefault isBackup status changeHistory historyPointer updatedAt
    }
  }
`;

const OPEN_HABILLAGE = `
  mutation OpenHabillage($presetId: ID!) {
    openHabillage(presetId: $presetId) {
      id name sectionsJson isDefault isBackup status changeHistory historyPointer updatedAt
    }
  }
`;

const AUTO_SAVE_HABILLAGE = `
  mutation AutoSaveHabillage($presetId: ID!, $sectionsJson: String!) {
    autoSaveHabillage(presetId: $presetId, sectionsJson: $sectionsJson) {
      id name sectionsJson changeHistory historyPointer updatedAt
    }
  }
`;

const PUBLISH_HABILLAGE = `
  mutation PublishHabillage($presetId: ID!, $pageId: ID!) {
    publishHabillage(presetId: $presetId, pageId: $pageId) {
      id
    }
  }
`;

const UNDO_HABILLAGE = `
  mutation UndoHabillage($presetId: ID!) {
    undoHabillage(presetId: $presetId) {
      id name sectionsJson changeHistory historyPointer updatedAt
    }
  }
`;

const REDO_HABILLAGE = `
  mutation RedoHabillage($presetId: ID!) {
    redoHabillage(presetId: $presetId) {
      id name sectionsJson changeHistory historyPointer updatedAt
    }
  }
`;

const FETCH_HABILLAGES = `
  query FetchHabillages {
    habillages { id name isDefault isBackup status sectionsJson changeHistory historyPointer updatedAt }
  }
`;

const FETCH_PAGES = `query { pages { items { id slug title } } }`;

// Helper to update undo/redo state from habillage data
function updateUndoRedo(habillage: any, setCanUndo: (v: boolean) => void, setCanRedo: (v: boolean) => void) {
  if (!habillage?.changeHistory) {
    setCanUndo(false);
    setCanRedo(false);
    return;
  }
  try {
    const history: string[] = JSON.parse(habillage.changeHistory);
    const pointer = habillage.historyPointer ?? history.length - 1;
    setCanUndo(pointer > 0);
    setCanRedo(pointer < history.length - 1);
  } catch {
    setCanUndo(false);
    setCanRedo(false);
  }
}

const BuilderContent = ({ pendingPresetId, onPresetOpened }: { pendingPresetId: string | null; onPresetOpened: () => void }) => {
  const { mode, setMode, selectedPageId, setSelectedPageId, activePageSlug, setActivePageSlug, selectedSection, setSelectedSection, setSaveStatus, saveStatus, activeHabillage, setActiveHabillage, canUndo, setCanUndo, canRedo, setCanRedo, setPreviewVersion } = useEditor();
  const queryClient = useQueryClient();

  // Auto-open habillage when coming from HabillageManager
  useEffect(() => {
    if (pendingPresetId && !activeHabillage) {
      const openPending = async () => {
        try {
          const result = await fetchGraphQL(OPEN_HABILLAGE, { presetId: pendingPresetId });
          if (result?.openHabillage) {
            setActiveHabillage(result.openHabillage);
            updateUndoRedo(result.openHabillage, setCanUndo, setCanRedo);
            setSaveStatus('✅ Habillage ouvert !');
          }
        } catch (err: any) {
          setSaveStatus('❌ Erreur ouverture : ' + err.message);
        }
        onPresetOpened();
      };
      openPending();
    } else if (pendingPresetId && activeHabillage) {
      // Already have an active habillage, just clear the pending
      onPresetOpened();
    }
  }, [pendingPresetId]);

  const { data: pagesData, isLoading: loadingPages } = useQuery({
    queryKey: ['pages'],
    queryFn: () => fetchGraphQL(GET_PAGES_QUERY)
  });

  const { data: pageDetail, refetch: refetchPageDetail } = useQuery({
    queryKey: ['page', selectedPageId],
    queryFn: () => fetchGraphQL(GET_PAGE, { id: selectedPageId }),
    enabled: !!selectedPageId
  });

  // Sync activePageSlug when pageDetail changes
  useEffect(() => {
    const slug = pageDetail?.page?.slug;
    if (slug) {
      setActivePageSlug(slug);
    }
  }, [pageDetail]);

  // Habillage selector modal state
  const [showHabillageModal, setShowHabillageModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [habillageList, setHabillageList] = useState<any[]>([]);
  const [habillageListLoading, setHabillageListLoading] = useState(false);

  // Set home page as default if none selected (must be home page for publish to work)
  useEffect(() => {
    if (!selectedPageId && pagesData?.pages?.items?.length > 0) {
      const homePage = pagesData.pages.items.find((p: any) => p.slug === 'home');
      setSelectedPageId(homePage?.id || pagesData.pages.items[0].id);
    }
  }, [pagesData, selectedPageId]);

  // Handle status clear
  useEffect(() => {
    if (saveStatus) {
      const timer = setTimeout(() => setSaveStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  // Fetch habillage list for modal
  const loadHabillageList = useCallback(async () => {
    setHabillageListLoading(true);
    try {
      const data = await fetchGraphQL(FETCH_HABILLAGES);
      setHabillageList(data?.habillages || []);
    } catch (e: any) {
      console.error('[HabillageList] Error:', e.message);
    }
    setHabillageListLoading(false);
  }, []);

  // Open habillage modal
  const handleOpenHabillageModal = () => {
    loadHabillageList();
    setShowHabillageModal(true);
    setShowCreateInput(false);
    setCreateName('');
  };

  // Create instant habillage (snapshot current storefront)
  const handleCreateInstantHabillage = async () => {
    if (!createName.trim()) return;
    try {
      setSaveStatus('Création de l\'habillage...');
      const result = await fetchGraphQL(CREATE_INSTANT_HABILLAGE, { name: createName.trim() });
      if (result?.createInstantHabillage) {
        setActiveHabillage(result.createInstantHabillage);
        updateUndoRedo(result.createInstantHabillage, setCanUndo, setCanRedo);
        setSelectedSection(null);
        setShowHabillageModal(false);
        setCreateName('');
        setSaveStatus('✅ Habillage créé avec snapshot du storefront !');
      }
    } catch (err: any) {
      setSaveStatus('❌ Erreur création : ' + err.message);
    }
  };

  // Open existing habillage
  const handleOpenExistingHabillage = async (presetId: string) => {
    try {
      setSaveStatus('Ouverture de l\'habillage...');
      const result = await fetchGraphQL(OPEN_HABILLAGE, { presetId });
      if (result?.openHabillage) {
        setActiveHabillage(result.openHabillage);
        updateUndoRedo(result.openHabillage, setCanUndo, setCanRedo);
        setSelectedSection(null);
        setShowHabillageModal(false);
        setSaveStatus('✅ Habillage ouvert !');
      }
    } catch (err: any) {
      setSaveStatus('❌ Erreur ouverture : ' + err.message);
    }
  };

  // Auto-save to habillage (called on every change)
  const autoSaveToHabillage = useCallback((sectionsJson: string) => {
    if (!activeHabillage) return;
    // OPTIMISTIC UPDATE: instant local state
    setActiveHabillage((prev: any) => prev ? { ...prev, sectionsJson } : prev);
    
    // Update preview immediately locally!
    setPreviewVersion(Date.now());

    // FIRE AND FORGET BACKGROUND SAVE
    fetchGraphQL(AUTO_SAVE_HABILLAGE, {
      presetId: activeHabillage.id,
      sectionsJson,
    }).then(result => {
      if (result?.autoSaveHabillage) {
        updateUndoRedo(result.autoSaveHabillage, setCanUndo, setCanRedo);
      }
    }).catch((err: any) => console.error("[AutoSave] Error:", err.message));
  }, [activeHabillage, setPreviewVersion, setCanUndo, setCanRedo]);

  // Undo
  const handleUndo = async () => {
    if (!activeHabillage) return;
    try {
      const result = await fetchGraphQL(UNDO_HABILLAGE, { presetId: activeHabillage.id });
      if (result?.undoHabillage) {
        setActiveHabillage(result.undoHabillage);
        updateUndoRedo(result.undoHabillage, setCanUndo, setCanRedo);
        // setPreviewVersion(Date.now());
      }
    } catch (err: any) {
      setSaveStatus('❌ ' + err.message);
    }
  };

  // Redo
  const handleRedo = async () => {
    if (!activeHabillage) return;
    try {
      const result = await fetchGraphQL(REDO_HABILLAGE, { presetId: activeHabillage.id });
      if (result?.redoHabillage) {
        setActiveHabillage(result.redoHabillage);
        updateUndoRedo(result.redoHabillage, setCanUndo, setCanRedo);
        // setPreviewVersion(Date.now());
      }
    } catch (err: any) {
      setSaveStatus('❌ ' + err.message);
    }
  };

  // Publish habillage → push to storefront
  const handlePublish = async () => {
    if (!activeHabillage || !selectedPageId) return;
    if (!confirm('Publier cet habillage ? Il remplacera la version actuelle du site.')) return;
    try {
      setSaveStatus('Publication en cours...');
      
      // Force auto-save of the latest local state before publishing
      await fetchGraphQL(AUTO_SAVE_HABILLAGE, {
        presetId: activeHabillage.id,
        sectionsJson: activeHabillage.sectionsJson,
      });

      await fetchGraphQL(PUBLISH_HABILLAGE, { presetId: activeHabillage.id, pageId: selectedPageId });
      setSaveStatus('✅ Habillage publié ! Le storefront est mis à jour.');
      queryClient.invalidateQueries({ queryKey: ['page', selectedPageId] });
    } catch (err: any) {
      setSaveStatus('❌ Erreur de publication : ' + err.message);
    }
  };

  if (loadingPages) return <div className="loading-state">Initialisation de l'Ahizan Builder...</div>;

  // Read sections from active habillage
  const habillageSections = activeHabillage ? (() => {
    try {
      const parsed = JSON.parse(activeHabillage.sectionsJson);
      if (!Array.isArray(parsed)) return [];

      // --- AUTO-MIGRATION: Explode multi-version FLASH_DEALS into individual sections ---
      let exploded: any[] = [];
      let didExplode = false;
      for (const section of parsed) {
        if (section.type === 'FLASH_DEALS') {
          let data: any;
          try {
            data = typeof section.dataJson === 'string' ? JSON.parse(section.dataJson) : (section.dataJson || {});
          } catch { data = {}; }
          
          const versions = data.flashVersions;
          if (Array.isArray(versions) && versions.length > 1) {
            // Split each flashVersion into its own independent FLASH_DEALS section
            didExplode = true;
            for (const version of versions) {
              exploded.push({
                ...section,
                title: version.name || section.title || '',
                order: exploded.length,
                dataJson: JSON.stringify({ flashVersions: [version] }),
              });
            }
          } else {
            // Already has 0 or 1 version — keep as is, just update title from version name
            if (Array.isArray(versions) && versions.length === 1 && !section.title) {
              section.title = versions[0].name || '';
            }
            section.order = exploded.length;
            exploded.push(section);
          }
        } else {
          section.order = exploded.length;
          exploded.push(section);
        }
      }
      
      // If we exploded anything, auto-save the new structure back
      if (didExplode) {
        const cleanSections = exploded.map((s, i) => ({
          type: s.type, title: s.title, description: s.description || '', layout: s.layout || 'grid',
          order: i, isActive: s.isActive, dataJson: typeof s.dataJson === 'string' ? s.dataJson : JSON.stringify(s.dataJson || {}),
        }));
        // Fire-and-forget save of the migrated data
        autoSaveToHabillage(JSON.stringify(cleanSections));
      }

      return exploded.map((s: any, i: number) => ({
        ...s,
        id: `habillage-${s.type}-${i}`,
        dataJson: typeof s.dataJson === 'string' ? s.dataJson : JSON.stringify(s.dataJson || {}),
      }));
    } catch { return []; }
  })() : [];
  const sections = habillageSections.filter(s => (s.pageSlug || 'home') === activePageSlug);

  const handleCreateSection = async (type: string) => {
    if (!activeHabillage) {
      setSaveStatus('❌ Aucun habillage sélectionné');
      return;
    }
    try {
      setSaveStatus('Ajout du composant...');
      const currentSections = JSON.parse(activeHabillage.sectionsJson);
      currentSections.push({ 
        type, 
        title: '', 
        description: '', 
        layout: 'grid', 
        order: currentSections.length, 
        isActive: true, 
        pageSlug: activePageSlug,
        dataJson: {} 
      });
      await autoSaveToHabillage(JSON.stringify(currentSections));
      setSaveStatus('✅ Section ajoutée !');
    } catch (err: any) {
      setSaveStatus('❌ Échec de l\'ajout : ' + err.message);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette section ?')) return;
    if (!activeHabillage) return;
    try {
      setSaveStatus('Suppression de la section...');
      if (selectedSection?.id === sectionId) setSelectedSection(null);
      const currentSections = JSON.parse(activeHabillage.sectionsJson);
      const match = sectionId.match(/^habillage-(.+)-(\d+)$/);
      if (match) {
        const idx = parseInt(match[2]);
        currentSections.splice(idx, 1);
        currentSections.forEach((s: any, i: number) => s.order = i);
        await autoSaveToHabillage(JSON.stringify(currentSections));
        setSaveStatus('✅ Section supprimée !');
      }
    } catch (err: any) {
      setSaveStatus('❌ Error: ' + err.message);
    }
  };

  const handleMoveSection = async (sectionId: string, _itemOrder: number, direction: 'up' | 'down', targetSectionId?: string) => {
    if (!activeHabillage) return;
    
    const rawSections: any[] = JSON.parse(activeHabillage.sectionsJson);
    
    // Separate active page sections and other pages sections
    const activePageSections = rawSections.filter(s => (s.pageSlug || 'home') === activePageSlug);
    
    // Map active page sections to include their original index in rawSections
    const indexedSections = activePageSections.map((s) => {
      const originalIndex = rawSections.findIndex(rs => rs === s);
      return { ...s, _originalIndex: originalIndex };
    });
    
    // Sort active sections by order
    indexedSections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    
    // Find current section index in active sections
    const currentMatch = sectionId.match(/^habillage-.+-(\d+)$/);
    if (!currentMatch) return;
    const currentRawIndex = parseInt(currentMatch[1]);
    const currentSortedIndex = indexedSections.findIndex(s => s._originalIndex === currentRawIndex);
    if (currentSortedIndex === -1) return;

    let targetSortedIndex: number;
    if (targetSectionId) {
      const targetMatch = targetSectionId.match(/^habillage-.+-(\d+)$/);
      if (!targetMatch) return;
      const targetRawIndex = parseInt(targetMatch[1]);
      targetSortedIndex = indexedSections.findIndex(s => s._originalIndex === targetRawIndex);
      if (targetSortedIndex === -1) return;
    } else {
      targetSortedIndex = direction === 'up' ? currentSortedIndex - 1 : currentSortedIndex + 1;
    }

    if (targetSortedIndex < 0 || targetSortedIndex >= indexedSections.length) return;

    setSaveStatus('Mise à jour de l\'ordre...');
    
    // Swap in active sorted list
    const temp = indexedSections[currentSortedIndex];
    indexedSections[currentSortedIndex] = indexedSections[targetSortedIndex];
    indexedSections[targetSortedIndex] = temp;
    
    // Get the physical slots these active sections occupied
    const activePageOriginalIndices = indexedSections.map(s => s._originalIndex).sort((a, b) => a - b);
    
    // Rebuild the final array
    const newSections = [...rawSections];
    indexedSections.forEach((s, i) => {
      const targetPhysicalIndex = activePageOriginalIndices[i];
      const { _originalIndex, ...cleanSection } = s;
      cleanSection.order = targetPhysicalIndex;
      newSections[targetPhysicalIndex] = cleanSection;
    });
    
    try {
      await autoSaveToHabillage(JSON.stringify(newSections));
      setSaveStatus(`✅ Section réorganisée`);
    } catch (err: any) {
      setSaveStatus('❌ Échec : ' + err.message);
    }
  };

  const handleToggleSection = async (sectionId: string, isActive: boolean) => {
    if (!activeHabillage) return;
    try {
      setSaveStatus(isActive ? 'Activation...' : 'Désactivation...');
      const currentSections = JSON.parse(activeHabillage.sectionsJson);
      const match = sectionId.match(/^habillage-(.+)-(\d+)$/);
      if (match) {
        const idx = parseInt(match[2]);
        if (currentSections[idx]) {
          currentSections[idx].isActive = isActive;
          await autoSaveToHabillage(JSON.stringify(currentSections));
          setSaveStatus(`✅ Section ${isActive ? 'activée' : 'désactivée'}`);
        }
      }
    } catch (err: any) {
      setSaveStatus('❌ Error: ' + err.message);
    }
  };

  const handleMoveSectionGroup = async (sectionType: string, direction: 'up' | 'down') => {
    if (!activeHabillage) return;
    
    const rawSections: any[] = JSON.parse(activeHabillage.sectionsJson);
    const activePageSections = rawSections.filter(s => (s.pageSlug || 'home') === activePageSlug);
    
    const activeWithIds = activePageSections.map((s) => {
      const originalIndex = rawSections.findIndex(rs => rs === s);
      return { ...s, _originalIndex: originalIndex };
    }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    
    const groupIds = new Set(activeWithIds.filter(s => s.type === sectionType).map(s => s._originalIndex));
    
    if (groupIds.size === 0) return;

    const blocks: any[][] = [];
    let currentGroupBlock: any[] = [];
    for (const sec of activeWithIds) {
      if (groupIds.has(sec._originalIndex)) {
        currentGroupBlock.push(sec);
      } else {
        if (currentGroupBlock.length > 0) { blocks.push(currentGroupBlock); currentGroupBlock = []; }
        blocks.push([sec]);
      }
    }
    if (currentGroupBlock.length > 0) blocks.push(currentGroupBlock);

    const groupBlockIdx = blocks.findIndex(b => b.some((s: any) => groupIds.has(s._originalIndex)));
    if (groupBlockIdx < 0) return;
    const swapWith = direction === 'up' ? groupBlockIdx - 1 : groupBlockIdx + 1;
    if (swapWith < 0 || swapWith >= blocks.length) return;

    const temp = blocks[groupBlockIdx];
    blocks[groupBlockIdx] = blocks[swapWith];
    blocks[swapWith] = temp;

    setSaveStatus(`Déplacement du groupe ${sectionType}...`);
    const newOrder = blocks.flat();
    
    const activePageOriginalIndices = activeWithIds.map(s => s._originalIndex).sort((a, b) => a - b);
    
    const newSections = [...rawSections];
    newOrder.forEach((s, i) => {
      const targetPhysicalIndex = activePageOriginalIndices[i];
      const { _originalIndex, ...cleanSection } = s;
      cleanSection.order = targetPhysicalIndex;
      newSections[targetPhysicalIndex] = cleanSection;
    });
    
    try {
      await autoSaveToHabillage(JSON.stringify(newSections));
      setSaveStatus(`✅ Groupe ${sectionType} déplacé`);
    } catch (err: any) {
      setSaveStatus('❌ Échec : ' + err.message);
    }
  };

  const activeSection = selectedSection ? sections.find(s => s.id === selectedSection.id) || selectedSection : null;

  return (
    <div className="universal-builder">
      <Toolbar />
      {/* Habillage indicator bar */}
      <div style={{
        padding: '8px 20px',
        background: activeHabillage
          ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)'
          : 'linear-gradient(135deg, #fef3c7, #fde68a)',
        borderBottom: activeHabillage ? '1px solid #34d399' : '1px solid #f59e0b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 5
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeHabillage ? (
            <>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46' }}>🎨 {activeHabillage.name}</span>
              {activeHabillage.isDefault && (
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#fff', background: '#059669', padding: '2px 8px', borderRadius: '4px' }}>DÉFAUT</span>
              )}
              <span style={{ fontSize: '0.65rem', color: '#047857', background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>
                Auto-sauvegarde activé
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>Aucun habillage sélectionné</span>
              <span style={{ fontSize: '0.65rem', color: '#b45309', background: '#fffbeb', padding: '2px 8px', borderRadius: '4px' }}>
                Créez ou ouvrez un habillage pour commencer
              </span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Habillage selector button */}
          <button
            onClick={handleOpenHabillageModal}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #94a3b8',
              background: '#fff',
              color: '#334155',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🎨 Changer d'habillage
          </button>

          {/* Undo / Redo */}
          {activeHabillage && (
            <>
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                title="Annuler (Undo)"
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #94a3b8',
                  background: canUndo ? '#fff' : '#f1f5f9',
                  color: canUndo ? '#334155' : '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: canUndo ? 'pointer' : 'default',
                }}
              >
                ↩️
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                title="Rétablir (Redo)"
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #94a3b8',
                  background: canRedo ? '#fff' : '#f1f5f9',
                  color: canRedo ? '#334155' : '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: canRedo ? 'pointer' : 'default',
                }}
              >
                ↪️
              </button>
            </>
          )}

          {/* Publish button */}
          {activeHabillage && (
            <button
              onClick={handlePublish}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(5,150,105,0.3)'
              }}
            >
              🚀 Publier
            </button>
          )}
        </div>
      </div>

      {/* Habillage Selection Modal */}
      {showHabillageModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => setShowHabillageModal(false)}
        >
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '24px',
            width: '480px', maxHeight: '80vh', overflow: 'auto',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', color: '#0f172a' }}>
              🎨 Gestion des Habillages
            </h3>

            {/* Create new habillage */}
            <div style={{ marginBottom: '16px', padding: '16px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <button
                onClick={() => setShowCreateInput(!showCreateInput)}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                ✨ Créer un nouvel habillage instantané
              </button>
              {showCreateInput && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    placeholder="Nom de l'habillage..."
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db',
                      fontSize: '0.8rem', outline: 'none',
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleCreateInstantHabillage()}
                  />
                  <button
                    onClick={handleCreateInstantHabillage}
                    disabled={!createName.trim()}
                    style={{
                      padding: '8px 16px', borderRadius: '8px', border: 'none',
                      background: createName.trim() ? '#059669' : '#94a3b8',
                      color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: createName.trim() ? 'pointer' : 'default',
                    }}
                  >
                    Créer
                  </button>
                </div>
              )}
              <p style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '8px' }}>
                Crée un snapshot instantané du storefront actuel comme point de départ.
              </p>
            </div>

            {/* Existing habillages list */}
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                Ouvrir un habillage existant
              </h4>
              {habillageListLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.8rem' }}>Chargement...</div>
              ) : habillageList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.8rem' }}>Aucun habillage existant</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
                  {habillageList.filter((h: any) => !h.isBackup).map((h: any) => (
                    <div
                      key={h.id}
                      onClick={() => handleOpenExistingHabillage(h.id)}
                      style={{
                        padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                        border: `1px solid ${activeHabillage?.id === h.id ? '#059669' : '#e2e8f0'}`,
                        background: activeHabillage?.id === h.id ? '#ecfdf5' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>{h.name}</span>
                        {h.isDefault && (
                          <span style={{ marginLeft: '8px', fontSize: '0.6rem', fontWeight: 700, color: '#fff', background: '#059669', padding: '1px 6px', borderRadius: '4px' }}>DÉFAUT</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>
                        {h.updatedAt ? new Date(h.updatedAt).toLocaleDateString('fr-FR') : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button
                onClick={() => setShowHabillageModal(false)}
                style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', color: '#475569', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {saveStatus && (
        <div style={{ position: 'fixed', top: '64px', right: '16px', padding: '10px 20px', background: '#fff', border: '1px solid var(--builder-border)', borderRadius: '8px', zIndex: 1000, fontSize: '0.8rem', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--builder-text)' }}>
          {saveStatus}
        </div>
      )}
      {/* Layout Grid */}
      <div className="builder-main" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {!activeHabillage ? (
          // Empty state when no habillage is selected
          <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🎨</div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                Aucun habillage sélectionné
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '2rem' }}>
                Créez un nouvel habillage ou ouvrez-en un existant pour commencer à modifier votre storefront.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={() => { setShowCreateInput(true); setShowHabillageModal(true); loadHabillageList(); }}
                  style={{
                    padding: '14px 24px', borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
                  }}
                >
                  ✨ Créer un nouvel habillage
                </button>
                <button
                  onClick={handleOpenHabillageModal}
                  style={{
                    padding: '14px 24px', borderRadius: '12px', border: '1px solid #cbd5e1',
                    background: '#fff', color: '#334155', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  📂 Ouvrir un habillage existant
                </button>
              </div>
            </div>
          </main>
        ) : (
          <>
            <Sidebar 
                sections={sections} 
                pageSlug={pageDetail?.page?.slug}
                onRefetch={refetchPageDetail} 
                onCreate={handleCreateSection}
                onDelete={handleDeleteSection}
                onMove={handleMoveSection}
                onToggle={handleToggleSection}
                onMoveGroup={handleMoveSectionGroup}
            />
            
            <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {mode === 'LIVE' && <LivePreview />}
              
              {mode === 'PAR_VISUEL' && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {activeSection && (
                    <div style={{ 
                      padding: '10px 20px', 
                      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
                      borderBottom: '1px solid #334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexShrink: 0,
                      zIndex: 10
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>
                          ✏️ {activeSection.type} {activeSection.title ? `— ${activeSection.title}` : ''}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: '#334155', padding: '2px 8px', borderRadius: '4px' }}>
                            Éditeur Visuel
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Auto-save indicator */}
                        <span style={{ fontSize: '0.65rem', color: '#34d399', background: '#064e3b', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          ✅ Auto-sauvegarde
                        </span>
                        {/* Undo */}
                        <button
                          onClick={handleUndo}
                          disabled={!canUndo}
                          title="Annuler (Undo)"
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #475569',
                            background: canUndo ? 'transparent' : 'transparent',
                            color: canUndo ? '#e2e8f0' : '#475569',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: canUndo ? 'pointer' : 'default',
                          }}
                        >
                          ↩️
                        </button>
                        {/* Redo */}
                        <button
                          onClick={handleRedo}
                          disabled={!canRedo}
                          title="Rétablir (Redo)"
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #475569',
                            background: 'transparent',
                            color: canRedo ? '#e2e8f0' : '#475569',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: canRedo ? 'pointer' : 'default',
                          }}
                        >
                          ↪️
                        </button>
                        <button
                          onClick={() => { setMode('CODE'); }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: '1px solid #475569',
                            background: 'transparent',
                            color: '#94a3b8',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          ⌨️ Mode Code
                        </button>
                      </div>
                    </div>
                  )}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'block' }}>
                    {activeSection ? (
                      <SectionEditorFactory key={activeSection.id} section={activeSection} sectionIndex={sections.findIndex((s: any) => s.id === activeSection.id)} onSaveSuccess={refetchPageDetail} />
                    ) : (
                      <div className="empty-state">
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👆</div>
                        <h3>Sélectionnez une section à personnaliser</h3>
                        <p>Choisissez un composant dans la barre latérale pour ouvrir ses paramètres graphiques.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {mode === 'CODE' && (
                <div className="code-editor-container" style={{ height: '100%' }}>
                  <CodeEditor section={activeSection} sectionIndex={sections.findIndex(s => s.id === activeSection.id)} onSaveSuccess={refetchPageDetail} />
                </div>
              )}
            </main>
          </>
        )}
      </div>
    </div>
  );
};

// Pages Dropdown Component
const PagesDropdown = ({ activeTab, setActiveTab }: any) => {
  const { selectedPageId, setSelectedPageId } = useEditor();
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: pagesData } = useQuery({
    queryKey: ['pages'],
    queryFn: () => fetchGraphQL(GET_PAGES_QUERY)
  });

  const pages = pagesData?.pages?.items || [];
  const activePage = pages.find((p: any) => p.id === selectedPageId) || pages.find((p: any) => p.slug === 'home');

  const handleSelectPage = (id: string) => {
    setSelectedPageId(id);
    setActiveTab('PAGES');
    setIsOpen(false);
  };

  const handleSelectTemplate = async (title: string, slug: string) => {
    // Check if it already exists
    const existing = pages.find((p: any) => p.slug === slug);
    if (existing) {
      handleSelectPage(existing.id);
      return;
    }
    
    try {
      const result = await fetchGraphQL(`
        mutation CreatePage($input: CreatePageInput!) {
          createPage(input: $input) { id slug title }
        }
      `, { input: { title, slug } });
      
      if (result?.createPage) {
        await queryClient.invalidateQueries({ queryKey: ['pages'] });
        setSelectedPageId(result.createPage.id);
        setActiveTab('PAGES');
        setIsOpen(false);
      }
    } catch (e: any) {
      alert("Erreur : " + e.message);
    }
  };

  const handleCreatePage = async () => {
    const title = window.prompt("Titre de la nouvelle page :");
    if (!title) return;
    const slug = window.prompt("Lien (slug) de la page (ex: a-propos, contact) :");
    if (!slug) return;
    
    try {
      const result = await fetchGraphQL(`
        mutation CreatePage($input: CreatePageInput!) {
          createPage(input: $input) { id slug title }
        }
      `, { input: { title, slug } });
      
      if (result?.createPage) {
        window.alert("Page créée avec succès ! Rafraîchissez la page si elle n'apparaît pas.");
        await queryClient.invalidateQueries({ queryKey: ['pages'] });
        setSelectedPageId(result.createPage.id);
        setActiveTab('PAGES');
        setIsOpen(false);
      }
    } catch (e: any) {
      alert("Erreur lors de la création de la page : " + e.message);
    }
  };

  const baseTemplates = [
    { title: 'Accueil', slug: 'home' },
    { title: 'Catégorie (Collection)', slug: 'category' },
    { title: 'Produit', slug: 'product' },
  ];

  const customPages = pages.filter((p: any) => !baseTemplates.some(bt => bt.slug === p.slug));

  let timeoutId: any;

  return (
    <div 
      className="relative" 
      onMouseEnter={() => { clearTimeout(timeoutId); setIsOpen(true); }} 
      onMouseLeave={() => { timeoutId = setTimeout(() => setIsOpen(false), 300); }}
      style={{ position: 'relative' }}
    >
      <button 
        onClick={() => { setActiveTab('PAGES'); setIsOpen(!isOpen); }}
        style={{
          padding: '6px 14px',
          borderRadius: '6px',
          border: 'none',
          background: activeTab === 'PAGES' ? '#fff' : 'transparent',
          color: activeTab === 'PAGES' ? '#1e40af' : '#64748b',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '0.75rem',
          boxShadow: activeTab === 'PAGES' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          transition: 'all 0.15s',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        Pages {activeTab === 'PAGES' && activePage && <span style={{opacity: 0.7, fontSize: '0.65rem'}}>({activePage.title})</span>}
        <span style={{ fontSize: '10px' }}>▼</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          paddingTop: '6px', // Invisible hover bridge
          zIndex: 100,
        }}>
          <div style={{
            background: '#fff',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            borderRadius: '8px',
            padding: '8px',
            minWidth: '240px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', padding: '4px 8px', textTransform: 'uppercase' }}>
              Modèles de base
            </div>
          {baseTemplates.map((t) => {
            const exists = pages.find((p: any) => p.slug === t.slug);
            const isSelected = exists && selectedPageId === exists.id;
            
            return (
              <button
                key={t.slug}
                onClick={() => handleSelectTemplate(t.title, t.slug)}
                style={{
                  textAlign: 'left',
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isSelected ? '#eff6ff' : 'transparent',
                  color: isSelected ? '#1e40af' : '#334155',
                  fontWeight: isSelected ? 'bold' : 'normal',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{t.title}</span>
                <span style={{ fontSize: '0.6rem', color: '#94a3b8', background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>
                  /{t.slug}
                </span>
              </button>
            );
          })}

          {customPages.length > 0 && (
            <>
              <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', padding: '4px 8px', textTransform: 'uppercase' }}>
                Autres pages
              </div>
              {customPages.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPage(p.id)}
                  style={{
                    textAlign: 'left',
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: selectedPageId === p.id ? '#eff6ff' : 'transparent',
                    color: selectedPageId === p.id ? '#1e40af' : '#334155',
                    fontWeight: selectedPageId === p.id ? 'bold' : 'normal',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{p.title}</span>
                  <span style={{ fontSize: '0.6rem', color: '#94a3b8', background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>
                    /{p.slug}
                  </span>
                </button>
              ))}
            </>
          )}

          <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
          <button
            onClick={handleCreatePage}
            style={{
              textAlign: 'left',
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: '#059669',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            + Ajouter une page personnalisée
          </button>
          </div>
        </div>
      )}
    </div>
  );
};

const UniversalBuilderInner = () => {
  const [activeTab, setActiveTab] = useState<'PAGES' | 'HABILLAGES' | 'SEASONS'>('PAGES');
  const [pendingPresetId, setPendingPresetId] = useState<string | null>(null);

  const handleOpenInEditor = (presetId: string) => {
    // Store the presetId and switch to PAGES tab; BuilderContent will auto-open it
    setPendingPresetId(presetId);
    setActiveTab('PAGES');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Tab Header */}
      <div style={{ 
        position: 'relative',
        zIndex: 1000,
        height: '48px', 
        background: '#fff', 
        borderBottom: '1px solid #e2e8f0', 
        display: 'flex', 
        alignItems: 'center', 
        padding: '0 24px',
        gap: '16px',
        flexShrink: 0
      }}>
        <h1 style={{ fontSize: '16px', fontWeight: '900', color: '#002f6c', margin: 0, letterSpacing: '-0.02em' }}>AHIZAN BUILDER</h1>
        
        <nav style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
          <PagesDropdown activeTab={activeTab} setActiveTab={setActiveTab} />
          
          <button
            onClick={() => setActiveTab('HABILLAGES')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'HABILLAGES' ? '#fff' : 'transparent',
              color: activeTab === 'HABILLAGES' ? '#1e40af' : '#64748b',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.75rem',
              boxShadow: activeTab === 'HABILLAGES' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            Habillages
          </button>
          <button
            onClick={() => setActiveTab('SEASONS')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'SEASONS' ? '#fff' : 'transparent',
              color: activeTab === 'SEASONS' ? '#1e40af' : '#64748b',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.75rem',
              boxShadow: activeTab === 'SEASONS' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            Saisons
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'PAGES' ? (
            <BuilderContent pendingPresetId={pendingPresetId} onPresetOpened={() => setPendingPresetId(null)} />
          ) : activeTab === 'HABILLAGES' ? (
            <HabillageManager onOpenInEditor={handleOpenInEditor} />
          ) : (
            <SeasonManager />
          )}
      </div>
    </div>
  );
};

export const UniversalBuilder = () => {
  return (
    <EditorProvider>
      <UniversalBuilderInner />
    </EditorProvider>
  );
};

export default UniversalBuilder;
