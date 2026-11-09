# Desplegar el asistente en loteriasmalaga70.com/asistente/

Guía para publicar el asistente como **página propia** en tu hosting (Piensa
Solutions, cPanel, Apache), accesible en **`https://loteriasmalaga70.com/asistente/`**.

El asistente y su backend PHP viven juntos en **una sola carpeta** (`asistente/`),
en el mismo dominio, así que no hay problemas de CORS.

---

## 1. Compilar la app

En tu ordenador, dentro de la carpeta del proyecto:

```bash
npm install      # si no lo has hecho ya
npm run build
```

Esto genera la carpeta **`dist/`** con `index.html` y `assets/` (JS + CSS ya compilados).

## 2. Preparar la carpeta a subir

La carpeta `asistente/` del hosting debe contener:

```
asistente/
├── index.html          ← de dist/
├── assets/             ← de dist/
│   ├── index-XXXX.js
│   └── index-XXXX.css
└── api/                ← del proyecto (carpeta api/ completa)
    ├── loteria-oficial.php
    └── .htaccess
```

Es decir: **el contenido de `dist/`** + **la carpeta `api/`** del proyecto.

## 3. Subir por cPanel

1. Entra en **cPanel → Administrador de archivos**.
2. Ve a **`public_html`**.
3. Crea una carpeta llamada **`asistente`**.
4. Dentro de `asistente`, sube:
   - El **contenido** de `dist/` (el `index.html` y la carpeta `assets/`).
   - La carpeta **`api/`** del proyecto.
   > Truco: comprime `dist/` + `api/` en un `.zip`, súbelo a `public_html/asistente/` y descomprímelo ahí (botón "Extraer"). Asegúrate de que `index.html` queda directamente en `asistente/`, no dentro de otra subcarpeta.
5. Permisos (normalmente ya correctos): archivos **644**, carpetas **755**.

## 4. Comprobar que funciona

Abre **`https://loteriasmalaga70.com/asistente/`**. Deberías ver el asistente y,
en unos segundos, los **Resultados Destacados** (eso confirma que el backend PHP
funciona). Prueba el **Comprobador** con un boleto.

Si los resultados no cargan, revisa que exista `asistente/api/loteria-oficial.php`
y que el hosting tenga **PHP con la extensión cURL** activada.

## 5. Enlazar desde WordPress

En la home, en la sección **"Comprueba tus Boletos"**, cambia el botón/enlace para
que apunte al asistente en vez de a la web de SELAE:

```
https://loteriasmalaga70.com/asistente/
```

(Opcional) añade también un elemento en el **menú** ("Comprobador" o "Resultados")
con esa misma URL.

El botón **"← Volver"** del asistente ya devuelve al usuario a la página de inicio,
así que el recorrido queda cerrado: home → asistente → home.

---

## Notas

- **Cambiar el nombre de la carpeta:** el build usa rutas relativas, así que
  funciona en cualquier carpeta. Si prefieres `/comprobador/` en vez de
  `/asistente/`, solo cambia el nombre de la carpeta; no hay que recompilar.
- **Página de inicio del botón "Volver":** por defecto es
  `https://www.loteriasmalaga70.com/`. Si quisieras otra, compila con
  `VITE_HOME_URL=...` (ver `.env.example`).
- **Caché:** el backend guarda los resultados de SELAE 20 minutos en el
  directorio temporal del servidor, para no saturar y ir más rápido.
- **Actualizar en el futuro:** repite `npm run build` y vuelve a subir el
  contenido de `dist/` (la carpeta `api/` solo cambia si tocamos el backend).
