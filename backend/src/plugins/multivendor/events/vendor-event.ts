import { RequestContext, VendureEvent } from '@vendure/core';
import { Vendor } from '../entities/vendor.entity';

export class VendorEvent extends VendureEvent {
    constructor(
        public ctx: RequestContext,
        public vendor: Vendor,
        public type: 'created' | 'updated' | 'deleted' | 'statusChanged',
        public input?: any,
    ) {
        super();
    }
}
