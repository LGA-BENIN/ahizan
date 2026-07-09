import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { VendureEntity, DeepPartial } from '@vendure/core';

export enum LocationType {
    CITY = 'CITY',
    ARRONDISSEMENT = 'ARRONDISSEMENT',
    NEIGHBORHOOD = 'NEIGHBORHOOD',
}

@Entity()
export class GeographicLocation extends VendureEntity {
    constructor(input?: DeepPartial<GeographicLocation>) {
        super(input);
    }

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ type: 'varchar' })
    type: LocationType;

    @Column({ type: 'float', nullable: true })
    centerLatitude: number;

    @Column({ type: 'float', nullable: true })
    centerLongitude: number;

    @Column({ type: 'int', nullable: true })
    radiusMeters: number;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @ManyToOne(() => GeographicLocation, (parent: GeographicLocation) => parent.children, { nullable: true })
    parent: GeographicLocation;

    @OneToMany(() => GeographicLocation, (child: GeographicLocation) => child.parent)
    children: GeographicLocation[];
}
