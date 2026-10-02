# Weather Now

Aplicación meteorológica responsive basada en el reto [Weather app de Frontend Mentor](https://www.frontendmentor.io/challenges/weather-app-K1FhddVm49). Desarrollada con HTML, CSS y JavaScript sin frameworks ni claves de API.

## Funciones

- Búsqueda de ciudades con sugerencias mediante Open-Meteo Geocoding.
- Condiciones actuales, temperatura aparente, humedad, viento y precipitación.
- Pronóstico de siete días y pronóstico horario seleccionable por día.
- Conversión entre Celsius/Fahrenheit, km/h/mph y mm/pulgadas.
- Estados de carga, sin resultados y error de conexión.
- Diseño adaptable a escritorio y móvil, con controles utilizables con teclado.

## Ejecutar localmente

La aplicación es estática. Sirve esta carpeta con cualquier servidor HTTP local. Por ejemplo, con Node.js:

```bash
npx serve .
```

Abre la URL local indicada por el servidor. Las llamadas a la API requieren conexión a internet.

## API

1. `https://geocoding-api.open-meteo.com/v1/search` convierte el texto de búsqueda en nombre, país y coordenadas.
2. `https://api.open-meteo.com/v1/forecast` devuelve datos `current`, `hourly` y `daily` para las coordenadas seleccionadas, con `timezone=auto` y `forecast_days=7`.

Las respuestas se solicitan en unidades métricas y JavaScript convierte únicamente los valores visibles. No se almacena información personal ni se utiliza una clave de API.

## Publicación con GitHub Pages

1. Crea un repositorio público y sube `index.html`, `app.js`, `styles.css`, las imágenes y las dos fuentes a la raíz de la rama `main`.
2. En **Settings → Pages → Build and deployment**, elige **Deploy from a branch**, rama **main** y carpeta **/(root)**.
3. Guarda la configuración y espera a que GitHub muestre la URL publicada. Comprueba que la búsqueda y los iconos funcionen desde esa URL.

## Créditos

Diseño y recursos gráficos: [Frontend Mentor](https://www.frontendmentor.io/). Datos meteorológicos y geocodificación: [Open-Meteo](https://open-meteo.com/).
