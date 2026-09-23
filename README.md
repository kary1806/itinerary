# Noviembre por Colombia

Página del itinerario de viaje (1 al 17 de noviembre de 2026): Manizales, Neiva y Tatacoa, Tunja y Bogotá.

## Correr en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Editar el itinerario

Hay dos formas:

1. **Desde la página.** Botón "Editar itinerario". Los cambios se guardan solos en el navegador
   (localStorage) y se ven solo en ese dispositivo. Con "Descargar JSON" obtienes el archivo
   actualizado.
2. **En el repo.** Edita `data/itinerary.json` (o reemplázalo con el JSON descargado) y vuelve a
   desplegar. Así los cambios quedan publicados para todos.

Estructura de `data/itinerary.json`:

- `legs`: tramos del viaje, con `id`, `name`, `place` y `color`.
- `days`: un objeto por día con `date` (AAAA-MM-DD), `legId` y `activities`.
- Cada actividad tiene `title`, y opcionalmente `time` (HH:MM), `note`,
  `provider` (`booking`, `getyourguide`, `civitatis`, `vuelo`, `bus`) y `pending`.

## Desplegar en Vercel

```bash
npm i -g vercel
vercel
```

O conecta el repo en https://vercel.com/new. Vercel detecta Next.js sin configuración extra.
