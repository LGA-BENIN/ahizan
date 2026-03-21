import { VendureEntity, DeepPartial } from '@vendure/core';
import { Entity, Column } from 'typeorm';

@Entity()
export class PagePreset extends VendureEntity {
    constructor(input?: DeepPartial<PagePreset>) {
        super(input);
    }

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    thumbnail: string;

    @Column({ type: 'text' })
    sectionsJson: string;

    @Column({ default: false })
    isBuiltIn: boolean;
}
