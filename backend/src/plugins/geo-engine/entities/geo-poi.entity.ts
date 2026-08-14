import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Index } from 'typeorm';
import { VendureEntity, DeepPartial } from '@vendure/core';
import { GeoZone } from './geo-zone.entity';

@Entity()
export class GeoPOI extends VendureEntity {
    constructor(input?: DeepPartial<GeoPOI>) {
        super(input);
    }

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string; // e.g. "Carrefour Cadjèhoun", "Université d'Abomey-Calavi", "CPA"

    @Column({ type: 'varchar', nullable: true })
    category: string; // e.g. "JUNCTION", "EDUCATION", "HOSPITAL", "LANDMARK"

    @Column({ type: 'float' })
    latitude: number;

    @Column({ type: 'float' })
    longitude: number;

    @ManyToOne(() => GeoZone, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn()
    geoZone: GeoZone | null;
}
