# MIDI / Laboratorio de movimiento

Desde esta carpeta, ejecutá `npm ci` para instalar las dependencias y `npm run studio` para abrir Remotion en http://localhost:3030.

En otra terminal, ejecutá `npm run demo` y abrí http://127.0.0.1:4173/demo.html. En Escena 1, activá la pieza para estirar los isotipos y volvé a activarla para recogerlos. En las transiciones 2 a 4, hacé click o tocá para reproducir la secuencia desde el inicio.

| Composición | Referencia | Uso |
| --- | --- | --- |
| Escena-1 | Lámina 7 | Estiramiento suave de la i hacia ambos lados, activado por click o toque |
| Transicion-2 | Referencia en blanco y negro | Diez piezas se recomponen desde el cierre de Escena-1 |
| Transicion-3 | Marcos partidos en blanco y negro | Siete piezas forman los nuevos marcos y tres salen del cuadro |
| Transicion-4 | Marcos blancos sobre negro | Nueve piezas se reordenan a partir del cierre de Transicion-3 |

Para exportar, usá `npm run render -- Escena-1 out/escena-1.mp4` o `npm run render -- Transicion-2 out/transicion-2.mp4`. Los gestos de la demo se implementan en el navegador. `../src/motion/motion.mjs` contiene la geometría y el ritmo que comparte con Studio.

