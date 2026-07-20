/**
 * TypeORM patch to handle corrupted JSON data gracefully.
 * This patches the PostgresDriver.prepareHydratedValue method to catch JSON parsing errors
 * and return null instead of crashing with "Unexpected end of JSON input".
 */

/**
 * Wrap a DateUtils.stringToSimpleJson implementation so that empty strings,
 * the literal "null", or any unparseable value resolve to null instead of throwing.
 */
function makeSafeStringToSimpleJson(original: (value: any) => any) {
    return function patchedStringToSimpleJson(this: any, value: any): any {
        if (value === null || value === undefined) {
            return null;
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed === '' || trimmed === 'null') {
                return null;
            }
        }
        try {
            return original.call(this, value);
        } catch {
            console.warn(`[TypeORM Patch] JSON parse error in DateUtils.stringToSimpleJson, returning null. Value: "${value}"`);
            return null;
        }
    };
}

/**
 * Wrap a PostgresDriver.prepareHydratedValue implementation so JSON errors during
 * hydration return null instead of crashing the whole query.
 */
function makeSafePrepareHydratedValue(original: (value: any, metadata: any) => any) {
    return function patchedPrepareHydratedValue(this: any, value: any, metadata: any): any {
        try {
            return original.call(this, value, metadata);
        } catch (error: any) {
            if (error?.message && String(error.message).includes('JSON')) {
                console.warn(`[TypeORM Patch] JSON error in prepareHydratedValue, returning null. Value: "${value}"`);
                return null;
            }
            throw error;
        }
    };
}

// Track objects we've already patched so we never double-wrap.
const PATCH_FLAG = '__ahizanJsonPatched';

function patchDateUtils(DateUtils: any): boolean {
    if (!DateUtils || typeof DateUtils.stringToSimpleJson !== 'function') {
        return false;
    }
    if (DateUtils.stringToSimpleJson[PATCH_FLAG]) {
        return true; // already patched
    }
    const wrapped = makeSafeStringToSimpleJson(DateUtils.stringToSimpleJson.bind(DateUtils));
    (wrapped as any)[PATCH_FLAG] = true;
    DateUtils.stringToSimpleJson = wrapped;
    return true;
}

function patchPostgresDriver(PostgresDriver: any): boolean {
    const proto = PostgresDriver?.prototype;
    if (!proto || typeof proto.prepareHydratedValue !== 'function') {
        return false;
    }
    if (proto.prepareHydratedValue[PATCH_FLAG]) {
        return true; // already patched
    }
    const wrapped = makeSafePrepareHydratedValue(proto.prepareHydratedValue);
    (wrapped as any)[PATCH_FLAG] = true;
    proto.prepareHydratedValue = wrapped;
    return true;
}

/**
 * Apply the patch to EVERY copy of TypeORM currently loaded.
 *
 * The crash originally persisted because `require('typeorm')` in this file could
 * resolve to a different module instance than the one Vendure actually executes
 * (the worker stack trace pointed at `node_modules/src/util/DateUtils.ts`). To be
 * safe we patch:
 *   1. The module returned by `require('typeorm')`.
 *   2. The deep `typeorm/util/DateUtils` module (the real source of the throw).
 *   3. Any other DateUtils / PostgresDriver instances already in require.cache.
 */
export function applyTypeormJsonPatch() {
    let dateUtilsPatched = 0;
    let driverPatched = 0;

    // 1. Main typeorm entry point.
    try {
        const typeorm = require('typeorm');
        if (patchDateUtils(typeorm.DateUtils)) dateUtilsPatched++;
        if (patchPostgresDriver(typeorm.PostgresDriver)) driverPatched++;
    } catch (e: any) {
        console.warn('[TypeORM Patch] Could not require("typeorm"):', e?.message || e);
    }

    // 2. Deep DateUtils module - this is where the throw actually originates.
    try {
        const dateUtilsModule = require('typeorm/util/DateUtils');
        if (patchDateUtils(dateUtilsModule.DateUtils)) dateUtilsPatched++;
    } catch {
        // Path may differ across versions; the cache scan below is the fallback.
    }

    // 3. Scan require.cache for any straggler instances (duplicate installs etc.).
    try {
        for (const key of Object.keys(require.cache)) {
            if (!/[\\/](typeorm|src)[\\/]/.test(key)) continue;
            const mod = require.cache[key];
            const exp = mod?.exports;
            if (!exp) continue;
            if (exp.DateUtils && patchDateUtils(exp.DateUtils)) dateUtilsPatched++;
            if (exp.PostgresDriver && patchPostgresDriver(exp.PostgresDriver)) driverPatched++;
        }
    } catch (e: any) {
        console.warn('[TypeORM Patch] require.cache scan failed:', e?.message || e);
    }

    if (dateUtilsPatched > 0 || driverPatched > 0) {
        console.log(`✅ TypeORM JSON patch applied (DateUtils instances: ${dateUtilsPatched}, PostgresDriver instances: ${driverPatched})`);
    } else {
        console.warn('[TypeORM Patch] No DateUtils/PostgresDriver instances found to patch.');
    }
}

// Auto-apply on import
applyTypeormJsonPatch();
