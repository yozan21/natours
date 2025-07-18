/* eslint-disable*/

export const displayMap = (locations) => {
  var map = L.map('map', {
    scrollWheelZoom: false,
    doubleClickZoom: false,
  }).setView([0, 0], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  const bounds = L.latLngBounds();

  locations.forEach((loc) => {
    const [lng, lat] = loc.coordinates;

    const marker = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl: '/img/pin.png',
        iconSize: [28, 36],
        iconAnchor: [0, 36],
        popupAnchor: [13, -33],
      }),
    }).addTo(map);
    const popup = L.popup({
      autoClose: false,
      closeOnClick: false,
    }).setContent(`<p>Day ${loc.day}: ${loc.description}</p>`);

    marker.bindPopup(popup).openPopup();

    bounds.extend([lat, lng]);
  });

  map.fitBounds(bounds, { padding: [100, 100] });
};
