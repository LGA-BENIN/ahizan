import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Index } from 'typeorm';
import { VendureEntity, DeepPartial } from '@vendure/core';
import { GeoZone } from './geo-zone.entity';

@Entity()
export class Market extends VendureEntity {
    constructor(input?: DeepPartial<Market>) {
        super(input);
    }

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Index({ unique: true })
    @Column({ unique: true })
    slug: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'varchar', nullable: true })
    image: string;

    @Column({ type: 'varchar', nullable: true })
    icon: string;

    @Column({ type: 'float', nullable: true })
    centerLatitude: number;

    @Column({ type: 'float', nullable: true })
    centerLongitude: number;

    @Column({ type: 'int', nullable: true })
    radiusMeters: number;

    @Column({ type: 'simple-json', nullable: true })
    allowedFacetIds: string[];

    @ManyToOne(() => GeoZone, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn()
    geoZone: GeoZone | null;

    @Column({ type: 'simple-json', nullable: true })
    openingHours: any;

    @Column({ type: 'simple-json', nullable: true })
    stats: any;
}
