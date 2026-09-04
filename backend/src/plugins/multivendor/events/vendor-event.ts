import { RequestContext, VendureEvent } from '@vendure/core';
import { Vendor } from '../entities/vendor.entity';
import { WithdrawalRequest } from '../entities/withdrawal-request.entity';

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

export class FundsReleasedEvent extends VendureEvent {
    constructor(
        public ctx: RequestContext,
        public vendor: Vendor,
        public amount: number,
        public orderCode: string,
        public availableBalance: number,
    ) {
        super();
    }
}

export class WithdrawalEvent extends VendureEvent {
    constructor(
        public ctx: RequestContext,
        public withdrawal: WithdrawalRequest,
        public type: 'approved' | 'rejected' | 'requested',
    ) {
        super();
    }
}


