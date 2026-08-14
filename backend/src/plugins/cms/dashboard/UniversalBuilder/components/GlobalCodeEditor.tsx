import React, { useState, useEffect } from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-tomorrow.css';
import { useEditor } from '../hooks/EditorContext';
import { fetchGraphQL } from '../../lib/utils';

const AUTO_SAVE_HABILLAGE = `
  mutation AutoSaveHabillage($presetId: ID!, $sectionsJson: String!) {
    autoSaveHabillage(presetId: $presetId, sectionsJson: $sectionsJson) {
      id name sectionsJson changeHistory historyPointer updatedAt
    }
  }
`;

// Master CMS Components Technical Reference Documentation & Schemas
const CMS_MASTER_SCHEMA_DOCUMENTATION = {
  version: "2.0.0",
  title: "Spécification Technique & Documentation des Schémas JSON - CMS Ahizan",
  description: "Référentiel complet des 10+ types de composants du CMS Ahizan avec leurs propriétés, stratégies EMS et règles GeoEngine.",
  components: {
    THEME_SETTINGS: {
      type: "THEME_SETTINGS",
      label: "🎨 Thème et Image de marque",
      category: "Général",
      description: "Définit la palette globale de couleurs, typographies, styles de boutons et images par défaut du site.",
      schema: {
        themeColor: { type: "string (Hex)", default: "#e31837", description: "Couleur principale de marque" },
        secondaryColor: { type: "string (Hex)", default: "#1e293b", description: "Couleur secondaire / en-têtes" },
        fontFamily: { type: "string", default: "Inter", enum: ["Inter", "Roboto", "Outfit", "Poppins"] },
        borderRadius: { type: "string", default: "1rem", description: "Arrondi général des cartes et boutons" },
        defaultProductImage: { type: "string (URL)", description: "Image de remplacement pour les produits sans photo" }
      }
    },
    HEADER_CONF: {
      type: "HEADER_CONF",
      label: "📌 En-tête et TopBar",
      category: "Navigation",
      description: "Gestion du logo principal, de la barre de recherche, de la pilule de localisation et du menu des catégories.",
      schema: {
        logoUrl: { type: "string (URL)", description: "Logo principal de la boutique" },
        showSearchBar: { type: "boolean", default: true },
        showLocationWidget: { type: "boolean", default: true },
        navigationCategoryIds: { type: "array of strings", description: "Identifiants des catégories épinglées" }
      }
    },
    TOP_BAR: {
      type: "TOP_BAR",
      label: "📢 Bandeau Annonce (Flash Info)",
      category: "Impact",
      description: "Bandeau d'information défilant ou fixe en haut de page.",
      schema: {
        text: { type: "string", default: "⚡ Livraison express disponible à Cotonou et Calavi !" },
        bgColor: { type: "string (Hex)", default: "#e31837" },
        textColor: { type: "string (Hex)", default: "#ffffff" },
        linkUrl: { type: "string", default: "/promotions" }
      }
    },
    HERO: {
      type: "HERO",
      label: "🚀 Section Héro & Bannières Carousel",
      category: "Impact",
      description: "Bannières principales promotionnelles avec sliders, boutons d'action et images responsives.",
      schema: {
        slides: {
          type: "array of objects",
          itemsSchema: {
            title: { type: "string" },
            subtitle: { type: "string" },
            imageUrl: { type: "string (URL)" },
            mobileImageUrl: { type: "string (URL)" },
            ctaText: { type: "string", default: "Découvrir" },
            ctaLink: { type: "string", default: "/catalog" }
          }
        },
        autoPlaySpeed: { type: "number (ms)", default: 5000 }
      }
    },
    PRODUCT_COLLECTION: {
      type: "PRODUCT_COLLECTION",
      label: "🛍️ Grille / Carrousel Dynamique de Produits (Master EMS)",
      category: "Commerce",
      description: "Composant maître réactif alimenté par l'algorithme Experience Management System (EMS).",
      strategies: {
        FLASH_SALE: "⚡ Ventes Flash (Compte à rebours + Masquage automatique à l'expiration)",
        LOCAL_DISCOVERY: "📍 Découverte Locale (Produits à proximité du quartier/marché client)",
        CATALOG: "📂 Catalogue Standard (Sélection par collections, catégories et onglets)",
        HOME_FEED: "🏠 Feed Accueil (Algorithme de recommandation personnalisée)",
        TRENDING: "🔥 Tendances du Moment (Produits les plus vendus et consultés)"
      },
      selectionModes: {
        AUTOMATIC: "Sélection automatique par l'algorithme EMS",
        CATEGORY_FILTER: "Filtrage strict par catégories/collections BDD",
        MANUAL_PRODUCTS: "Sélection manuelle de produits spécifiques (manualProductIds)",
        HYBRID: "Hybridation manuelle + catégorie + automatique"
      },
      schema: {
        experienceStrategy: { type: "string", enum: ["FLASH_SALE", "LOCAL_DISCOVERY", "CATALOG", "HOME_FEED", "TRENDING"] },
        selectionMode: { type: "string", enum: ["AUTOMATIC", "CATEGORY_FILTER", "MANUAL_PRODUCTS", "HYBRID"] },
        title: { type: "string", default: "Sélection pour vous" },
        subtitle: { type: "string" },
        icon: { type: "string", default: "⚡" },
        layout: { type: "string", enum: ["carousel", "grid-3", "grid-4", "grid-5", "vertical_grid"] },
        columns: { type: "number", default: 4 },
        cardStyle: { type: "string", enum: ["standard", "compact", "horizontal", "overlay"] },
        countdownEnd: { type: "string (ISO Date)", description: "Date et heure de fin du chrono Vente Flash" },
        autoHideExpired: { type: "boolean", default: true, description: "Masquage 100% automatique quand la vente flash expire" },
        mixCollectionId: { type: "string", description: "ID de la collection pour filtrage ou repli" },
        manualProductIds: { type: "array of strings", description: "IDs de produits sélectionnés manuellement" },
        limit: { type: "number", default: 8 },
        _rulesJson: { type: "string (JSON)", description: "Règles conditionnelles GeoZone PostGIS, horaires et segments" }
      }
    },
    FOOTER_CONF: {
      type: "FOOTER_CONF",
      label: "🗺️ Pied de Page & Informations Légales",
      category: "Navigation",
      description: "Liens de navigation bas de page, réseaux sociaux, mentions légales et modes de paiement.",
      schema: {
        aboutText: { type: "string", default: "AHIZAN - Votre marketplace locale de confiance au Bénin." },
        supportPhone: { type: "string", default: "+229 97 00 00 00" },
        supportEmail: { type: "string", default: "contact@ahizan.com" },
        copyrightText: { type: "string", default: "© 2026 AHIZAN. Tous droits réservés." }
      }
    },
    MODALS: {
      type: "MODALS",
      label: "🔔 Pop-ups & Fenêtres Modales",
      category: "Général",
      description: "Configuration des modales d'accueil, offres de bienvenue et alertes de livraison.",
      schema: {
        welcomeModalActive: { type: "boolean", default: false },
        welcomeModalTitle: { type: "string" },
        welcomeModalImageUrl: { type: "string" }
      }
    }
  }
};

