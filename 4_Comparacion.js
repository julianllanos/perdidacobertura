// Carga las imágenes clasificadas de 2019 y 2023
var classifiedImage19 = ee.Image('projects/ee-andersonllanos/assets/classifiedImage19');
var classifiedImage23 = ee.Image('projects/ee-andersonllanos/assets/classifiedImage23');

Map.centerObject(classifiedImage19, 10)
// Define los colores para visualizar los cambios (0: no cambió, 1: cambió)
var changePalette = ['orange', 'green'];
 
Map.addLayer(classifiedImage19, {min: 0, max: 1, palette: changePalette}, '2019');
Map.addLayer(classifiedImage23, {min: 0, max: 1, palette: changePalette}, '2023');

// Realiza una intersección entre las imágenes clasificadas
var difference = classifiedImage23.subtract(classifiedImage19);
// Convierte la imagen a tipo flotante
var deforestation = difference.toDouble();

// Agrega la capa de cambios al mapa
var colorPalette = ['red', 'white', 'green'];
Map.addLayer(deforestation, {min: -1, max: 0, palette: colorPalette}, 'Perdida de Cobertura');
//Map.addLayer(difference, {min: 0, max: 1, palette: colorPalette}, 'Ganancia de Cobertura');



var areaCambio = difference.eq(1).multiply(ee.Image.pixelArea()).reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: limite_florencia,
  scale: 20
});

print('Área Total de Cambio (ha):', areaCambio.get('classification'));

// Calcula el área de cambio por clase para 2019 y 2023
var areaCambio2019 = classifiedImage19.select('classification').eq(1).multiply(ee.Image.pixelArea()).reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: limite_florencia,
  scale: 20
});

var areaCambio2023 = classifiedImage23.select('classification').eq(1).multiply(ee.Image.pixelArea()).reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: limite_florencia,
  scale: 20
});

// Crea una tabla de resultados
var resultadosCambio = ee.FeatureCollection([
  ee.Feature(null, {
    'Año': 2019,
    'Área de Cambio (ha)': areaCambio2019.get('classification')
  }),
  ee.Feature(null, {
    'Año': 2023,
    'Área de Cambio (ha)': areaCambio2023.get('classification')
  })
]);

// Muestra un gráfico de barras
var chartCambio = ui.Chart.feature.byFeature(resultadosCambio)
  .setChartType('ColumnChart')
  .setOptions({
    title: 'Área de Cambio por Año',
    hAxis: {title: 'Año'},
    vAxis: {title: 'Área de Cambio (ha)'}
  });

print(chartCambio);
// Calcula un histograma espacial de la diferencia
var histograma = ui.Chart.image.histogram(difference, limite_florencia, 30)
  .setSeriesNames(['Diferencia'])
  .setOptions({
    title: 'Histograma de Diferencia de Clasificación',
    hAxis: {title: 'Diferencia'},
    vAxis: {title: 'Frecuencia'}
  });

print(histograma);


// Exportar changeImage
Export.image.toDrive({
  image: deforestation,
  description: 'deforestation',
  folder: 'projects/ee-andersonllanos',
  scale: 10,
  region: limite_florencia,
  maxPixels: 1e13
});

