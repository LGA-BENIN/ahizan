import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Index } from 'typeorm';
import { VendureEntity, DeepPartial } from '@vendure/core';
import { GeoZone } from './geo-zone.entity';

@Entity()
export class GeoZoneAlias extends VendureEntity {
    constructor(input?: DeepPartial<GeoZoneAlias>) {
        super(input);
    }

    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column()
    alias: string; // e.g. "Agla Sud", "Carrefour Agla", "Pylônes Agla"

    @Index()
    @Column()
    normalizedAlias: string; // e.g. "agla sud"

    @ManyToOne(() => GeoZone, { onDelete: 'CASCADE' })
    @JoinColumn()
    geoZone: GeoZone;

    @Column({ type: 'float', default: 1.0 })
    weight: number; // Quality weight (1.0 = exact, 0.8 = colloquial)
}
