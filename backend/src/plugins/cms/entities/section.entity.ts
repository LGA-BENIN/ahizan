import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, ManyToOne } from 'typeorm';
import { Page } from './page.entity';

@Entity()
export class PageSection extends VendureEntity {
    constructor(input?: DeepPartial<PageSection>) {
        super(input);
    }

    @Column()
    type: string; // HERO, PRODUCT_LIST, etc.

    @Column({ type: 'int', default: 0 })
    order: number;

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'text', nullable: true })
    dataJson: string; // Stored as stringified JSON

    @ManyToOne(type => Page, page => page.sections)
    page: Page;
}
