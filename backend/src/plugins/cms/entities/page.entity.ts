import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, OneToMany } from 'typeorm';
import { PageSection } from './section.entity';

@Entity()
export class Page extends VendureEntity {
    constructor(input?: DeepPartial<Page>) {
        super(input);
    }

    @Column({ unique: true })
    slug: string;

    @Column()
    title: string;

    @Column({ default: 'CUSTOM' })
    type: string; // HOME, CATEGORY, CUSTOM, etc.

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(type => PageSection, section => section.page, { cascade: true })
    sections: PageSection[];
}
