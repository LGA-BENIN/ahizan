import { Injectable } from '@nestjs/common';
import { EntityHydrator, ListQueryBuilder, TransactionalConnection, ID, RequestContext, PaginatedList } from '@vendure/core';
import { DeletionResponse, DeletionResult } from '@vendure/common/lib/generated-types';
import { Page } from '../entities/page.entity';
import { PageSection } from '../entities/section.entity';
import { PagePreset } from '../entities/page-preset.entity';

@Injectable()
export class CMSService {
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
        return this.connection.getRepository(ctx, Page).findOne({
            where: { id },
            relations: ['sections'],
        });
    }

    findOneBySlug(ctx: RequestContext, slug: string): Promise<Page | null> {
        return this.connection.getRepository(ctx, Page).findOne({
            where: { slug, isActive: true },
            relations: ['sections'],
        });
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
            console.log(`[CMSService] Home page needs ${missingMandatory ? 'missing mandatory sections' : 'initialization'}. Populating defaults...`);
            await this.initializeHomePage(ctx, homepage.id);
        } else {
            console.log('[CMSService] "home" page already exists and is fully populated.');
        }
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

        // 4. Category Grid
        await this.createSection(ctx, {
            pageId,
            type: 'CATEGORY_GRID',
            title: '📦 Nos Collections',
            order: 4,
            isActive: true,
            dataJson: JSON.stringify({
                title: "Acheter par catégorie",
                layout: "grid",
                categories: []
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
        const preset = new PagePreset(input);
        return this.connection.getRepository(ctx, PagePreset).save(preset);
    }

    async updatePreset(ctx: RequestContext, input: any): Promise<PagePreset> {
        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, input.id);
        Object.assign(preset, input);
        return this.connection.getRepository(ctx, PagePreset).save(preset);
    }

    async deletePreset(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, id);
        await this.connection.getRepository(ctx, PagePreset).remove(preset);
        return { result: 'DELETED' as any };
    }

    async applyPreset(ctx: RequestContext, presetId: ID, pageId: ID): Promise<Page | null> {
        const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, presetId);
        const page = await this.connection.getEntityOrThrow(ctx, Page, pageId);

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
}
