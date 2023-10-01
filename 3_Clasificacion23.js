// Carga la imagen desde la ubicación en Google Earth Engine
var mosaicImage19 = ee.Image('projects/ee-andersonllanos/assets/mosaicImage19');
// Carga la imagen desde la ubicación en Google Earth Engine
var mosaicImage23 = ee.Image('projects/ee-andersonllanos/assets/mosaicImage23_2');

// Imprime la información de la imagen
print('Imagen mosaicImage19', mosaicImage19);

// Agrega la imagen al mapa
Map.addLayer(mosaicImage19.select(["B2","B3","B4"]), { 
    min: 0,
    max: 0.3, 
}, 'mosaicImage19');

// Imprime la información de la imagen
print('Imagen mosaicImage23', mosaicImage23);

// Agrega la imagen al mapa
Map.addLayer(mosaicImage23.select(["B2","B3","B4"]), {
    min: 0,
    max: 0.3, 
}, 'mosaicImage23');
 
// Obtener marcadores de bosque_points
var marcadores = bosque_points; 
// Agregar una columna de números aleatorios a la FeatureCollection
var marcadoresConRandom = marcadores.randomColumn('random');
// Ordenar la FeatureCollection por los valores aleatorios
var marcadoresOrdenados = marcadoresConRandom.sort('random');
// Seleccionar los primeros 600 marcadores (al azar)
var marcadoresAEliminar = marcadoresOrdenados.limit(600);
var bosque_points = marcadores.filter(
  ee.Filter.inList('system:index', marcadoresAEliminar.aggregate_array('system:index'))
);

//Obtener los marcadores de nobosque_points
var marcadoresno = nobosque_points; // tu FeatureCollection
// Agregar una columna de números aleatorios a la FeatureCollection
var marcadoresConRandomno = marcadoresno.randomColumn('random');
// Ordenar la FeatureCollection por los valores aleatorios
var marcadoresOrdenadosno = marcadoresConRandomno.sort('random');
// Seleccionar los primeros 600 marcadores (al azar)
var marcadoresAEliminarno = marcadoresOrdenadosno.limit(600);
var nobosque_points = marcadoresno.filter(
  ee.Filter.inList('system:index', marcadoresAEliminarno.aggregate_array('system:index'))
);
//centrar y zoom al objeto
Map.centerObject(limite_florencia, 10)
Map.addLayer(raster.clip(limite_florencia), {palette: ['green', 'yellow'], min:1, max: 2}, 'raster');
// Combinar los conjuntos de puntos en uno solo
var trainingPoints = bosque_points.merge(nobosque_points);
print(trainingPoints);

var label = 'Class';
var bands = ['B2', 'B3', 'B4','B8'];
var input = mosaicImage19.select(bands);

// Obtener los píxeles etiquetados del shapefile como puntos
var trainImage = input .sampleRegions({
  collection: trainingPoints,
  properties: [label], // Nombre de la propiedad de etiqueta en el shapefile
  scale: 30 // Ajusta la escala de la imagen
});

// Dividir los datos en conjuntos de entrenamiento y prueba (80-20)
var trainingData = trainImage.randomColumn();
var split = 0.8; // Proporción de entrenamiento
var trainingSet = trainingData.filter(ee.Filter.lt('random', split));
var testingSet = trainingData.filter(ee.Filter.gte('random', split));

// definir paleta de colores
var landcoverPalette = [
'green',
'yellow'
];

// Crear un clasificador Random Forest
var forest = ee.Classifier.smileRandomForest({
  numberOfTrees: 100
}).train({
  features: trainingSet,
  classProperty: label, // Propiedad de etiqueta en los datos
  inputProperties: bands
});

// Clasificar la imagen mosaico usando el clasificador entrenado
var classifiedImage19 = input.classify(forest);

// Visualizar la imagen clasificada
Map.addLayer(classifiedImage19, {palette: landcoverPalette, min:1, max: 2}, 'Radom Forest 19');

// Clasificar la imagen mosaico usando el clasificador entrenado
var input23 = mosaicImage23.select(bands); // Selecciona las mismas bandas que se usaron para entrenar
var classifiedImage23 = input23.classify(forest);

// Visualizar la imagen clasificada para mosaicImage23
Map.addLayer(classifiedImage23, {palette: landcoverPalette, min:1, max: 2}, 'Random Forest 23');

// Exportar imagen 2019
Export.image.toDrive({
  image: classifiedImage19,
  description: 'classifiedImage19',
  folder: 'projects/ee-andersonllanos',
  scale: 10,
  region: limite_florencia.geometry().bounds(),
  maxPixels: 1e13
});

// Exportar imagen 2023
Export.image.toDrive({
  image: classifiedImage23,
  description: 'classifiedImage23',
  folder: 'projects/ee-andersonllanos',
  scale: 10,
  region: limite_florencia.geometry().bounds(),
  maxPixels: 1e13
});
