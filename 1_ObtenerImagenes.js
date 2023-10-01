var s2mask = require('users/fitoprincipe/geetools:cloud_masks').sentinel2;
var umbral_nubosidad = 95; // Filtrar imágenes de la colección para tener menos del 95 por ciento de nubosidad
var umbral_rgb = 0.15; // Límite, probablemente nube sin enmascarar
var percentil_rgb = 25; // Seleccionar RGB en el percentil 35
var percentil_ndvi = 90; // Seleccionar NDVI en el percentil 90

// Función para obtener imágenes de Sentinel-2 de un rango de fechas y un área de interés
function getSentinel2Images(startDate, endDate, Limite) {
  // Obtenga la colección de imágenes de Sentinel-2.
  // Filtre la colección por fecha y área de interés.
  var collection = ee.ImageCollection("COPERNICUS/S2")
    .filterDate(startDate, endDate)
    .filterBounds(Limite)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', umbral_nubosidad)) //conserva imagenes con menos del 95% de pixeles nublados
    .map(s2mask()) //elimina pixeles nublados
    .map(function (image) {
      // Dividir los valores de las bandas de la imagen por 10000 para escalarlos
        return image.divide(10000); 
    });
  return collection.map(function(image) {
    
    // Calcular el Índice de Vegetación de Diferencia Normalizada (NDVI) a partir de las bandas B8 y B4
    var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');

    // Agregar la banda NDVI a la imagen
    return image.toFloat();
  })
}

// Función para generar un mosaico de imágenes de Sentinel-2
function mosaicSentinel2Images(collection) {
    var final = collection.max(); // Baseline value
    // Select value
    collection = collection.map(function(img) {
        return img.updateMask(
            img.select("B2").lt(umbral_rgb)
            .bitwiseAnd(img.select("B3").lt(umbral_rgb))
            .bitwiseAnd(img.select("B4").lt(umbral_rgb)))
    });
    var rgb_p = collection.select(["B2", "B3", "B4"])
                              .reduce(ee.Reducer.percentile([percentil_rgb]))
    rgb_p = rgb_p.select([
                            "B2_p" + percentil_rgb,
                            "B3_p" + percentil_rgb,
                            "B4_p" + percentil_rgb,
                        ], ["B2", "B3", "B4"])
    var ndvi_p = collection.select(["NDVI"])
                                .reduce(ee.Reducer.percentile([percentil_ndvi]))
                                .select([
                                    "NDVI_p" + percentil_ndvi
                                ], ["NDVI"])
    // Replace old bands
    final = final.addBands({
        srcImg: rgb_p.select("B2").toFloat().rename("B2"),
        overwrite: true
    });
    final = final.addBands({
        srcImg: rgb_p.select("B3").toFloat().rename("B3"),
        overwrite: true
    });
    final = final.addBands({
        srcImg: rgb_p.select("B4").toFloat().rename("B4"),
        overwrite: true
    });
    return final.toFloat();
}

//centrar y zoom al objeto
Map.centerObject(limite_florencia, 10)
// Obtenga imágenes de Sentinel-2 de la ciudad de Florencia para el año 2019
var images19 = getSentinel2Images('2018-01-01', '2019-12-31', AOI)
// Cuente el número de imágenes en la colección.
print (images19);
// Obtén la lista de system:index de las imágenes
var systemIndexes19 = images19.aggregate_array('system:index');
// Imprime la lista de system:index
print('Lista de system:index de imágenes de 2019:', systemIndexes19);

// Genera un mosaico de las imágenes de Sentinel-2 de la ciudad de Florencia, Colombia
var mosaicImage19 = mosaicSentinel2Images(images19);
//Recorta el mosaico de acuerdo al limite
mosaicImage19 = mosaicImage19.clip(limite_florencia)
Map.addLayer(mosaicImage19.select(["B2","B3","B4"]), {
    min: 0,
    max: 0.3
}, "RGB_2019");

// Obtenga imágenes de Sentinel-2 de la ciudad de Florencia para el año 2023
var images23 = getSentinel2Images('2022-01-01', '2023-08-15', AOI)

// Cuente el número de imágenes en la colección.
print (images23);

// Genera un mosaico de las imágenes de Sentinel-2 de la ciudad de Florencia, Colombia
var mosaicImage23 = mosaicSentinel2Images(images23);
//Recorta el mosaico de acuerdo al limite
mosaicImage23 = mosaicImage23.clip(limite_florencia)

var ndvi_3_23 = mosaicImage23.expression('(b8-b4)/ (b8 + b4)', {
    b8 : mosaicImage23.select('B8'),
    b4 : mosaicImage23.select('B4')
})
Map.addLayer(mosaicImage23.select(["B2","B3","B4"]), {
    min: 0,
    max: 0.3//,
  //gamma: 0.4
}, "RGB_2023");

// Define la función para extraer la fecha de un ID y convertirla a formato de fecha
function extractDateFromId(id) {
  var regex = /(\d{8})T\d{6}_\d{8}T\d{6}/; // Expresión regular para extraer la fecha
  var match = id.match(regex); // Intentar hacer coincidir el ID con la expresión regular
  if (match && match.length > 1) {
    var dateString = match[1]; // Obtener la fecha coincidente
    var year = dateString.slice(0, 4);
    var month = dateString.slice(4, 6);
    var day = dateString.slice(6, 8);
    return ee.Date(year + '-' + month + '-' + day);
  } else {
    return null; // Devolver null si no se pudo extraer la fecha
  }
}

// Exportar imagen 2019
Export.image.toDrive({
  image: mosaicImage19.select(["B2", "B3", "B4", "B8"]),
  description: 'mosaicImage19',
  folder: 'projects/ee-andersonllanos',
  scale: 10,
  region: limite_florencia.geometry().bounds(),
  maxPixels: 1e13
});

// Exportar imagen 2023
Export.image.toDrive({
  image: mosaicImage23.select(["B2", "B3", "B4", "B8"]),
  description: 'mosaicImage23',
  folder: 'projects/ee-andersonllanos',
  scale: 10,
  region: limite_florencia.geometry().bounds(),
  maxPixels: 1e13
});
