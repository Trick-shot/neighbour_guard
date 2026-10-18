/**
 * Google Maps style matching the Figma "Map · street" artwork: pale land, soft green parks,
 * blue water, white streets with light-blue arterials, grey labels. Used on Android
 * (PROVIDER_GOOGLE); Apple Maps on iOS ignores custom styles.
 */
export const streetMapStyle = [
    {elementType: 'geometry', stylers: [{color: '#f3f4f1'}]},
    {elementType: 'labels.text.fill', stylers: [{color: '#6f7882'}]},
    {elementType: 'labels.text.stroke', stylers: [{color: '#f3f4f1'}]},
    {featureType: 'poi', elementType: 'labels.icon', stylers: [{saturation: -100}, {lightness: 20}]},
    {featureType: 'poi.business', stylers: [{visibility: 'off'}]},
    {featureType: 'poi.park', elementType: 'geometry', stylers: [{color: '#cfe7cf'}]},
    {featureType: 'road', elementType: 'geometry', stylers: [{color: '#ffffff'}]},
    {featureType: 'road', elementType: 'geometry.stroke', stylers: [{color: '#e4e7ec'}]},
    {featureType: 'road.arterial', elementType: 'geometry', stylers: [{color: '#c9dcf5'}]},
    {featureType: 'road.highway', elementType: 'geometry', stylers: [{color: '#b9d1f2'}]},
    {featureType: 'road', elementType: 'labels.text.fill', stylers: [{color: '#7c858f'}]},
    {featureType: 'transit', stylers: [{visibility: 'off'}]},
    {featureType: 'water', elementType: 'geometry', stylers: [{color: '#bcdcf3'}]},
    {featureType: 'administrative.neighborhood', elementType: 'labels.text', stylers: [{color: '#6f7882'}]},
];
