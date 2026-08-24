# Especificaciones de Desarrollo — Aperta

**Aperta** — Plataforma de Analítica de Datos Abiertos

**Tipo de documento:** Spec técnica/funcional para desarrollo iterativo con Claude Code
**Versión:** 0.3
**Fecha:** 2026-08-24

---

## 1. Visión general

**Aperta** es una aplicación web local (self-hosted, uso personal) para **analítica de datos abiertos**: permite conectar con APIs de datos abiertos, cargar/importar datasets, explorarlos y depurarlos, transformarlos, y construir visualizaciones y tablas dinámicas mediante una interfaz **drag & drop** al estilo Tableau/Power BI.

Desarrollo **incremental**: se empieza por la carga de datos + perfilado de calidad, y se van añadiendo capas (gráficos, transformación, tablas dinámicas) en fases sucesivas.

---

## 2. Objetivos y alcance

### Objetivos
- Facilitar el análisis exploratorio de datasets de datos abiertos sin necesidad de código (no-code / low-code).
- Ofrecer una experiencia de construcción visual (drag & drop) similar a herramientas BI profesionales.
- Permitir la personalización visual (marca propia, modo claro/oscuro, idioma).

### Fuera de alcance (v1)
- Multi-usuario / gestión de permisos (es una app local de un solo usuario).
- Colaboración en tiempo real.
- Machine learning / modelos predictivos (posible fase futura, no v1).

---

## 3. Arquitectura técnica

### 3.1 Stack tecnológico
- **Full-stack Node.js**, con **Next.js + React** en el frontend (App Router).
- **TypeScript** en todo el proyecto (backend y frontend) para robustez en las estructuras de datos tabulares.
- Servidor Next.js corriendo localmente (`localhost`), pensado para ejecución en el equipo del usuario vía Claude Code.

### 3.2 Almacenamiento — DuckDB embebido

Se usa **DuckDB** (vía [`duckdb-node` / `@duckdb/node-api`]) como motor único, embebido en el proceso Node, sin necesidad de instalar ni configurar un servidor de base de datos aparte.

**Por qué DuckDB y no ficheros JSON/Parquet sueltos:**
- Motor analítico (columnar) pensado exactamente para este caso de uso: agregaciones, pivots, filtros rápidos sobre datasets tabulares.
- Lee de forma nativa CSV, JSON y Parquet — encaja directamente con los formatos típicos de datos abiertos.
- Permite guardar en el mismo fichero `.duckdb` tanto los **datos importados** como los **metadatos del proyecto** (definición de datasets, pasos de transformación aplicados, configuración de gráficos y dashboards guardados) de forma consistente y consultable con SQL.
- Un único fichero portable (fácil de respaldar/mover).

**Esquema de alto nivel (a refinar en implementación):**
- `datasets` — datasets importados (origen, fecha de carga, esquema detectado)
- `dataset_versions` — snapshots tras aplicar transformaciones (o bien pasos de transformación versionados)
- `transformations` — pasos de transformación aplicados a cada dataset (tipo, parámetros, orden)
- `charts` — definición de gráficos (tipo, campos usados en ejes/valores, filtros)
- `dashboards` — composición de gráficos/tablas en un lienzo
- `pivot_tables` — configuración de tablas dinámicas guardadas
- `data_sources` — conectores de API configurados (genéricos y predefinidos)

### 3.3 Ejecución de consultas y transformaciones
- Las transformaciones de datos (filtrar, renombrar, cambiar tipo, agregar columna calculada, agrupar, unir datasets, etc.) se traducen a **SQL sobre DuckDB**, guardando también el "paso" en lenguaje declarativo (JSON) para poder mostrarlo/editarlo en la interfaz (similar al panel de pasos de Power Query).
- Los gráficos y tablas dinámicas se alimentan de queries SQL generadas dinámicamente a partir de la configuración drag & drop (campos en filas/columnas/valores/filtros).

---

## 4. Fuentes de datos abiertos

Enfoque **mixto**:

