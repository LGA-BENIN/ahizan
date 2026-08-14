import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { EventTrackerService, TrackEventInput } from '../service/event-tracker.service';

@Controller('cms-events')
export class EventCollectorController {
    constructor(private eventTracker: EventTrackerService) {}

    @Post('track')
    @HttpCode(HttpStatus.OK)
    async trackEvent(@Body() body: TrackEventInput) {
        if (!body || !body.eventType) {
            return { success: false, message: 'eventType est obligatoire' };
        }
        this.eventTracker.trackEvent(body);
        return { success: true };
    }
}
