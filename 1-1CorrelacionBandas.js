
// Carga la imagen desde la ubicación en Google Earth Engine
var mosaicImage19 = ee.Image('projects/ee-andersonllanos/assets/mosaicImage19_4');


// Define las bandas de interés para calcular la correlación
var bandList = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B9', 'B10', 'B11', 'B12'];

// Inicializa una lista para almacenar las correlaciones
var correlations = [];

// Itera sobre todas las combinaciones posibles de pares de bandas
for (var i = 0; i < 16; i++) {
  for (var j = i + 1; j < 16; j++) {
    var band1 = bandList[i];
    var band2 = bandList[j];
    
    // Calcula la correlación de Pearson entre las dos bandas
    var correlation = mosaicImage19.select([band1, band2]).reduceRegion({
      reducer: ee.Reducer.pearsonsCorrelation(),
      geometry: limite_florencia, // Cambia al límite de Florencia si es necesario
      scale: 60, // Cambia la escala según corresponda
    });
    
    // Agrega la correlación a la lista
    correlations.push({
      band1: band1,
      band2: band2,
      correlation: correlation.get('correlation')
    });
  }
}

// Imprime las correlaciones en la consola
print(correlations);
