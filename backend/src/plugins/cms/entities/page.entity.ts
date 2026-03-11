import { VendureEntity, DeepPartial } from '@vendure/core';
import { Entity, Column, OneToMany } from 'typeorm';
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

    @Column({ default: 'HOME' })
    type: string;

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(type => PageSection, section => section.page)
    sections: PageSection[];
}
