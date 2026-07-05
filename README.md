# Impulsa Emprende — Beta PWA

Marketplace y gestión para emprendedores acompañados por Impulsa Emprende.
Esta es una **beta de prueba**: arranca vacía, sin datos falsos. Compartes
el link, alguien se registra, tú lo apruebas, y vemos cómo se comporta.

## Cómo subirla a GitHub y publicarla (GitHub Pages, gratis)

1. Crea un repositorio nuevo en GitHub (puede ser público o privado).
2. Sube todos estos archivos a la raíz del repo (respetando las carpetas
   `css/`, `js/`, `icons/`).
3. En el repo: **Settings → Pages → Source → Deploy from a branch**,
   elige la rama `main` y la carpeta `/ (root)`. Guarda.
4. En un par de minutos tu app queda publicada en una URL como:
   `https://tu-usuario.github.io/tu-repo/`
5. Comparte esa URL. Cualquiera puede abrirla desde el navegador del
   celular y, si quiere, agregarla a su pantalla de inicio
   (en iPhone: botón compartir → "Añadir a inicio").

## Qué SÍ funciona ya en esta beta

- Registro de emprendedor (nombre, WhatsApp, correo, emprendimiento, categoría).
- Aprobación manual desde el panel de administrador.
- Publicar producto (foto, nombre, precio, stock).
- Registrar venta y ver cómo baja el stock.
- Marketplace que empieza vacío y se llena con productos reales.
- Se instala como app (ícono en pantalla de inicio, abre sin barra del navegador).
- Funciona sin internet una vez cargada una vez (service worker con caché).

## Qué falta para que sea "de verdad" multi-usuario

Ahora mismo los datos se guardan con `localStorage`, es decir, **cada
celular tiene su propia copia**. Si Ana se registra desde su teléfono, tú
no lo vas a ver en el tuyo todavía. Para que sí se vea, y para que las
notificaciones push lleguen aunque la app esté cerrada, falta un backend
compartido. Recomendado para esta fase (gratis, sin servidor propio):

**Firebase (Google) — Firestore + Cloud Messaging**
1. Crea un proyecto gratis en https://console.firebase.google.com
2. Activa **Firestore** (base de datos) y **Cloud Messaging** (push).
3. En `js/app.js`, cada bloque marcado con `// >>> BACKEND` es donde se
   conecta: en vez de guardar en `localStorage`, se guarda/lee de Firestore,
   y en vez de `notifyLocally(...)` se llama a una función que manda el
   push a través de Firebase.
4. Esto normalmente se hace con una "Cloud Function" chiquita que
   detecta "se creó un registro nuevo" y dispara el push al admin, o
   "se registró una venta" y dispara el push al emprendedor.

Si quieres, en el siguiente paso puedo dejar armada esa integración con
Firebase (necesitas crear tú el proyecto gratuito y pasarme las llaves,
Anthropic/Claude no puede crear cuentas de Google por ti).

## Notificaciones push — recordatorio de reglas del sistema

- **Android**: funciona con solo aceptar el permiso, no es obligatorio instalar la app.
- **iPhone**: necesita iOS 16.4+ y la app agregada a pantalla de inicio.
  Si solo se abre desde Safari, no llegan notificaciones.

## Estructura del proyecto

```
impulsa-emprende-pwa/
├── index.html          → pantallas de la app
├── manifest.json        → hace la app instalable
├── service-worker.js     → caché offline + escucha de push
├── css/styles.css
├── js/app.js             → lógica: registro, productos, ventas, admin
└── icons/                → íconos de la app
```
