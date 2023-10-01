// Carga la imagen desde la ubicación en Google Earth Engine
var mosaicImage19 = ee.Image('projects/ee-andersonllanos/assets/mosaicImage19_4');

// Imprime la información de la imagen
print('Imagen mosaicImage19', mosaicImage19);

// Agrega la imagen al mapa
Map.addLayer(mosaicImage19.select(["B2","B3","B4"]), {
    min: 0,
    max: 0.3, 
}, 'mosaicImage19');

 
Map.addLayer(limite_florencia, "", 'Limite_Florencia');
// Supongamos que tienes una FeatureCollection llamada 'marcadores'
var marcadores = bosque_points; // tu FeatureCollection
// Agregar una columna de números aleatorios a la FeatureCollection
var marcadoresConRandom = marcadores.randomColumn('random');
// Ordenar la FeatureCollection por los valores aleatorios
var marcadoresOrdenados = marcadoresConRandom.sort('random');
// Seleccionar y eliminar los primeros 100 marcadores (al azar)
var marcadoresAEliminar = marcadoresOrdenados.limit(600);
var bosque_points = marcadores.filter(
  ee.Filter.inList('system:index', marcadoresAEliminar.aggregate_array('system:index'))
);

// Supongamos que tienes una FeatureCollection llamada 'marcadores'
var marcadoresno = nobosque_points; // tu FeatureCollection
// Agregar una columna de números aleatorios a la FeatureCollection
var marcadoresConRandomno = marcadoresno.randomColumn('random');
// Ordenar la FeatureCollection por los valores aleatorios
var marcadoresOrdenadosno = marcadoresConRandomno.sort('random');
// Seleccionar y eliminar los primeros 100 marcadores (al azar)
var marcadoresAEliminarno = marcadoresOrdenadosno.limit(600);
var nobosque_points = marcadoresno.filter(
  ee.Filter.inList('system:index', marcadoresAEliminarno.aggregate_array('system:index'))
);

//centrar y zoom al objeto
Map.centerObject(limite_florencia, 10)

// Agrega el archivo Shapefile al mapa.
Map.addLayer(bosque_nobosque, 
  {palette: ['green', 'orange'], min:1, max: 2
},  "Bosque - No Bosque");

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
  scale: 30 // Ajusta la escala según tu imagen
});

// Dividir los datos en conjuntos de entrenamiento y prueba (80-20)
var trainingData = trainImage.randomColumn();
var split = 0.8; // Proporción de entrenamiento
var trainingSet = trainingData.filter(ee.Filter.lt('random', split));
var testingSet = trainingData.filter(ee.Filter.gte('random', split));

// Modelo de clasificación
var classifier = ee.Classifier.smileCart().train(trainingSet, label, bands);

//clasificar la imagen
var classified = input.classify(classifier);

// definir paleta de colores
var landcoverPalette = [
'green',
'yellow'
];

Map.addLayer(classified, {palette: landcoverPalette, min:1, max: 2}, 'Clasificación CART');

// Accuracy
var confusionMatrix = ee.ConfusionMatrix(testingSet.classify(classifier)
.errorMatrix({
  actual: 'Class',
  predicted: 'classification'
}));

print('Matrix de Confusion Cart:', confusionMatrix);

// Calcular la precisión
var precision = confusionMatrix.accuracy();
print('Overall Accuracy Cart:', precision);

// Crear un clasificador Random Forest
var forest = ee.Classifier.smileRandomForest({
  numberOfTrees: 100
}).train({
  features: trainingSet,
  classProperty: label, // Propiedad de etiqueta en los datos
  inputProperties: bands
});

// Clasificar la imagen mosaico usando el clasificador entrenado
var classifiedImage = input.classify(forest);

// Visualizar la imagen clasificada
Map.addLayer(classifiedImage, {palette: landcoverPalette, min:1, max: 2}, 'Radom Forest');

// Accuracy
var confusionMatrixRF = ee.ConfusionMatrix(testingSet.classify(forest)
.errorMatrix({
  actual: 'Class',
  predicted: 'classification'
}));

print('Matrix de Confusion RandomForest:', confusionMatrixRF);
// Calcular la precisión
var precisionRF = confusionMatrixRF.accuracy();
print('Overall Accuracy RandomForest:', precisionRF);
// Obtener el valor de Verdaderos Positivos (True Positives)

// Create an SVM classifier with custom parameters.
var classifierSVM = ee.Classifier.libsvm({
  kernelType: 'RBF',
  gamma: 0.5,
  cost: 10
}).train({
  features: trainingSet,
  classProperty: label, // Propiedad de etiqueta en los datos
  inputProperties: bands
});

// Classify the image.
var classifiedSVM = input.classify(classifierSVM);

// Visualizar la imagen clasificada
Map.addLayer(classifiedSVM, {palette: landcoverPalette, min:1, max: 2}, 'SVM');

// Accuracy
var confusionMatrixSVM = ee.ConfusionMatrix(testingSet.classify(classifierSVM)
.errorMatrix({
  actual: 'Class',
  predicted: 'classification'
}));

print('Matrix de Confusion SVM:', confusionMatrixSVM);

// Calcular la precisión
var precisionSVM = confusionMatrixSVM.accuracy();
print('Overall Accuracy SVM:', precisionSVM);

// Exportar CART
Export.image.toDrive({
  image: classified,
  description: 'CART',
  folder: 'projects/ee-andersonllanos',
  scale: 10,
  region: limite_florencia.geometry().bounds(),
  maxPixels: 1e13
});

// Exportar RANDOM FOREST
Export.image.toDrive({
  image: classifiedImage,
  description: 'RANDOM FOREST',
  folder: 'projects/ee-andersonllanos',
  scale: 10,
  region: limite_florencia.geometry().bounds(),
  maxPixels: 1e13
});

// Exportar SVM
Export.image.toDrive({
  image: classifiedSVM,
  description: 'SVM',
  folder: 'projects/ee-andersonllanos',
  scale: 10,
  region: limite_florencia.geometry().bounds(),
  maxPixels: 1e13
});
