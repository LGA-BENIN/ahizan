import { Injectable } from '@nestjs/common';
import { TransactionalConnection, ID } from '@vendure/core';
import { CMSEventLog, EventType } from '../entities/event-log.entity';

export interface TrackEventInput {
    eventType: EventType;
    userId?: ID;
    geoZoneId?: ID;
    productId?: ID;
    metadata?: Record<string, any>;
}

@Injectable()
export class EventTrackerService {
    private eventQueue: TrackEventInput[] = [];
    private isProcessing = false;

    constructor(private connection: TransactionalConnection) {
        // Traitement par lots asynchrone (Event Bus) toutes les 5 secondes
        setInterval(() => this.flushQueue(), 5000);
    }

    /**
     * Enregistre un événement utilisateur de manière non-bloquante.
     */
    trackEvent(input: TrackEventInput) {
        this.eventQueue.push(input);
    }

    private async flushQueue() {
        if (this.eventQueue.length === 0 || this.isProcessing) return;
        this.isProcessing = true;

        const batch = [...this.eventQueue];
        this.eventQueue = [];

        try {
            const rawConnection = this.connection.rawConnection;
            const repo = rawConnection.getRepository(CMSEventLog);
            
            const entities = batch.map(ev => new CMSEventLog({
                eventType: ev.eventType,
                userId: ev.userId,
                geoZoneId: ev.geoZoneId,
                productId: ev.productId,
                metadataJson: ev.metadata ? JSON.stringify(ev.metadata) : undefined,
                timestamp: new Date()
            }));

            await repo.save(entities);
        } catch (err) {
            console.error('[EventTrackerService] Error flushing event queue:', err);
        } finally {
            this.isProcessing = false;
        }
    }
}
