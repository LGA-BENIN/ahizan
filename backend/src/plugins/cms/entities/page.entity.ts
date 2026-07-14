import { VendureEntity, DeepPartial, ID } from '@vendure/core';
import { Entity, Column, OneToMany, ManyToOne } from 'typeorm';
import { PageSection } from './section.entity';
import { PagePreset } from './page-preset.entity';

@Entity()
export class Page extends VendureEntity {
    constructor(input?: DeepPartial<Page>) {
        super(input);
    }

    @Column({ unique: true })
    slug: string;

    @Column()
    title: string;

    @Column({ nullable: true })
    metaDescription: string;

    @Column({ nullable: true })
    metaTitle: string;

    @Column({ nullable: true })
    metaKeywords: string;

    @Column({ nullable: true })
    ogImage: string;

    @Column({ default: 'HOME' })
    type: string;

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'varchar', nullable: true })
    image: string;

    @Column({ type: 'varchar', nullable: true })
    icon: string;

    @OneToMany(type => PageSection, section => section.page)
    sections: PageSection[];

    // --- Draft/Habillage system ---
    @ManyToOne(() => PagePreset, { nullable: true })
    activePreset: PagePreset;
}
