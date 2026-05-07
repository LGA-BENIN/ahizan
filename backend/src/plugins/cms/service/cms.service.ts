import { Injectable } from '@nestjs/common';
import { EntityHydrator, ListQueryBuilder, TransactionalConnection, ID, RequestContext, PaginatedList } from '@vendure/core';
import { DeletionResponse, DeletionResult } from '@vendure/common/lib/generated-types';
import { Page } from '../entities/page.entity';
import { PageSection } from '../entities/section.entity';
import { PagePreset } from '../entities/page-preset.entity';
import { SiteSeason } from '../entities/site-season.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class CMSService {
    private lastSeasonCheck: number = 0;
    private readonly SEASON_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder,
        private entityHydrator: EntityHydrator,
    ) { }

    findAll(ctx: RequestContext, options?: any): Promise<PaginatedList<Page>> {
        return this.listQueryBuilder
            .build(Page, options, { ctx })
            .getManyAndCount()
            .then(([items, totalItems]) => ({ items, totalItems }));
    }

    findOne(ctx: RequestContext, id: ID): Promise<Page | null> {
        // Disable cache to ensure fresh reads after mutations
        return this.connection.getRepository(ctx, Page).findOne({
            where: { id },
            relations: ['sections'],
            cache: false,
        });
    }

    async findOneBySlug(ctx: RequestContext, slug: string): Promise<Page | null> {
        // Simplified: habillage is now applied directly on the home page via applyPreset.
        // No need to resolve season-specific slugs like "noel-home".
        // Disable query cache to ensure fresh reads after publishHabillage updates
        return this.connection.getRepository(ctx, Page).findOne({
            where: { slug, isActive: true },
            relations: ['sections'],
            cache: false,
        });
    }

    // --- Seasons ---
    async getActiveSeason(ctx: RequestContext): Promise<SiteSeason | null> {
        const now = new Date();
        return this.connection.getRepository(ctx, SiteSeason)
            .createQueryBuilder('season')
            .leftJoinAndSelect('season.preset', 'preset')
            .where('season.isActive = :isActive', { isActive: true })
            .andWhere('(season.startDate IS NULL OR season.startDate <= :now)', { now })
            .andWhere('(season.endDate IS NULL OR season.endDate >= :now)', { now })
            .orderBy('season.updatedAt', 'DESC')
            .getOne();
    }

    async findAllSeasons(ctx: RequestContext): Promise<SiteSeason[]> {
        return this.connection.getRepository(ctx, SiteSeason).find({
            relations: ['preset'],
            order: { createdAt: 'DESC' }
        });
    }

    async createSeason(ctx: RequestContext, input: any): Promise<SiteSeason> {
        let preset = null;
        if (input.presetId) {
            preset = await this.connection.getEntityOrThrow(ctx, PagePreset, input.presetId);
        }
        const season = new SiteSeason({ ...input, preset });
        return this.connection.getRepository(ctx, SiteSeason).save(season);
    }

    async updateSeason(ctx: RequestContext, input: any): Promise<SiteSeason> {
        const season = await this.connection.getEntityOrThrow(ctx, SiteSeason, input.id);
        if (input.presetId !== undefined) {
            if (input.presetId) {
                season.preset = await this.connection.getEntityOrThrow(ctx, PagePreset, input.presetId);
            } else {
                season.preset = null as any;
            }
        }
        Object.assign(season, input);
        return this.connection.getRepository(ctx, SiteSeason).save(season);
    }

    async deleteSeason(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const season = await this.connection.getEntityOrThrow(ctx, SiteSeason, id);
        await this.connection.getRepository(ctx, SiteSeason).remove(season);
        return { result: DeletionResult.DELETED };
    }

    async createPage(ctx: RequestContext, input: any): Promise<Page> {
        const page = new Page(input);
        return this.connection.getRepository(ctx, Page).save(page);
    }

    async updatePage(ctx: RequestContext, input: any): Promise<Page> {
        const page = await this.connection.getEntityOrThrow(ctx, Page, input.id);
        const updatedPage = Object.assign(page, input);
        return this.connection.getRepository(ctx, Page).save(updatedPage);
    }

    async deletePage(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const page = await this.connection.getEntityOrThrow(ctx, Page, id);
        await this.connection.getRepository(ctx, Page).remove(page);
        return {
            result: DeletionResult.DELETED,
        };
    }

    async ensureHomePage(ctx: RequestContext) {
        console.log('[CMSService] Checking for "home" page...');
        let homepage = await this.connection.getRepository(ctx, Page).findOne({
            where: { slug: 'home' },
            relations: ['sections']
        });

        if (!homepage) {
            console.log('[CMSService] No "home" page found. Creating default with sections...');
            try {
                homepage = await this.createPage(ctx, {
                    slug: 'home',
                    title: 'Boutique AHIZAN - Accueil',
                    type: 'HOME',
                    isActive: true
                });
            } catch (err: any) {
                console.error('[CMSService] Failed to create default "home" page:', err.message);
                return;
            }
        }

        // Mandatory sections for the storefront layout to work correctly
        const mandatoryTypes = ['THEME_SETTINGS', 'HEADER_CONF', 'TOP_BAR', 'FOOTER_CONF'];
        const existingTypes = (homepage.sections || []).map(s => s.type);
        const missingMandatory = mandatoryTypes.some(type => !existingTypes.includes(type));

        if (homepage && (!homepage.sections || homepage.sections.length === 0 || missingMandatory)) {
            console.log(`[CMSService] Home page needs ${missingMandatory ? 'missing mandatory sections' : 'initialization'}. Attempting legacy migration...`);
            await this.migrateLegacyData(ctx, homepage.id);
        } else {
            console.log('[CMSService] "home" page already exists and is fully populated.');
        }
    }

    async migrateLegacyData(ctx: RequestContext, pageId: ID) {
        // Paths from BannerService
        const staticPath = path.join(process.cwd(), 'static');
        const paths = {
            banner: path.join(staticPath, 'banner-config.json'),
            hero: path.join(staticPath, 'hero-config.json'),
            promo: path.join(staticPath, 'promo-config.json'),
            flash: path.join(staticPath, 'flash-versions.json'),
            general: path.join(staticPath, 'general-config.json')
        };

        const readJson = async (p: string) => {
            try { return JSON.parse(await fs.readFile(p, 'utf-8')); } catch { return null; }
        };

        const [banner, hero, promo, flash, general] = await Promise.all([
            readJson(paths.banner), readJson(paths.hero), readJson(paths.promo),
            readJson(paths.flash), readJson(paths.general)
        ]);

        await this.clearPageSections(ctx, pageId);
        let order = 0;

        // 1. THEME & GENERAL
        if (general) {
            await this.createSection(ctx, {
                pageId, type: 'THEME_SETTINGS', title: '🎨 Thème & Couleurs', order: order++, isActive: true,
                dataJson: JSON.stringify({
                    primaryColor: '#0f172a',
                    backgroundColor: general.background?.value || '#ffffff',
                    backgroundType: general.background?.type || 'color'
                })
            });
        }

        // 2. HEADER
        await this.createSection(ctx, {
            pageId, type: 'HEADER_CONF', title: 'Header & Navigation', order: order++, isActive: true,
            dataJson: JSON.stringify({
                siteName: 'AHIZAN',
                logoUrl: general?.logoUrl || '',
                sticky: true,
                menuItems: [{ label: 'Accueil', link: '/' }, { label: 'Boutique', link: '/search' }]
            })
        });

        // 3. TOP BAR (from banner-config)
        if (banner) {
            await this.createSection(ctx, {
                pageId, type: 'TOP_BAR', title: 'Flash Info', order: order++, isActive: banner.isActive,
                dataJson: JSON.stringify({
                    text: banner.mainText || banner.topText,
                    backgroundColor: '#e31837',
                    textColor: 'white'
                })
            });
        }

        // 4. HERO
        if (hero) {
            const template = hero.selectedTemplate || 'classic';
            const config = hero[template] || {};
            await this.createSection(ctx, {
                pageId, type: 'HERO', title: '🚀 Section Héro', order: order++, isActive: true,
                dataJson: JSON.stringify({
                    title: config.title || config.mainTitle,
                    subtitle: config.subtitle || config.mainSubtitle,
                    ctaText: config.buttonText || config.mainButtonText,
                    ctaLink: config.buttonLink || config.mainButtonLink,
                    backgroundImage: config.bgUrl,
                    height: "md"
                })
            });
        }

        // 5. FLASH DEALS
        if (Array.isArray(flash)) {
            for (const f of flash.filter(v => v.isActive)) {
                await this.createSection(ctx, {
                    pageId, type: 'FLASH_DEALS', title: `🔥 ${f.name || 'Vente Flash'}`, order: order++, isActive: true,
                    dataJson: JSON.stringify(f)
                });
            }
        }

        // 6. PROMO (QuickLinks)
        if (promo) {
            if (promo.showQuickLinks) {
                await this.createSection(ctx, {
                    pageId, type: 'CATEGORIES', title: '� Nos Catégories', order: order++, isActive: true,
                    dataJson: JSON.stringify({ title: "Nos Catégories", layout: "grid" })
                });
            }
        }

        // 7. FOOTER
        await this.createSection(ctx, {
            pageId, type: 'FOOTER_CONF', title: '🗺️ Pied de page', order: order++, isActive: true,
            dataJson: JSON.stringify({
                about: "AHIZAN marketplace.",
                copyrightText: "© 2026 AHIZAN. Tous droits réservés."
            })
        });

        console.log(`[CMSService] Legacy migration completed for page ${pageId}. Created ${order} sections.`);
    }

    async clearPageSections(ctx: RequestContext, pageId: ID) {
        const repository = await this.connection.getRepository(ctx, PageSection);
        const sections = await repository.find({ where: { page: { id: pageId } } });
        if (sections.length > 0) {
            await repository.remove(sections);
        }
    }

    async initializeHomePage(ctx: RequestContext, pageId: ID) {
        // Clear existing sections first to avoid duplicates when resetting
        await this.clearPageSections(ctx, pageId);

        // --- GLOBAL CONFIGS (Invisible in front but stored in CMS) ---

        // 0. THEME SETTINGS (Colors, Fonts)
        await this.createSection(ctx, {
            pageId,
            type: 'THEME_SETTINGS',
            title: '🎨 Thème & Couleurs',
            order: 0,
            isActive: true,
            dataJson: JSON.stringify({
                primaryColor: '#0f172a',
                secondaryColor: '#f59e0b',
                backgroundColor: '#ffffff',
                fontFamily: 'Inter, sans-serif',
                borderRadius: '8px',
                layoutMode: 'boxed',
                backgroundType: 'color',
                backgroundImageUrl: '',
                backgroundVideoUrl: ''
            })
        });

        // 2. Header Configuration
        await this.createSection(ctx, {
            pageId,
            type: 'HEADER_CONF',
            title: 'Header & Navigation',
            order: 2,
            isActive: true,
            dataJson: JSON.stringify({
                siteName: 'AHIZAN',
                logoUrl: '',
                sticky: true,
                layoutType: 'standard',
                columnCount: 1,
                columnsData: [],
                menuItems: [
                    { label: 'Accueil', link: '/' },
                    { label: 'Boutique', link: '/search' },
                    { label: 'Vendeurs', link: '/vendors' }
                ],
                showSearch: true,
                searchPlaceholder: 'Rechercher un produit, une marque ou une catégorie',
                showVendorLink: true,
                vendorLinkText: 'Vendez sur AHIZAN',
                vendorLinkUrl: '/register',
                helpLinks: [{ label: 'Aide', link: '/help' }]
            })
        });

        // --- VISUAL SECTIONS ---

        // 3. Hero Section
        await this.createSection(ctx, {
            pageId,
            type: 'HERO',
            title: '🚀 Section Héro',
            order: 3,
            isActive: true,
            dataJson: JSON.stringify({
                title: "Découvrez l'Afrique Autrement",
                subtitle: "La première plateforme de commerce électronique panafricaine dédiée aux produits authentiques.",
                ctaText: "Acheter Maintenant",
                ctaLink: "/search",
                backgroundImage: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b",
                textAlign: "center",
                overlayColor: "rgba(15, 23, 42, 0.5)",
                height: "md"
            })
        });

        
        // 5. Featured Products
        await this.createSection(ctx, {
            pageId,
            type: 'PRODUCT_GRID',
            title: '✨ Meilleures Ventes',
            order: 5,
            isActive: true,
            dataJson: JSON.stringify({
                filterType: "BEST_SELLERS",
                take: 8,
                layout: "carousel"
            })
        });

        // 6. Blog Posts
        await this.createSection(ctx, {
            pageId,
            type: 'BLOG_POSTS',
            title: '📖 Nos Publications',
            order: 6,
            isActive: true,
            dataJson: JSON.stringify({
                title: "Dernières Actualités",
                description: "Conseils, tendances et coulisses d'AHIZAN.",
                count: 3,
                layout: "grid"
            })
        });

        // 7. Footer
        await this.createSection(ctx, {
            pageId,
            type: 'FOOTER_CONF',
            title: '🗺️ Pied de page',
            order: 7,
            isActive: true,
            dataJson: JSON.stringify({
                about: "AHIZAN est votre marketplace de confiance pour le shopping en ligne au Bénin.",
                facebook: "https://facebook.com/ahizan",
                whatsapp: "+22900000000",
                showNewsletter: true,
                newsletterTitle: "NOUVEAU SUR AHIZAN ?",
                newsletterSubtitle: "Inscrivez-vous pour recevoir nos offres exclusives.",
                linkGroups: [
                    { title: "BESOIN D'AIDE ?", links: [{ label: 'Discuter avec nous', link: '/contact' }, { label: 'Aide & FAQ', link: '/help' }] },
                    { title: 'LIENS UTILES', links: [{ label: 'Suivre sa commande', link: '/account/orders' }, { label: 'Politique de retour', link: '/returns' }] },
                    { title: 'À PROPOS', links: [{ label: 'Qui sommes-nous', link: '/about' }, { label: 'Conditions générales', link: '/terms' }] }
                ],
                paymentMethods: ['Mobile Money', 'Cash'],
                copyrightText: "© 2026 AHIZAN. Tous droits réservés."
            })
        });

        return this.findOne(ctx, pageId);
    }

    async createSection(ctx: RequestContext, input: any): Promise<PageSection> {
        const page = await this.connection.getEntityOrThrow(ctx, Page, input.pageId);
        const section = new PageSection(input);
        section.page = page;
        return this.connection.getRepository(ctx, PageSection).save(section);
    }

    async updateSection(ctx: RequestContext, input: any): Promise<PageSection> {
        const section = await this.connection.getEntityOrThrow(ctx, PageSection, input.id);
        const updatedSection = Object.assign(section, input);
        return this.connection.getRepository(ctx, PageSection).save(updatedSection);
    }

    async deleteSection(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const section = await this.connection.getEntityOrThrow(ctx, PageSection, id);
        await this.connection.getRepository(ctx, PageSection).remove(section);
        return {
            result: 'DELETED' as any,
        };
    }

    // --- Presets ---

    async findAllPresets(ctx: RequestContext): Promise<PagePreset[]> {
        return this.connection.getRepository(ctx, PagePreset).find({ order: { createdAt: 'DESC' } });
    }

    async createPreset(ctx: RequestContext, input: any): Promise<PagePreset> {
        this.validatePresetData(input);
        const preset = new PagePreset(input);
        return this.connection.getRepository(ctx, PagePreset).save(preset);
    }

    async updatePreset(ctx: RequestContext, input: any): Promise<PagePreset> {
        this.validatePresetData(input);
        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, input.id);
        Object.assign(preset, input);
        return this.connection.getRepository(ctx, PagePreset).save(preset);
    }

    async deletePreset(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, id);
        if (preset.isDefault) {
            throw new Error("Impossible de supprimer l'habillage par défaut");
        }
        await this.connection.getRepository(ctx, PagePreset).remove(preset);
        return { result: 'DELETED' as any };
    }

    private validatePresetData(input: any): void {
        if (input.sectionsJson) {
            let parsed;
            try { parsed = JSON.parse(input.sectionsJson); } catch { throw new Error('sectionsJson invalide'); }
            if (!Array.isArray(parsed)) throw new Error('sectionsJson doit être un tableau');
            // Permissive validation: just warn on unknown types, don't block
            const knownTypes = ['TOP_BAR','THEME_SETTINGS','HEADER_CONF','HERO','FLASH_DEALS','QUICK_LINKS',
                'CATEGORIES','CATEGORY_GRID','PRODUCT_GRID','TABBED_PRODUCT_GRID','FOOTER_CONF','FEATURES','MODALS',
                'CUSTOM','BLOG_POSTS','TESTIMONIALS','NEWSLETTER','CTA_VENDOR','COLLECTION_HEADER',
                'PROMO_BANNER','PROMO_GRID','FLEX_GRID','SEARCH_BAR','RECENTLY_VIEWED','HERO_SLIDER',
                'VENDOR_SHOWCASE','CTA','SOCIAL_PROOF','BRAND_BAR','SEASONAL_BANNER'];
            for (const s of parsed) {
                if (!s.type) throw new Error('Section sans type détectée');
                if (!knownTypes.includes(s.type)) {
                    console.warn(`[CMS] Type de section non reconnu: ${s.type} — sera conservé tel quel`);
                }
            }
        }
        if (input.sectionsJson && input.sectionsJson.length > 2 * 1024 * 1024) {
            throw new Error('Preset trop volumineux (max 2MB)');
        }
    }

    async applyPreset(ctx: RequestContext, presetId: ID, pageId: ID): Promise<Page | null> {
        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, presetId);

        // AUTO-BACKUP: save current state before overwriting
        const currentPage = await this.findOne(ctx, pageId);
        if (currentPage && currentPage.sections?.length > 0) {
            await this.savePageAsPreset(ctx, pageId,
                `auto-backup-${Date.now()}`, "Sauvegarde automatique avant changement d'habillage");
        }

        await this.clearPageSections(ctx, pageId);

        const sections = JSON.parse(preset.sectionsJson);
        for (const sectionData of sections) {
            await this.createSection(ctx, {
                pageId,
                type: sectionData.type,
                title: sectionData.title || '',
                description: sectionData.description || '',
                layout: sectionData.layout || 'grid',
                order: sectionData.order || 0,
                isActive: sectionData.isActive !== false,
                dataJson: typeof sectionData.dataJson === 'string' ? sectionData.dataJson : JSON.stringify(sectionData.dataJson || {}),
            });
        }

        return this.findOne(ctx, pageId);
    }

    async savePageAsPreset(ctx: RequestContext, pageId: ID, name: string, description?: string): Promise<PagePreset> {
        const page = await this.findOne(ctx, pageId);
        if (!page) throw new Error(`Page ${pageId} not found`);

        const sectionsData = (page.sections || []).map(s => ({
            type: s.type,
            title: s.title,
            description: s.description,
            layout: s.layout,
            order: s.order,
            isActive: s.isActive,
            dataJson: s.dataJson,
        }));

        return this.createPreset(ctx, {
            name,
            description: description || '',
            sectionsJson: JSON.stringify(sectionsData),
            isBuiltIn: false,
        });
    }

    // --- Draft System ---

    async createDraftFromPreset(ctx: RequestContext, presetId: ID): Promise<PagePreset> {
        const sourcePreset = await this.connection.getEntityOrThrow(ctx, PagePreset, presetId);
        const userId = ctx.activeUserId;
        if (!userId) throw new Error('Utilisateur non authentifié');

        // Archive any existing draft for this user
        await this.archiveUserDrafts(ctx, userId);

        const draft = new PagePreset({
            name: `Draft: ${sourcePreset.name}`,
            description: `Brouillon basé sur "${sourcePreset.name}"`,
            sectionsJson: sourcePreset.sectionsJson,
            thumbnail: sourcePreset.thumbnail,
            isBuiltIn: false,
            isDraft: true,
            draftOwnerId: userId,
            draftSessionId: `session-${Date.now()}`,
            status: 'draft',
            version: 1,
            sourcePresetId: sourcePreset.id,
        });
        return this.connection.getRepository(ctx, PagePreset).save(draft);
    }

    async createDraftFromCurrentPage(ctx: RequestContext, pageId: ID): Promise<PagePreset> {
        const userId = ctx.activeUserId;
        if (!userId) throw new Error('Utilisateur non authentifié');

        // Archive any existing draft for this user
        await this.archiveUserDrafts(ctx, userId);

        const page = await this.findOne(ctx, pageId);
        if (!page) throw new Error(`Page ${pageId} non trouvée`);

        const sectionsData = (page.sections || []).map(s => ({
            type: s.type,
            title: s.title,
            description: s.description,
            layout: s.layout,
            order: s.order,
            isActive: s.isActive,
            dataJson: s.dataJson,
        }));

        const sourceId = page.activePreset?.id || null;

        const draft = new PagePreset({
            name: `Draft: ${page.title}`,
            description: `Brouillon basé sur la page "${page.title}"`,
            sectionsJson: JSON.stringify(sectionsData),
            isBuiltIn: false,
            isDraft: true,
            draftOwnerId: userId,
            draftSessionId: `session-${Date.now()}`,
            status: 'draft',
            version: 1,
            sourcePresetId: sourceId,
        });
        return this.connection.getRepository(ctx, PagePreset).save(draft);
    }

    async getActiveDraft(ctx: RequestContext): Promise<PagePreset | null> {
        const userId = ctx.activeUserId;
        if (!userId) return null;

        const draft = await this.connection.getRepository(ctx, PagePreset)
            .createQueryBuilder('preset')
            .where('preset.isDraft = :isDraft', { isDraft: true })
            .andWhere('preset.draftOwnerId = :ownerId', { ownerId: userId })
            .andWhere('preset.status = :status', { status: 'draft' })
            .orderBy('preset.createdAt', 'DESC')
            .getOne();

        return draft || null;
    }

    async updateDraftSection(ctx: RequestContext, draftId: ID, sectionType: string, sectionDataJson: string): Promise<PagePreset> {
        const draft = await this.connection.getEntityOrThrow(ctx, PagePreset, draftId);
        if (!draft.isDraft) throw new Error('Ce preset n\'est pas un brouillon');

        let sections = JSON.parse(draft.sectionsJson);
        const idx = sections.findIndex((s: any) => s.type === sectionType);
        const newSectionData = JSON.parse(sectionDataJson);

        if (idx >= 0) {
            sections[idx] = { ...sections[idx], ...newSectionData, type: sectionType };
        } else {
            sections.push({ ...newSectionData, type: sectionType, order: sections.length });
        }

        draft.sectionsJson = JSON.stringify(sections);
        return this.connection.getRepository(ctx, PagePreset).save(draft);
    }

    async publishDraft(ctx: RequestContext, draftId: ID, pageId: ID): Promise<Page> {
        const draft = await this.connection.getEntityOrThrow(ctx, PagePreset, draftId);
        if (!draft.isDraft) throw new Error('Ce preset n\'est pas un brouillon');

        // AUTO-BACKUP: save current state before overwriting
        const currentPage = await this.findOne(ctx, pageId);
        if (currentPage && currentPage.sections?.length > 0) {
            await this.savePageAsPreset(ctx, pageId,
                `auto-backup-${Date.now()}`, "Sauvegarde automatique avant publication du draft");
        }

        // Apply draft sections to page
        await this.clearPageSections(ctx, pageId);
        const sections = JSON.parse(draft.sectionsJson);
        for (const sectionData of sections) {
            await this.createSection(ctx, {
                pageId,
                type: sectionData.type,
                title: sectionData.title || '',
                description: sectionData.description || '',
                layout: sectionData.layout || 'grid',
                order: sectionData.order || 0,
                isActive: sectionData.isActive !== false,
                dataJson: typeof sectionData.dataJson === 'string' ? sectionData.dataJson : JSON.stringify(sectionData.dataJson || {}),
            });
        }

        // Update draft status → published
        draft.isDraft = false;
        draft.status = 'published';
        draft.publishedAt = new Date();
        draft.previousPresetId = draft.sourcePresetId;
        draft.version = (draft.version || 1) + 1;
        draft.draftOwnerId = null as any;
        draft.draftSessionId = null as any;
        await this.connection.getRepository(ctx, PagePreset).save(draft);

        // Set activePreset on the page
        const page = await this.findOne(ctx, pageId);
        if (page) {
            page.activePreset = draft;
            await this.connection.getRepository(ctx, Page).save(page);
        }

        return this.findOne(ctx, pageId) as Promise<Page>;
    }

    async createPresetFromDraft(ctx: RequestContext, draftId: ID, name: string, description?: string): Promise<PagePreset> {
        const draft = await this.connection.getEntityOrThrow(ctx, PagePreset, draftId);
        if (!draft.isDraft) throw new Error('Ce preset n\'est pas un brouillon');

        const preset = new PagePreset({
            name,
            description: description || '',
            sectionsJson: draft.sectionsJson,
            thumbnail: draft.thumbnail,
            isBuiltIn: false,
            isDraft: false,
            status: 'published',
            version: 1,
            sourcePresetId: draft.sourcePresetId,
        });
        return this.connection.getRepository(ctx, PagePreset).save(preset);
    }

    async updatePresetFromDraft(ctx: RequestContext, draftId: ID, presetId: ID): Promise<PagePreset> {
        const draft = await this.connection.getEntityOrThrow(ctx, PagePreset, draftId);
        if (!draft.isDraft) throw new Error('Ce preset n\'est pas un brouillon');

        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, presetId);

        // Versioning: save previous version as backup
        const backup = new PagePreset({
            name: `${preset.name} (v${preset.version})`,
            description: `Version antérieure`,
            sectionsJson: preset.sectionsJson,
            thumbnail: preset.thumbnail,
            isBuiltIn: false,
            isDraft: false,
            status: 'archived',
            version: preset.version,
            previousPresetId: preset.previousPresetId,
            sourcePresetId: preset.sourcePresetId,
        });
        await this.connection.getRepository(ctx, PagePreset).save(backup);

        // Update preset with draft data
        preset.sectionsJson = draft.sectionsJson;
        preset.thumbnail = draft.thumbnail;
        preset.version = (preset.version || 1) + 1;
        preset.previousPresetId = backup.id;
        return this.connection.getRepository(ctx, PagePreset).save(preset);
    }

    async archivePreset(ctx: RequestContext, presetId: ID): Promise<PagePreset> {
        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, presetId);
        if (preset.isDraft) throw new Error('Impossible d\'archiver un brouillon');
        preset.status = 'archived';
        return this.connection.getRepository(ctx, PagePreset).save(preset);
    }

    async restorePresetVersion(ctx: RequestContext, presetId: ID): Promise<PagePreset> {
        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, presetId);
        if (preset.status !== 'archived') throw new Error('Seuls les presets archivés peuvent être restaurés');
        preset.status = 'published';
        return this.connection.getRepository(ctx, PagePreset).save(preset);
    }

    // --- SeasonSchedule ---

    async findAllSeasonSchedules(ctx: RequestContext): Promise<any[]> {
        const repo = this.connection.getRepository(ctx, 'SeasonSchedule');
        return repo.find({ order: { priority: 'DESC' } });
    }

    async createSeasonSchedule(ctx: RequestContext, input: any): Promise<any> {
        const repo = this.connection.getRepository(ctx, 'SeasonSchedule');
        return repo.save(repo.create(input));
    }

    async updateSeasonSchedule(ctx: RequestContext, input: any): Promise<any> {
        const repo = this.connection.getRepository(ctx, 'SeasonSchedule');
        const schedule = await repo.findOne({ where: { id: input.id } });
        if (!schedule) throw new Error(`SeasonSchedule ${input.id} non trouvé`);
        Object.assign(schedule, input);
        return repo.save(schedule);
    }

    async deleteSeasonSchedule(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const repo = this.connection.getRepository(ctx, 'SeasonSchedule');
        const schedule = await repo.findOne({ where: { id } as any });
        if (!schedule) throw new Error(`SeasonSchedule ${id} non trouvé`);
        await repo.remove(schedule);
        return { result: 'DELETED' as any };
    }

    // --- Draft Helpers ---

    private async archiveUserDrafts(ctx: RequestContext, userId: ID): Promise<void> {
        const repo = this.connection.getRepository(ctx, PagePreset);
        const existingDrafts = await repo.find({
            where: { isDraft: true, draftOwnerId: userId as any, status: 'draft' } as any,
        });
        for (const d of existingDrafts) {
            d.status = 'archived';
            d.isDraft = false;
            await repo.save(d);
        }
    }

    // --- Season Auto-Activation (Cron Job) ---

    async checkSeasonState(ctx: RequestContext): Promise<void> {
        const now = Date.now();
        if (now - this.lastSeasonCheck < this.SEASON_CHECK_INTERVAL) return;
        this.lastSeasonCheck = now;

        // 1. Deactivate expired seasons
        const activeSeasons = await this.connection.getRepository(ctx, SiteSeason)
            .createQueryBuilder('season')
            .leftJoinAndSelect('season.preset', 'preset')
            .where('season.isActive = :isActive', { isActive: true })
            .getMany();

        for (const season of activeSeasons) {
            if (season.endDate && new Date(season.endDate) < new Date()) {
                season.isActive = false;
                await this.connection.getRepository(ctx, SiteSeason).save(season);

                // Re-apply default preset on home page
                const defaultPreset = await this.connection.getRepository(ctx, PagePreset)
                    .findOne({ where: { isDefault: true } });
                if (defaultPreset) {
                    const homePage = await this.connection.getRepository(ctx, Page)
                        .findOne({ where: { slug: 'home' } });
                    if (homePage) await this.applyPreset(ctx, defaultPreset.id, homePage.id);
                }
            }
        }

        // 2. Activate seasons whose start date is reached
        const inactiveSeasons = await this.connection.getRepository(ctx, SiteSeason)
            .createQueryBuilder('season')
            .leftJoinAndSelect('season.preset', 'preset')
            .where('season.isActive = :isActive', { isActive: false })
            .getMany();

        for (const season of inactiveSeasons) {
            if (season.startDate && new Date(season.startDate) <= new Date()
                && (!season.endDate || new Date(season.endDate) >= new Date())) {
                season.isActive = true;
                await this.connection.getRepository(ctx, SiteSeason).save(season);

                // Apply the season's preset on home page
                if (season.preset) {
                    const homePage = await this.connection.getRepository(ctx, Page)
                        .findOne({ where: { slug: 'home' } });
                    if (homePage) await this.applyPreset(ctx, season.preset.id, homePage.id);
                }
            }
        }
    }

    // --- Preview Preset ---

    async previewPreset(ctx: RequestContext, presetId: ID): Promise<Page | null> {
        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, presetId);
        const homePage = await this.findOneBySlug(ctx, 'home');
        if (!homePage) return null;

        const sections = JSON.parse(preset.sectionsJson).map((s: any) => ({
            ...s,
            id: `preview-${s.type}-${s.order}`,
            dataJson: typeof s.dataJson === 'string' ? s.dataJson : JSON.stringify(s.dataJson || {}),
        }));

        return { ...homePage, sections } as Page;
    }

    async previewHabillage(ctx: RequestContext, presetId: ID): Promise<any> {
        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, presetId);
        const rawSections = JSON.parse(preset.sectionsJson);

        const sections = (Array.isArray(rawSections) ? rawSections : []).map((s: any, i: number) => ({
            id: `preview-${s.type}-${i}`,
            type: s.type || 'CUSTOM',
            title: s.title || '',
            description: s.description || '',
            layout: s.layout || 'grid',
            order: s.order ?? i,
            isActive: s.isActive !== false,
            dataJson: typeof s.dataJson === 'string' ? s.dataJson : JSON.stringify(s.dataJson || {}),
        }));

        return {
            id: preset.id,
            name: preset.name,
            isDefault: preset.isDefault,
            isBackup: preset.isBackup,
            sections,
        };
    }

    // --- Habillage System ---

    async getActiveHabillage(ctx: RequestContext): Promise<PagePreset | null> {
        const homePage = await this.findOneBySlug(ctx, 'home');
        if (!homePage?.activePreset) return null;
        return this.connection.getRepository(ctx, PagePreset).findOne({
            where: { id: homePage.activePreset.id }
        });
    }

    async findHabillages(ctx: RequestContext, status?: string, isBackup?: boolean): Promise<PagePreset[]> {
        const qb = this.connection.getRepository(ctx, PagePreset)
            .createQueryBuilder('preset')
            .orderBy('preset.isDefault', 'DESC')
            .addOrderBy('preset.createdAt', 'DESC');

        if (status) {
            qb.andWhere('preset.status = :status', { status });
        }
        if (isBackup !== undefined) {
            qb.andWhere('preset.isBackup = :isBackup', { isBackup });
        }
        return qb.getMany();
    }

    async createInstantHabillage(ctx: RequestContext, name: string): Promise<PagePreset> {
        // Snapshot current storefront state
        const homePage = await this.findOneBySlug(ctx, 'home');
        const sectionsData = homePage ? (homePage.sections || []).map(s => ({
            type: s.type,
            title: s.title,
            description: s.description,
            layout: s.layout,
            order: s.order,
            isActive: s.isActive,
            dataJson: s.dataJson,
        })) : [];

        const sectionsJson = JSON.stringify(sectionsData);
        const history = [sectionsJson];

        const habillage = new PagePreset({
            name,
            description: `Habillage créé le ${new Date().toLocaleString('fr-FR')}`,
            sectionsJson,
            isBuiltIn: false,
            isDraft: false,
            isBackup: false,
            status: 'published',
            version: 1,
            changeHistory: JSON.stringify(history),
            historyPointer: 0,
        });
        return this.connection.getRepository(ctx, PagePreset).save(habillage);
    }

    async openHabillage(ctx: RequestContext, presetId: ID): Promise<PagePreset> {
        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, presetId);

        // Initialize change history if empty
        if (!preset.changeHistory) {
            const history = [preset.sectionsJson];
            preset.changeHistory = JSON.stringify(history);
            preset.historyPointer = 0;
            await this.connection.getRepository(ctx, PagePreset).save(preset);
        }

        return preset;
    }

    async setHabillageDefault(ctx: RequestContext, presetId: ID): Promise<PagePreset> {
        // Unset current default
        const currentDefault = await this.connection.getRepository(ctx, PagePreset)
            .findOne({ where: { isDefault: true } });
        if (currentDefault) {
            currentDefault.isDefault = false;
            await this.connection.getRepository(ctx, PagePreset).save(currentDefault);
        }

        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, presetId);
        preset.isDefault = true;
        return this.connection.getRepository(ctx, PagePreset).save(preset);
    }

    async unsetHabillageDefault(ctx: RequestContext, presetId: ID): Promise<PagePreset> {
        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, presetId);
        preset.isDefault = false;
        return this.connection.getRepository(ctx, PagePreset).save(preset);
    }

    async undoHabillage(ctx: RequestContext, presetId: ID): Promise<PagePreset> {
        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, presetId);

        if (!preset.changeHistory) throw new Error('Aucun historique disponible');

        const history: string[] = JSON.parse(preset.changeHistory);
        const pointer = preset.historyPointer;

        if (pointer <= 0) throw new Error('Rien à annuler');

        const newPointer = pointer - 1;
        preset.sectionsJson = history[newPointer];
        preset.historyPointer = newPointer;

        return this.connection.getRepository(ctx, PagePreset).save(preset);
    }

    async redoHabillage(ctx: RequestContext, presetId: ID): Promise<PagePreset> {
        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, presetId);

        if (!preset.changeHistory) throw new Error('Aucun historique disponible');

        const history: string[] = JSON.parse(preset.changeHistory);
        const pointer = preset.historyPointer;

        if (pointer >= history.length - 1) throw new Error('Rien à rétablir');

        const newPointer = pointer + 1;
        preset.sectionsJson = history[newPointer];
        preset.historyPointer = newPointer;

        return this.connection.getRepository(ctx, PagePreset).save(preset);
    }

    async autoSaveHabillage(ctx: RequestContext, presetId: ID, sectionsJson: string): Promise<PagePreset> {
        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, presetId);

        // Push to change history, truncating any redo states
        let history: string[] = preset.changeHistory ? JSON.parse(preset.changeHistory) : [];
        const pointer = preset.historyPointer >= 0 ? preset.historyPointer : history.length - 1;

        // Truncate future states beyond current pointer
        history = history.slice(0, pointer + 1);
        // Append new state
        history.push(sectionsJson);

        // Keep history manageable (max 50 entries)
        if (history.length > 50) {
            history = history.slice(history.length - 50);
        }

        preset.sectionsJson = sectionsJson;
        preset.changeHistory = JSON.stringify(history);
        preset.historyPointer = history.length - 1;

        return this.connection.getRepository(ctx, PagePreset).save(preset);
    }

    async publishHabillage(ctx: RequestContext, presetId: ID, pageId: ID): Promise<Page> {
        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, presetId);

        // Only auto-backup if the current active preset is NOT the default
        const currentPage = await this.findOne(ctx, pageId);
        if (currentPage && currentPage.sections?.length > 0) {
            const currentActiveId = currentPage.activePreset?.id;
            const isCurrentlyDefault = currentActiveId
                ? (await this.connection.getRepository(ctx, PagePreset).findOne({ where: { id: currentActiveId } }))?.isDefault
                : false;

            if (!isCurrentlyDefault) {
                // Auto-backup current state before overwriting
                await this.savePageAsPreset(ctx, pageId,
                    `auto-backup-${Date.now()}`, "Sauvegarde automatique avant changement d'habillage");
                // Mark backup
                const backups = await this.connection.getRepository(ctx, PagePreset)
                    .find({ where: { name: `auto-backup-${Date.now()}` } as any });
                // The backup was just created, find latest
                const latestBackup = await this.connection.getRepository(ctx, PagePreset)
                    .createQueryBuilder('preset')
                    .where('preset.name LIKE :name', { name: 'auto-backup-%' })
                    .orderBy('preset.createdAt', 'DESC')
                    .getOne();
                if (latestBackup) {
                    latestBackup.isBackup = true;
                    await this.connection.getRepository(ctx, PagePreset).save(latestBackup);
                }
            }
        }

        // Apply preset sections to page
        await this.clearPageSections(ctx, pageId);
        const sections = JSON.parse(preset.sectionsJson);
        for (const sectionData of sections) {
            await this.createSection(ctx, {
                pageId,
                type: sectionData.type,
                title: sectionData.title || '',
                description: sectionData.description || '',
                layout: sectionData.layout || 'grid',
                order: sectionData.order || 0,
                isActive: sectionData.isActive !== false,
                dataJson: typeof sectionData.dataJson === 'string' ? sectionData.dataJson : JSON.stringify(sectionData.dataJson || {}),
            });
        }

        // Set activePreset on the page
        const page = await this.findOne(ctx, pageId);
        if (page) {
            page.activePreset = preset;
            await this.connection.getRepository(ctx, Page).save(page);
        }

        return this.findOne(ctx, pageId) as Promise<Page>;
    }

    async deleteHabillage(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, id);
        if (preset.isDefault) {
            throw new Error("Impossible de supprimer l'habillage par défaut");
        }
        await this.connection.getRepository(ctx, PagePreset).remove(preset);
        return { result: 'DELETED' as any };
    }
}
