const GeocodingService = require('./services/GeocodingService');

(async () => {
    try {
        const result = await GeocodingService.geocode({
            street: 'Rua Senhor dos Passos',
            number: '220',
            district: 'Ponto Novo',
            city: 'Aracaju',
            state: 'SE',
            zip: '49047-060' // testing with CEP
        });
        console.log("FINAL RESULT:", result);
    } catch (e) {
        console.error(e);
    }
})();
