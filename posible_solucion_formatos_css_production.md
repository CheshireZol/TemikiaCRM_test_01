Sí, aquí el problema casi seguro **no es Nginx**. Es la forma en que el HTML de impresión está dependiendo de estilos externos/cargados en otra ventana.

En tu `LeadDetails.jsx`, la función `handlePrintFicha` hace esto:

```
constparentStylesheets=Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
.map(link =>`<link rel="stylesheet" href="${link.href}">`)
.join('\n');

constparentStyles=Array.from(document.querySelectorAll('style'))
.map(style =>`<style>${style.innerHTML}</style>`)
.join('\n');
```

Luego construye un HTML nuevo, abre una ventana con `window.open`, escribe el HTML y ejecuta `window.print()` automáticamente.

La falla probable en producción es esta:

```
La ventana nueva imprime antes de que los CSS externos terminen de cargar.
```

Además, tu template usa muchas clases tipo Tailwind:

```
bg-slate-100
text-slate-900
max-w-5xl
grid
rounded-xl
shadow-md
text-[9px]
```

pero tu `package.json` no tiene Tailwind instalado ni configurado; sólo Vite/React y dependencias generales. Eso hace que el PDF dependa demasiado de estilos heredados del documento principal o de CSS no garantizado.

Tu CSP actual permite inline styles, Google Fonts y scripts inline, así que **no parece el mismo caso de Google Maps**. El servidor ya tiene `styleSrc` con `'unsafe-inline'` y Google Fonts, y `scriptSrc` también permite `'unsafe-inline'`.

---

## Diagnóstico rápido

Temporalmente cambia esto:

```
window.onload=function() {
window.print();
setTimeout(function() {window.close(); },500);
};
```

por esto:

```
window.onload=function() {
console.log('Print window loaded');
};
```

Así la ventana no se cierra. En producción abre DevTools en esa ventana y revisa:

```
Network → si carga /assets/*.css
Console → si hay errores CSP o 404 de CSS/fonts
Elements → si los estilos están aplicados
```

Si ves el HTML pero sin clases aplicadas, confirmamos que el CSS no se está cargando o no contiene esas clases.

---

# Corrección recomendada

No dependas del CSS del CRM principal. Para PDF/impresión, mete un CSS autosuficiente dentro del HTML.

## 1. Agrega un CSS interno para impresión

Dentro de `handlePrintFicha`, antes de `htmlContent`, agrega:

