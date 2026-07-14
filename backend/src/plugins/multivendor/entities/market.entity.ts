import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { VendureEntity, DeepPartial, Asset } from '@vendure/core';
import { GeographicLocation } from './geographic-location.entity';

@Entity()
export class Market extends VendureEntity {
    constructor(input?: DeepPartial<Market>) {
        super(input);
    }

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

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

    @ManyToOne(() => GeographicLocation, { nullable: true })
    @JoinColumn()
    location: GeographicLocation;
}
