# MIDI Colectivo Artístico · Pack de logos

| Uso | Archivo |
| --- | --- |
| Encabezado web, firmas y piezas apaisadas | Horizontal |
| Afiches, portadas y composiciones centradas | Vertical |
| Interfaces, marcas de agua y espacios reducidos | Isotipo sólido |
| Piezas gráficas con espacio para apreciar el trazo | Isotipo de contorno |
| Avatar y perfil social | Cuadrado sólido o de contorno |
| Pestaña del navegador y pantalla de inicio | Archivos de Web/Favicon |

Usá la variante negra sobre fondos claros y la blanca sobre fondos oscuros. En las versiones cuadradas, «claro» y «oscuro» indican el color del fondo incorporado. Conservá la proporción original y comprobá que el nombre completo se lea al tamaño final.

## Formatos

- **Web/SVG** contiene las 12 variantes escalables. Usá estos archivos como primera opción en sitios y aplicaciones.
- **Web/PNG** y **Web/WebP** conservan las dimensiones originales y el canal alfa. WebP usa compresión sin pérdida. Elegí PNG cuando la plataforma no admita SVG o WebP.
- **Web/Favicon** incluye SVG, ICO de 16/32/48 px, Apple Touch Icon de 180 px e iconos PNG de 192 y 512 px para manifiestos web.
- **Impresion/PDF** contiene las 12 variantes como trazados vectoriales en CMYK, con negro en el canal K. En los PDF blancos, el blanco corresponde al papel o a una reserva. Para imprimir blanco sobre material oscuro, la imprenta debe preparar la tinta blanca según su proceso.
- **Originales** conserva los 12 PNG recibidos. Los vectores se reconstruyeron desde esos archivos y pueden mostrar pequeñas diferencias en bordes y curvas al ampliarlos. Se conservaron los tonos de cada referencia para web, incluidos el blanco puro y el blanco suave.

## Ejemplo de favicon

```html
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```
