const { GeoZone } = require('./dist/plugins/geo-engine/entities/geo-zone.entity');
const { GeoZoneAlias } = require('./dist/plugins/geo-engine/entities/geo-zone-alias.entity');
const { GeoResolutionLog } = require('./dist/plugins/geo-engine/entities/geo-resolution-log.entity');
const { GeoUserCorrection } = require('./dist/plugins/geo-engine/entities/geo-user-correction.entity');
const { GeoPOI } = require('./dist/plugins/geo-engine/entities/geo-poi.entity');

console.log('✅ Testing Geo Engine Refactored Entities...');
console.log(' - GeoZone:', typeof GeoZone);
console.log(' - GeoZoneAlias:', typeof GeoZoneAlias);
console.log(' - GeoResolutionLog:', typeof GeoResolutionLog);
console.log(' - GeoUserCorrection:', typeof GeoUserCorrection);
console.log(' - GeoPOI:', typeof GeoPOI);
console.log('🎉 All refactored entities successfully loaded!');