export const GlobalCodeEditor = () => {
  const { activeHabillage, setActiveHabillage, setIsSaving, setPreviewVersion } = useEditor();
  const [code, setCode] = useState('[]');
  const [isValid, setIsValid] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [applyStatus, setApplyStatus] = useState<string | null>(null);
  const [parsedSections, setParsedSections] = useState<any[]>([]);

  // Charge le JSON global de l'habillage actif
  useEffect(() => {
    if (activeHabillage?.sectionsJson) {
      try {
        const parsed = JSON.parse(activeHabillage.sectionsJson);
        const formatted = JSON.stringify(parsed, null, 2);
        setCode(formatted);
        setParsedSections(Array.isArray(parsed) ? parsed : []);
        setIsValid(true);
        setHasChanges(false);
      } catch (e) {
        setCode(activeHabillage.sectionsJson);
        setIsValid(false);
      }
    } else {
      setCode('[\n  // Aucun habillage actif sélectionné\n]');
    }
  }, [activeHabillage?.id, activeHabillage?.sectionsJson]);

  const handleChange = (newCode: string) => {
    setCode(newCode);
    setHasChanges(true);
    try {
      const parsed = JSON.parse(newCode);
      setIsValid(true);
      setParsedSections(Array.isArray(parsed) ? parsed : []);
    } catch {
      setIsValid(false);
    }
  };

  // Formatage propre (Prettify)
  const handlePrettify = () => {
    try {
      const parsed = JSON.parse(code);
      const formatted = JSON.stringify(parsed, null, 2);
      setCode(formatted);
      setIsValid(true);
    } catch {
      alert("⚠️ Impossible de formater : Le JSON contient une erreur de syntaxe.");
    }
  };

  // Appliquer le JSON Global à toute la page en 1 clic
  const handleApplyGlobalJson = async () => {
    if (!isValid || !activeHabillage) return;
    setIsSaving(true);
    setApplyStatus('Application en cours...');

    try {
      const parsed = JSON.parse(code);
      if (!Array.isArray(parsed)) {
        alert("⚠️ Le JSON doit être un tableau d'objets de sections [...]");
        setIsSaving(false);
        setApplyStatus(null);
        return;
      }

      const sectionsJsonStr = JSON.stringify(parsed);

      // 1. Mise à jour locale instantanée (Optimistic update)
      setActiveHabillage((prev: any) => prev ? { ...prev, sectionsJson: sectionsJsonStr } : prev);

      // 2. Enregistrement en base de données
      await fetchGraphQL(AUTO_SAVE_HABILLAGE, {
        presetId: activeHabillage.id,
        sectionsJson: sectionsJsonStr,
      });

      setPreviewVersion(Date.now());
      setHasChanges(false);
      setApplyStatus('✅ JSON Global appliqué avec succès !');
      setTimeout(() => setApplyStatus(null), 3000);
    } catch (err: any) {
      console.error('Erreur lors de l\'application du JSON Global:', err);
      setApplyStatus('❌ Erreur lors de l\'application.');
      alert(`Erreur : ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Télécharger le JSON de la page courante
  const handleExportPageJson = () => {
    try {
      const parsed = JSON.parse(code);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(parsed, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `habillage-${activeHabillage?.name || 'page'}-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch {
      alert("⚠️ Erreur : JSON invalide, vérifiez la syntaxe avant d'exporter.");
    }
  };

  // Télécharger la documentation & schémas maîtres du CMS
  const handleDownloadSchemaDocs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(CMS_MASTER_SCHEMA_DOCUMENTATION, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Documentation_Schemas_CMS_Ahizan.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a', color: '#f8fafc', fontFamily: 'monospace' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', padding: '12px 20px', background: '#1e293b', borderBottom: '1px solid #334155', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.2rem' }}>🌐</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              JSON Global de la Page ({activeHabillage?.name || 'Habillage Actif'})
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
              Édition, importation et structure complète des sections de la page
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
          <button
            onClick={handlePrettify}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #475569',
              background: '#334155',
              color: '#e2e8f0',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🧹 Formater (Prettify)
          </button>

          <button
            onClick={handleExportPageJson}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #3b82f6',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📥 Exporter le JSON
          </button>

          <button
            onClick={handleDownloadSchemaDocs}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #8b5cf6',
              background: 'rgba(139, 92, 246, 0.15)',
              color: '#c084fc',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📖 Doc & Modèles
          </button>

          <button
            onClick={handleApplyGlobalJson}
            disabled={!isValid || !hasChanges}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: !isValid ? '#64748b' : hasChanges ? '#10b981' : '#059669',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: (!isValid || !hasChanges) ? 'not-allowed' : 'pointer',
              boxShadow: hasChanges ? '0 4px 14px rgba(16, 185, 129, 0.4)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ⚡ Appliquer le JSON Global
          </button>
        </div>
      </div>

      {/* Validation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', padding: '6px 20px', background: isValid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.15)', borderBottom: '1px solid #334155' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isValid ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{isValid ? '✅ Syntaxe JSON Valide' : '❌ Erreur de syntaxe JSON'}</span>
          {hasChanges && <span style={{ background: '#f59e0b', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem' }}>Modifications non appliquées</span>}
        </div>
        {applyStatus && <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa' }}>{applyStatus}</div>}
      </div>

      {/* Main Content Area: Left Sidebar (Section Tree) + Right Editor */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Section Tree Sidebar */}
        <div style={{ width: '260px', background: '#1e293b', borderRight: '1px solid #334155', padding: '12px', overflowY: 'auto' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', fontWeight: 800 }}>
            Arborescence des Sections ({parsedSections.length})
          </h4>

          {parsedSections.length === 0 ? (
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Aucune section détectée</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {parsedSections.map((sec, idx) => {
                const config = sec.dataJson || sec.data || {};
                const strategy = config.experienceStrategy || '';
                return (
                  <div
                    key={sec.id || idx}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      fontSize: '0.75rem'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
                      <span>#{idx + 1} {sec.type}</span>
                      {sec.isActive !== false && <span style={{ fontSize: '0.6rem', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', padding: '1px 4px', borderRadius: '3px' }}>Actif</span>}
                    </div>
                    {sec.title && <div style={{ color: '#cbd5e1', fontSize: '0.7rem', marginTop: '2px' }}>{sec.title}</div>}
                    {strategy && (
                      <div style={{ fontSize: '0.65rem', color: '#fbbf24', marginTop: '3px', fontWeight: 'bold' }}>
                        Stratégie: {strategy}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Code Editor Container */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#0f172a', padding: '16px' }}>
          <div style={{ borderRadius: '8px', border: `1px solid ${isValid ? '#334155' : '#ef4444'}`, overflow: 'hidden' }}>
            <Editor
              value={code}
              onValueChange={handleChange}
              highlight={code => highlight(code, languages.json, 'json')}
              padding={16}
              style={{
                fontFamily: '"Fira Code", "Fira Mono", monospace',
                fontSize: 13,
                minHeight: '600px',
                background: '#0f172a',
                color: '#f8fafc'
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};
