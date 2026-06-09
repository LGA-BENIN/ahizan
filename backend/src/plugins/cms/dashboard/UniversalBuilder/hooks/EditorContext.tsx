import React, { createContext, useContext, useState, ReactNode } from 'react';

export type EditorMode = 'LIVE' | 'PAR_VISUEL' | 'CODE';

interface Section {
  id: string;
  type: string;
  title?: string;
  dataJson: string;
}

interface HabillageData {
  id: string;
  name: string;
  sectionsJson: string;
  isDefault: boolean;
  isBackup: boolean;
  status: string;
  changeHistory: string | null;
  historyPointer: number;
  updatedAt?: string;
}

interface EditorContextType {
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  selectedPageId: string | null;
  setSelectedPageId: (id: string | null) => void;
  activePageSlug: string;
  setActivePageSlug: (slug: string) => void;
  selectedSection: Section | null;
  setSelectedSection: (section: Section | null) => void;
  isSaving: boolean;
  setIsSaving: (is: boolean) => void;
  saveStatus: string | null;
  setSaveStatus: (s: string | null) => void;
  saveHandler: (() => void) | null;
  setSaveHandler: (handler: (() => void) | null) => void;
  previewVersion: number;
  setPreviewVersion: (version: number) => void;
  // Habillage system
  activeHabillage: HabillageData | null;
  setActiveHabillage: (h: HabillageData | null) => void;
  canUndo: boolean;
  setCanUndo: (v: boolean) => void;
  canRedo: boolean;
  setCanRedo: (v: boolean) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<EditorMode>('PAR_VISUEL');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [activePageSlug, setActivePageSlug] = useState<string>('home');
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saveHandler, setSaveHandler] = useState<(() => void) | null>(null);
  const [previewVersion, setPreviewVersion] = useState<number>(Date.now());
  const [activeHabillage, setActiveHabillage] = useState<HabillageData | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  return (
    <EditorContext.Provider
      value={{
        mode,
        setMode,
        selectedPageId,
        setSelectedPageId,
        activePageSlug,
        setActivePageSlug,
        selectedSection,
        setSelectedSection,
        isSaving,
        setIsSaving,
        saveStatus,
        setSaveStatus,
        saveHandler,
        setSaveHandler,
        previewVersion,
        setPreviewVersion,
        activeHabillage,
        setActiveHabillage,
        canUndo,
        setCanUndo,
        canRedo,
        setCanRedo,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
