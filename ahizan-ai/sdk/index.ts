export * from './types';
export * from './client';

import { AhizanAIClient } from './client';
export const ai = new AhizanAIClient();
export default ai;
