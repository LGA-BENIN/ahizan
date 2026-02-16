import { Injectable } from '@nestjs/common';
import { TransactionalConnection, RequestContext, ListQueryBuilder, ListQueryOptions, PaginatedList } from '@vendure/core';
import { Page } from '../entities/page.entity';
import { PageSection } from '../entities/section.entity';

@Injectable()
export class CmsService {
    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder
    ) { }

    async findAllPages(ctx: RequestContext, options?: ListQueryOptions<Page>): Promise<PaginatedList<Page>> {
        return this.listQueryBuilder
            .build(Page, options, { ctx, relations: ['sections'] })
            .getManyAndCount()
            .then(([items, totalItems]) => ({
                items,
                totalItems,
            }));
    }

    async findOnePage(ctx: RequestContext, id: string): Promise<Page | null> {
        return this.connection.getRepository(ctx, Page).findOne({
            where: { id },
            relations: ['sections']
        });
    }

    async findPageBySlug(ctx: RequestContext, slug: string): Promise<Page | null> {
        return this.connection.getRepository(ctx, Page).findOne({
            where: { slug, isActive: true },
            relations: ['sections'],
            order: {
                sections: {
                    order: 'ASC'
                }
            }
        });
    }

    async createPage(ctx: RequestContext, input: any): Promise<Page> {
        const page = new Page(input);
        return this.connection.getRepository(ctx, Page).save(page);
    }

    async updatePage(ctx: RequestContext, input: any): Promise<Page> {
        const page = await this.findOnePage(ctx, input.id);
        if (!page) {
            throw new Error(`Page with id ${input.id} not found`);
        }
        const updated = Object.assign(page, input);
        return this.connection.getRepository(ctx, Page).save(updated);
    }

    async deletePage(ctx: RequestContext, id: string): Promise<any> {
        await this.connection.getRepository(ctx, Page).delete(id);
        return { result: 'DELETED' };
    }

    async createSection(ctx: RequestContext, input: any): Promise<PageSection> {
        const page = await this.findOnePage(ctx, input.pageId);
        if (!page) {
            throw new Error(`Page with id ${input.pageId} not found`);
        }

        const section = new PageSection({
            ...input,
            page
        });

        return this.connection.getRepository(ctx, PageSection).save(section);
    }

    async updateSection(ctx: RequestContext, input: any): Promise<PageSection> {
        const section = await this.connection.getRepository(ctx, PageSection).findOne({ where: { id: input.id } });
        if (!section) {
            throw new Error(`Section with id ${input.id} not found`);
        }
        const updated = Object.assign(section, input);
        return this.connection.getRepository(ctx, PageSection).save(updated);
    }

    async deleteSection(ctx: RequestContext, id: string): Promise<any> {
        await this.connection.getRepository(ctx, PageSection).delete(id);
        return { result: 'DELETED' };
    }
}
