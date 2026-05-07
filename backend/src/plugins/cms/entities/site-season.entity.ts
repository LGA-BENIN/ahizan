import { VendureEntity, DeepPartial } from '@vendure/core';
import { Entity, Column, ManyToOne } from 'typeorm';
import { PagePreset } from './page-preset.entity';

@Entity()
export class SiteSeason extends VendureEntity {
    constructor(input?: DeepPartial<SiteSeason>) {
        super(input);
    }

    @Column()
    name: string;

    @Column({ type: 'timestamp', nullable: true })
    startDate: Date;

    @Column({ type: 'timestamp', nullable: true })
    endDate: Date;

    @Column({ default: false })
    isActive: boolean;

    @ManyToOne(() => PagePreset, { nullable: true })
    preset: PagePreset;

    @Column({ type: 'text', nullable: true })
    configJson: string; // Overrides for colors, logo, etc.
}