```
constprintCss=`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  html, body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', Arial, sans-serif;
    background: #f1f5f9;
    color: #0f172a;
  }

  body {
    min-height: 100vh;
  }

  .print-container {
    width: 100%;
    max-width: 1024px;
    margin: 0 auto;
    padding: 16px;
  }

  .sheet {
    background: #e2e8f0;
    border: 1px solid #cbd5e1;
    border-radius: 16px;
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
    padding: 20px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }

  .eyebrow {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-weight: 800;
    color: #0891b2;
  }

  .title {
    margin: 3px 0 4px;
    font-size: 22px;
    line-height: 1.1;
    font-weight: 800;
    color: #0f172a;
  }

  .meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    font-size: 11px;
    color: #475569;
  }

  .brand {
    text-align: right;
    font-size: 18px;
    font-weight: 900;
    color: #0f172a;
  }

  .brand small {
    display: block;
    margin-top: 4px;
    font-size: 9px;
    font-weight: 500;
    color: #64748b;
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    background: #f8fafc;
    padding: 10px;
    margin-bottom: 14px;
  }

  .kpi {
    text-align: center;
    border-right: 1px solid #cbd5e1;
  }

  .kpi:last-child {
    border-right: none;
  }

  .kpi-label {
    display: block;
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 800;
    color: #64748b;
  }

  .kpi-value {
    display: inline-block;
    margin-top: 4px;
    font-size: 18px;
    font-weight: 900;
    color: #0f172a;
  }

  .badge {
    display: inline-block;
    margin-top: 4px;
    padding: 3px 9px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    border: 1px solid #bfdbfe;
    color: #1e40af;
    background: #dbeafe;
  }

  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .card {
    background: #f8fafc;
    border-top: 4px solid #22d3ee;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
    padding: 12px;
  }

  .card-title {
    margin: 0 0 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 900;
    color: #0f172a;
  }

  .field-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
  }

  .field-grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 9px;
  }

  .field {
    min-width: 0;
  }

  .label {
    display: block;
    font-size: 8.5px;
    text-transform: uppercase;
    font-weight: 800;
    color: #64748b;
    margin-bottom: 3px;
  }

  .value {
    display: block;
    font-size: 12px;
    line-height: 1.25;
    font-weight: 600;
    color: #0f172a;
    word-break: break-word;
  }

  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 10.5px;
  }

  .muted-box {
    min-height: 45px;
    padding: 8px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
    font-size: 11px;
    line-height: 1.35;
    color: #334155;
    white-space: pre-wrap;
  }

  .section-full {
    margin-top: 14px;
  }

  .products-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .product {
    padding: 9px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
  }

  .product-category {
    display: block;
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 800;
    color: #0891b2;
  }

  .product-title {
    display: block;
    margin-top: 2px;
    font-size: 12px;
    font-weight: 800;
    color: #1e293b;
  }

  .product-desc {
    margin: 4px 0 0;
    font-size: 9.5px;
    line-height: 1.25;
    color: #475569;
  }

  .footer {
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid #cbd5e1;
    text-align: center;
    font-size: 9px;
    color: #64748b;
  }

  a {
    color: #0891b2;
    text-decoration: underline;
    word-break: break-all;
  }

  @media print {
    @page {
      size: letter;
      margin: 0.4cm;
    }

    html, body {
      background: #ffffff !important;
      font-size: 9.5pt !important;
      line-height: 1.15 !important;
    }

    .print-container {
      max-width: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .sheet {
      border-radius: 0 !important;
      box-shadow: none !important;
      padding: 10px !important;
    }

    .card {
      box-shadow: none !important;
      page-break-inside: avoid;
    }

    .columns {
      gap: 8px !important;
    }

    .stack {
      gap: 8px !important;
    }

    .section-full {
      margin-top: 8px !important;
    }
  }
`;
```

---

## 2. Deja de inyectar los estilos del padre

Cambia esto:

```
${parentStylesheets}
${parentStyles}
<style>
@importurl(...);
  ...
</style>
```

por esto:

```
<basehref="${window.location.origin}/">
<style>${printCss}</style>
```

Así el HTML de impresión ya no depende del CSS compilado por Vite, ni de si el stylesheet de producción cargó o no.

---

## 3. Reemplaza las clases Tailwind del HTML de impresión

El template actual tiene clases tipo:

```
<bodyclass="bg-slate-100 text-slate-900 min-h-screen">
<mainclass="max-w-5xl mx-auto p-2 sm:p-4 print-container">
<articleclass="bg-slate-200 border border-slate-300 rounded-xl shadow-md ...">
```

Cámbialas por clases propias del CSS anterior:

```
<body>
<mainclass="print-container">
<articleclass="sheet">
```

Ejemplo de cabecera:

```
<divclass="header">
<div>
<spanclass="eyebrow">FICHA TÉCNICA DE PROSPECCIÓN</span>
<h1class="title">${form.nombre}</h1>

<divclass="meta-row">
<strong>${lead.giro_nombre || form.estilo || 'Sin Categoría'}</strong>
<span>•</span>
<spanclass="mono">GMaps ID: ${lead.negocios_gmaps_id || 'No Enlazado'}</span>
<span>•</span>
<span>★ ${lead.total_score ? lead.total_score + ' (' + (lead.reviews_count || 0) + ')' : '0 (0)'}</span>
</div>
</div>

<divclass="brand">
    Temikia
<small>Impreso el: ${fechaImpresion}</small>
</div>
</div>
```

Ejemplo de KPIs:

```
<divclass="kpi-grid">
<divclass="kpi">
<spanclass="kpi-label">Score Temikia</span>
<spanclass="kpi-value">${lead.lead_score || '0'}</span>
<spanclass="value">/100</span>
</div>

<divclass="kpi">
<spanclass="kpi-label">Estatus Pipeline</span>
<spanclass="badge">${(form.estatus || 'nuevo').toUpperCase()}</span>
</div>

<divclass="kpi">
<spanclass="kpi-label">Prioridad Comercial</span>
<spanclass="badge">${(form.prioridad || 'baja').toUpperCase()}</span>
</div>
</div>
```

---

# Corrección rápida si quieres probar sin reescribir todo

Primero prueba esta mejora mínima. Reemplaza el bloque final:

```
constprintHtml=htmlContent.replace('</body>',`
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    };
  <\/script>
</body>`);
```

por este:

```
constprintHtml=htmlContent.replace('</body>',`
  <script>
    async function waitForPrintAssets() {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

      await Promise.all(links.map(link => {
        return new Promise(resolve => {
          if (link.sheet) return resolve();

          link.onload = resolve;
          link.onerror = resolve;

          setTimeout(resolve, 4000);
        });
      }));

      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (e) {}
      }

      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    window.addEventListener('load', async function() {
      await waitForPrintAssets();
      window.focus();
      window.print();
      setTimeout(function() { window.close(); }, 1000);
    });
  <\/script>
</body>`);
```

Después:

```
cd /root/temikiaCRM
npm run build
pm2restart temikia-crm--update-env
pm2 save
```

Esta prueba sirve para confirmar si el problema era “imprime antes de que carguen estilos”.

---

# Mi recomendación directa

No lo resolvería con más CSP. Tu CSP ya permite lo necesario para estilos inline, fuentes e inline script. El problema estructural es que el PDF depende de clases externas y de copiar CSS del documento principal.

La solución sólida es:

```
PDF/print HTML con CSS propio, inline y autosuficiente.
No depender de Tailwind.
No depender de estilos del CRM padre.
No imprimir hasta que fuentes/estilos estén listos.
```

Primero aplica la **corrección rápida del waitForPrintAssets**. Si mejora, confirmamos causa. Después hacemos la versión limpia con CSS propio.