import { VendureEntity, DeepPartial } from '@vendure/core';
import { Entity, Column, ManyToOne } from 'typeorm';
import { PagePreset } from './page-preset.entity';

@Entity()
export class SeasonSchedule extends VendureEntity {
    constructor(input?: DeepPartial<SeasonSchedule>) {
        super(input);
    }

    @Column()
    name: string;

    @Column({ type: 'timestamp', nullable: true })
    startAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    endAt: Date;

    @Column({ type: 'int', default: 0 })
    priority: number;

    @Column({ default: false })
    isActive: boolean;

    @ManyToOne(() => PagePreset, { nullable: true })
    preset: PagePreset;
}
