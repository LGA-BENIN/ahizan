import { VendureEntity, DeepPartial } from '@vendure/core';
import { Entity, Column, ManyToOne } from 'typeorm';
import { Page } from './page.entity';

@Entity()
export class PageSection extends VendureEntity {
    constructor(input?: DeepPartial<PageSection>) {
        super(input);
    }

    @Column()
    type: string;

    @Column({ default: '' })
    title: string;

    @Column({ default: '', type: 'text' })
    description: string;

    @Column({ default: 'grid' })
    layout: string;

    @Column({ default: 0 })
    order: number;

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'text', nullable: true })
    dataJson: string;

    @ManyToOne(type => Page, page => page.sections)
    page: Page;
}