1. **Conector genérico configurable**
   - El usuario introduce una URL de API (REST/JSON, CSV, o endpoint tipo Socrata/CKAN), método, parámetros de query, headers/autenticación básica si aplica.
   - Vista previa de la respuesta antes de importar, con detección automática de la estructura (array de objetos, paginación, etc.).
   - Guardado como `data_source` reusable.

2. **Portales predefinidos** (plantillas de conexión ya configuradas, ampliable con el tiempo)
   - **Primer portal a implementar (Fase 1): Eurostat** — vía su API REST ([Eurostat Statistics API](https://ec.europa.eu/eurostat/web/main/data/web-services)), que ya sirve como caso real desde el principio del desarrollo.
   - Candidatos para fases posteriores: **datos.gob.es**, **INE (España)**, **data.europa.eu**, portales tipo **CKAN** genéricos.
   - Cada plantilla predefinida resuelve la parte "difícil" (formato de paginación, parámetros específicos, estructura JSON-stat en el caso de Eurostat) para que el usuario solo busque el dataset y pulse "importar".

3. **Import de ficheros locales** (CSV/JSON/Excel) como vía adicional, útil para pruebas y para datasets descargados manualmente.

> ❓ Pendiente de definir en fases posteriores: lista concreta y priorizada de portales predefinidos a soportar (a decidir según los casos de uso reales del usuario).

---

## 5. Módulos funcionales

### 5.1 Carga de datos e ingesta (Fase 1)
- Conexión a API (genérica o predefinida) o carga de fichero.
- Vista previa antes de confirmar importación.
- Guardado del dataset en DuckDB con detección automática de tipos por columna.

### 5.2 Perfilado / revisión de calidad de datos (Fase 1)
- Resumen por columna: tipo detectado, % de valores nulos/vacíos, nº de valores únicos, min/max (numéricos), distribución de categorías (categóricos).
- Alertas de calidad: columnas con muchos nulos, tipos inconsistentes, posibles duplicados de fila.
- Vista tabular del dataset (paginada) para inspección manual.

### 5.3 Visualización y gráficos (Fase 2)
- Constructor **drag & drop**: arrastrar campos a zonas de "Ejes X/Y", "Color", "Tamaño", "Filtros" — estilo Tableau/Power BI.
- Tipos de gráfico iniciales: barras, líneas, área, dispersión (scatter), tarta/donut, mapa de calor (heatmap) básico.
- Panel de filtros interactivos aplicables al gráfico.
- Guardado de gráficos como parte de un dashboard.

### 5.4 Transformación y preparación de datos (Fase 3)
- Panel de pasos tipo "Power Query": cada transformación aplicada queda listada, editable, reordenable, eliminable.
- Operaciones: renombrar/eliminar columnas, cambiar tipo, filtrar filas, columnas calculadas (expresión), agrupar y agregar, unir (join) con otro dataset, dividir/combinar columnas, gestión de nulos (rellenar/eliminar).
- Vista previa en vivo del resultado tras cada paso.

### 5.5 Tablas dinámicas (Fase 4)
- Constructor drag & drop de tabla dinámica: campos a Filas / Columnas / Valores / Filtros, con funciones de agregación (suma, promedio, conteo, min, max).
- Exportación de la tabla resultante (CSV).

### 5.6 Dashboards
- Lienzo donde combinar varios gráficos y tablas dinámicas guardados, con reordenación libre (drag & drop de los propios widgets).

### 5.7 Exportación a Jupyter Notebook (.ipynb) — *funcionalidad futura*
- Una vez el usuario ha maquetado su preparación de datos y visualización (transformaciones + gráfico/tabla dinámica) a través de la interfaz drag & drop, podrá **descargar un notebook `.ipynb`** que reproduce ese mismo pipeline como código, para poder abrirlo y seguir trabajando en Jupyter.
- El notebook generado debe incluir, como celdas separadas y comentadas:
  1. Carga del dataset (desde el origen original: API/fichero, o desde un export intermedio si el origen no es re-ejecutable fácilmente).
  2. Cada paso de transformación aplicado, traducido a **pandas** (o `duckdb` + `pandas`, ya que los pasos ya están guardados en `transformations` como SQL/JSON — ver §3.2 y §5.4), en el mismo orden en que se definieron en el panel de pasos.
  3. Código de generación del gráfico/tabla dinámica, usando una librería estándar de Python (ej. `matplotlib`/`seaborn` o `plotly`, a decidir según el tipo de gráfico) que reproduzca visualmente lo construido en la app.
- Como los pasos de transformación y la definición de gráficos ya se guardan de forma declarativa en DuckDB (tablas `transformations` y `charts`), la generación del notebook es esencialmente un "traductor" de esas definiciones a celdas de código Python — no requiere rediseñar el modelo de datos, solo añadir una capa de export.
- Este export es útil como puente entre el trabajo no-code en la app y un entorno de análisis más avanzado (Jupyter) para quien quiera seguir iterando con código.

---

## 6. Interfaz de usuario — Drag & Drop (estilo Tableau/Power BI)

- Panel lateral izquierdo: lista de campos del dataset activo (arrastrable).
- Zona central: lienzo de construcción (gráfico, tabla dinámica o dashboard según el módulo).
- Zonas de destino ("shelves") claramente delimitadas: Filas, Columnas, Valores, Filtros, Color, Tamaño — según el contexto.
- Feedback visual inmediato al arrastrar (drop zones resaltadas, preview en vivo del resultado).
- Librería recomendada para drag & drop: `dnd-kit` (moderna, accesible, compatible con React 18+).
- Librería recomendada para gráficos: a evaluar entre `Recharts`/`Visx`/`ECharts` según necesidad de interactividad y tipos de gráfico avanzados (a decidir en Fase 2).

---

## 7. Personalización visual — Marca, tema claro/oscuro, idioma

### 7.1 Estilo de marca (branding)
- Se aplica como **tema por defecto** el estilo de marca personal ya definido en la skill `personal-brand-rb`:
  - Paleta: negro `#0B0B0B`, bumblebee `#F2C230`, sunflower `#F7CA18`, tuscany `#C4873C` (uso puntual), blanco `#FFFFFF`, gris `#969690`.
  - Tipografía: títulos en Orbitron (o Exan-3 si está disponible), cuerpo en Rajdhani.
  - Estética: tech/HUD, alto contraste, sin gradientes, sin elementos decorativos superfluos.
- Implementación técnica: **CSS variables** (custom properties) centralizadas en un archivo de tema, para que la marca sea un "skin" intercambiable y no esté hardcodeada en los componentes.
- El sistema debe permitir en el futuro **cambiar la paleta/tipografía** desde una pantalla de configuración (para poder aplicar otras marcas más adelante si hiciera falta), aunque en v1 el foco es tener bien implementado el tema RB.

### 7.2 Modo claro / oscuro
- Toggle de tema claro/oscuro accesible desde la interfaz (ej. cabecera).
- Ambos modos definidos como variantes de las mismas CSS variables (no como hojas de estilo separadas), respetando la paleta de marca en ambos casos (fondo negro en oscuro; fondo blanco con acentos en claro, según reglas de la skill de marca para documentos).
- Persistencia de la preferencia del usuario (localStorage).

### 7.3 Multiidioma (i18n)
- Idiomas soportados en v1: **español (es)**, **gallego (gl)**, **italiano (it)**.
- Librería recomendada: `next-intl` (integración nativa con Next.js App Router) o `i18next` + `react-i18next`.
- Selector de idioma en la interfaz, con persistencia de preferencia.
- Estructura de archivos de traducción por idioma desde el inicio del proyecto (aunque se empiece implementando solo español), para no tener que refactorizar strings más adelante.

---

## 8. Roadmap incremental

| Fase | Alcance | Resultado esperado |
|---|---|---|
| **Fase 0** | Setup del proyecto (Next.js + TS + DuckDB embebido), estructura base, tema de marca (claro/oscuro), i18n scaffolding | App arrancable, vacía pero con base sólida |
| **Fase 1** | Carga de datos (API genérica + import fichero + conector predefinido de **Eurostat** como primer caso real) + perfilado de calidad | Se puede importar un dataset (ej. de Eurostat) y ver su calidad/estructura |
| **Fase 2** | Constructor de gráficos drag & drop | Se pueden crear y guardar gráficos a partir de un dataset |
| **Fase 3** | Motor de transformación de datos (panel de pasos) | Se puede limpiar/transformar un dataset antes de graficarlo |
| **Fase 4** | Tablas dinámicas + dashboards | Se pueden combinar gráficos y tablas en un lienzo |
| **Fase 5** | Portales predefinidos adicionales (datos.gob.es, INE, data.europa.eu), refinamiento UX, **exportación de dashboards/gráficos a imagen y PDF** | App madura para uso habitual |
| **Fase 6** *(futura)* | Exportación a Jupyter Notebook (`.ipynb`) del pipeline de datos + visualización (ver §5.7) | El usuario puede descargar y seguir trabajando en Jupyter con el código equivalente a lo maquetado en la app |

> Cada fase debe ser funcional de punta a punta (aunque limitada en alcance) para poder probarla con datos reales antes de avanzar a la siguiente.

---

## 9. Requisitos no funcionales

- **Rendimiento:** diseñado por defecto para el **caso medio** (datasets de entre ~10.000 y 500.000 filas), que es el rango de tamaño típico de la mayoría de datasets de portales de datos abiertos (Eurostat, INE, etc.). Gracias a DuckDB (motor columnar), la app debería escalar sin cambios de arquitectura hasta ~1-2 millones de filas; para volúmenes mayores, evaluar paginación/streaming en fases futuras si surge la necesidad real.
- **Portabilidad:** toda la app (código + base de datos DuckDB) debe poder moverse copiando la carpeta del proyecto.
- **Sin dependencias externas obligatorias:** debe funcionar 100% local, sin necesidad de servicios en la nube (salvo, evidentemente, las APIs de datos abiertos externas que el usuario decida conectar).
- **Accesibilidad básica:** contraste adecuado en ambos temas, navegación por teclado en los elementos drag & drop (mínimo viable, no WCAG completo en v1).

---

## 10. Estructura de proyecto sugerida

```
/app                     → rutas Next.js (App Router)
  /api                   → API routes (ingesta, queries, transformaciones)
  /(dashboard)           → páginas de la app
/components
  /drag-drop             → componentes de shelves, drop zones, field list
  /charts                → componentes de gráficos
  /pivot-table
  /data-profile
/lib
  /duckdb                → cliente y helpers de acceso a DuckDB
  /connectors             → lógica de conectores de API (genérico + predefinidos)
  /transformations        → motor de transformación → SQL
/theme
  /tokens.css             → CSS variables (marca, claro/oscuro)
/i18n
  /es.json /gl.json /it.json
/data                     → fichero(s) .duckdb local(es)
```

---

## 11. Próximos pasos con Claude Code (v0.2)

1. Confirmar este documento (ajustar lo que no encaje).
2. Ejecutar **Fase 0** (setup + tema + i18n scaffolding) como primer prompt/tarea concreta a Claude Code.
3. Definir con más detalle, antes de la Fase 1, la(s) primera(s) API(s) de datos abiertos concreta(s) con las que se probará la ingesta (para tener un caso real desde el primer momento).

---

## 12. Decisiones cerradas

- **Almacenamiento:** DuckDB embebido (fichero único, datos + metadatos del proyecto). Ver §3.2.
- **Primer portal predefinido (Fase 1):** Eurostat, vía su API REST. Otros portales (datos.gob.es, INE, data.europa.eu) quedan para Fase 5.
- **Volumen de datos de diseño por defecto:** caso medio (~10.000–500.000 filas), sin descartar escalar hasta 1-2M gracias a DuckDB si hiciera falta más adelante.
- **Exportación a imagen/PDF de dashboards y gráficos:** no es necesaria en v1, se implementa en Fase 5.
- **Exportación a Jupyter Notebook (.ipynb):** funcionalidad futura, Fase 6. Ver §5.7.

## 13. Preguntas abiertas restantes

- Ninguna pendiente por el momento. Cualquier nueva duda que surja durante el desarrollo se puede añadir aquí.
