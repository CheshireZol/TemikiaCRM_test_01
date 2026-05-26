import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  MapPin, 
  Calendar, 
  Phone, 
  Mail, 
  Sparkles,
  ExternalLink,
  MessageSquare,
  Clock,
  Compass,
  RefreshCw,
  Check,
  Printer
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  parseStringArray, 
  parseJsonbField, 
  formatDate,
  calculateAILeadScore,
  generateAISalesStrategy,
  getSuggestedProducts
} from '../utils.js';

const LeadDetails = ({ leadId, onClose, onSaveSuccess }) => {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [girosList, setGirosList] = useState([]); // Giros Lookup state
  const [miembros, setMiembros] = useState([]); // Team Members list
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'success' | 'error'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // State for custom delete confirmation modal

  // Editable Form states
  const [form, setForm] = useState({
    nombre: '',
    estilo: '',
    giro_id: '', // FK lookup
    prioridad: '',
    estatus: '',
    owner: '',
    miembro_id: '', // FK lookup for team members
    contacto_nombre: '',
    contacto_puesto: '',
    sitio_web: '',
    correo: '',
    telefono: '',
    whatsapp: '',
    direccion1: '',
    ciudad: '',
    estado: '',
    pais: '',
    notas: '',
    ficha_prospeccion: '',
    canal_preferido: 'whatsapp'
  });

  // Load giros & team members dynamic options once
  useEffect(() => {
    const fetchGiros = async () => {
      try {
        const res = await fetch('/api/giros');
        if (res.ok) {
          const data = await res.json();
          setGirosList(data);
        }
      } catch (err) {
        console.error('Error fetching giros lookups:', err);
      }
    };
    const fetchMiembros = async () => {
      try {
        const res = await fetch('/api/miembros');
        if (res.ok) {
          const data = await res.json();
          setMiembros(data);
        }
      } catch (err) {
        console.error('Error fetching team members catalog:', err);
      }
    };
    fetchGiros();
    fetchMiembros();
  }, []);

  // Fetch full details of the selected lead
  useEffect(() => {
    const fetchLeadDetail = async () => {
      if (!leadId) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/prospectos/${leadId}`);
        if (!res.ok) throw new Error('Error al cargar detalle');
        const data = await res.json();
        
        setLead(data);
        
        // Populate form
        setForm({
          nombre: data.nombre || '',
          estilo: data.estilo || '',
          giro_id: data.giro_id || '', // Populate FK
          prioridad: data.prioridad || 'baja',
          estatus: data.estatus || 'nuevo',
          owner: data.owner || '',
          miembro_id: data.miembro_id || '', // Populate FK
          contacto_nombre: data.contacto_nombre || '',
          contacto_puesto: data.contacto_puesto || '',
          sitio_web: data.sitio_web || '',
          correo: parseStringArray(data.correo).join(', '),
          telefono: parseStringArray(data.telefono).join(', '),
          whatsapp: parseStringArray(data.whatsapp).join(', '),
          direccion1: data.direccion1 || '',
          ciudad: data.ciudad || '',
          estado: data.estado || '',
          pais: data.pais || '',
          notas: data.notas || '',
          ficha_prospeccion: data.ficha_prospeccion || '',
          canal_preferido: data.canal_preferido || 'whatsapp'
        });
      } catch (err) {
        console.error(err);
        alert('Error al conectar con la base de datos de producción.');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchLeadDetail();
  }, [leadId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleRecalculateScore = () => {
    // Generate virtual object representing current state to score it
    const virtualLead = {
      ...lead,
      nombre: form.nombre,
      sitio_web: form.sitio_web,
      correo: form.correo,
      telefono: form.telefono,
      whatsapp: form.whatsapp,
      contacto_nombre: form.contacto_nombre,
      prioridad: form.prioridad,
      notas: form.notas,
      rrss: lead ? lead.rrss : '{}'
    };

    const newScore = calculateAILeadScore(virtualLead);
    setLead(prev => ({ ...prev, lead_score: newScore }));
  };

  // Run the AI Commercial strategy generator and update ficha
  const handleGenerateStrategy = () => {
    if (!lead) return;
    
    const virtualLead = {
      ...lead,
      nombre: form.nombre,
      estilo: form.estilo,
      ciudad: form.ciudad,
      pais: form.pais,
      canal_preferido: form.canal_preferido,
      sitio_web: form.sitio_web,
      correo: form.correo,
      telefono: form.telefono,
      whatsapp: form.whatsapp,
      contacto_nombre: form.contacto_nombre,
      notas: form.notas
    };

    const strategy = generateAISalesStrategy(virtualLead);
    if (!strategy) return;
    
    // Format into elegant text
    const formattedText = `===========================================
PROPUESTA COMERCIAL - TEMIKIA IA AGENCY
===========================================
Giro Comercial Categorizado: ${strategy.giroCategorizado}
Fecha de Análisis: ${formatDate(strategy.fechaGeneracion)}

ANÁLISIS DE RADIOGRAFÍA INICIAL (AUDITORÍA AUTOMÁTICA):
${strategy.auditoriaInicial.map((line, idx) => `${idx + 1}. ${line}`).join('\n\n')}

ELÉVATOR PITCH SUGERIDO:
"${strategy.pitchElevator}"

ESTRATEGIAS CLAVE DE AUTOMATIZACIÓN DE VENTAS:
${strategy.estrategiasIA.map((s, i) => `${i + 1}. ${s}`).join('\n')}

TECNOLOGÍAS / INTEGRACIONES RECOMENDADAS:
${strategy.integracionesRecomendadas.map(t => `- ${t}`).join('\n')}

ESTADO DEL LEAD SCORE: ${lead.lead_score}/100`;

    setForm(prev => ({ ...prev, ficha_prospeccion: formattedText }));
    
    // Automatically trigger visual alert
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0.2, y: 0.8 },
      colors: ['#06B6D4', '#2563EB']
    });
  };

  // Save changes via PUT request to Express
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveStatus('idle');
      
      const payload = {
        ...form,
        lead_score: lead.lead_score // Include the computed AI score
      };

      const res = await fetch(`/api/prospectos/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Error al guardar datos');
      
      onSaveSuccess();
      setSaveStatus('success');
      
      // Auto-revert back to idle after 2.5 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2500);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2500);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete lead from PG
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/prospectos/${leadId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Error al eliminar');

      onSaveSuccess();
      alert('El registro ha sido eliminado exitosamente de la base de datos.');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar el registro de la base de datos.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Print PDF business profile ("Ficha Técnica / Radiografía del Negocio") using native browser print
  const handlePrintFicha = () => {
    if (!lead) return;
    
    // Grab all stylesheets and inline styles from the parent document to preserve formatting in dev and production
    const parentStylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map(link => `<link rel="stylesheet" href="${link.href}">`)
      .join('\n');

    const parentStyles = Array.from(document.querySelectorAll('style'))
      .map(style => `<style>${style.innerHTML}</style>`)
      .join('\n');

    const suggestedProducts = getSuggestedProducts(lead, form);
    
    // Format dates to friendly Spanish format
    const fechaCreacion = formatDate(lead.created_at);
    const fechaActualizacion = formatDate(lead.updated_at);
    const fechaImpresion = new Date().toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Extract emails and phones from arrays
    const emailsList = parseStringArray(form.correo).join(', ') || 'No provisto';
    const phonesList = parseStringArray(form.telefono).join(', ') || 'No provisto';
    const whatsappList = parseStringArray(form.whatsapp).join(', ') || 'No provisto';

    // Format Social Networks (with full URLs)
    const parsedRrss = parseJsonbField(lead.rrss);
    const socialNetworksHtml = Object.keys(parsedRrss)
      .filter(key => parsedRrss[key] && parsedRrss[key].trim() !== '')
      .map(key => {
        const url = parsedRrss[key].trim();
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        return `• <a href="${url}" target="_blank" style="color:#0ea5e9; text-decoration:underline; word-break:break-all;"><strong>${label}</strong>: ${url}</a>`;
      })
      .join('<br/>') || 'Ninguna identificada';

    // Format Web Search references
    const webSearchList = parseStringArray(lead.web_search);
    const webSearchHtml = webSearchList.length > 0
      ? webSearchList.map(url => {
          try {
            const domain = new URL(url).hostname;
            return `• <a href="${url}" target="_blank" style="color:#0ea5e9; text-decoration:underline;">${domain}</a><span class="text-slate-400"> (${url})</span>`;
          } catch(e) {
            return `• ${url}`;
          }
        }).join('<br/>')
      : 'Ninguna búsqueda de referencia';

    // Format Competitors / Similar Searches
    const parsedPeopleAlsoSearch = parseJsonbField(lead.peoplealsosearch);
    const relatedResults = parsedPeopleAlsoSearch && Array.isArray(parsedPeopleAlsoSearch.resultados)
      ? parsedPeopleAlsoSearch.resultados
      : [];
    
    const similaresHtml = relatedResults.length > 0
      ? relatedResults.map(item => `• <strong>${item.title}</strong> - ${item.category || 'Similar'} <span class="text-yellow-600 font-bold">★ ${item.totalScore || item.total_score || '0'}</span> (${item.reviewsCount || item.reviews_count || 0} reseñas)`).join('<br/>')
      : 'Ninguno catalogado en el sector';

    // Premium Canva-styled HTML template matching html-radiografia_negocio.html
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Temikia - Ficha Técnica - ${form.nombre}</title>
  <!-- Injected Parent Styles (Same-Origin & Dev friendly to bypass CSP script block) -->
  ${parentStylesheets}
  ${parentStyles}
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    
    body {
      font-family: 'Inter', sans-serif;
      background-color: #f1f5f9;
    }

    /* Optimización de impresión */
    @media print {
      @page {
        size: letter;
        margin: 0.4cm 0.4cm;
      }
      body {
        background-color: #ffffff !important;
        color: #0f172a !important;
        font-size: 9.5pt !important;
        line-height: 1.15 !important;
      }
      .print-container {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .print-gap {
        gap: 0.4rem !important;
      }
      .print-card-padding {
        padding: 0.6rem !important;
      }
      .print-lead-header {
        margin-bottom: 0.5rem !important;
        padding-bottom: 0.5rem !important;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body class="bg-slate-100 text-slate-900 min-h-screen">
  <main class="max-w-5xl mx-auto p-2 sm:p-4 print-container">
    
    <!-- FICHA UNIFICADA (Estilo Canva de 1 página) -->
    <article class="bg-slate-200 border border-slate-300 rounded-xl shadow-md p-3 sm:p-5 text-slate-800 print-gap flex flex-col gap-3.5">
      
      <!-- CABECERA -->
      <div class="border-b border-slate-300 pb-2 flex flex-row items-start justify-between gap-1 print-lead-header">
        <div>
          <span class="text-[9px] uppercase tracking-widest font-extrabold text-cyan-600">FICHA TÉCNICA DE PROSPECCIÓN</span>
          <h1 class="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight mt-0.5">${form.nombre}</h1>
          
          <div class="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-600">
            <span class="font-bold uppercase text-slate-800">${lead.giro_nombre || form.estilo || 'Sin Categoría'}</span>
            <span>•</span>
            <span class="font-mono text-[10px]">GMaps ID: ${lead.negocios_gmaps_id || 'No Enlazado'}</span>
            <span>•</span>
            <span class="flex items-center gap-0.5 text-yellow-600 font-semibold text-[10px]">
              ★ <span class="text-slate-700">${lead.total_score ? lead.total_score + ' (' + (lead.reviews_count || 0) + ')' : '0 (0)'}</span>
            </span>
          </div>
        </div>
        
        <div class="text-right">
          <span class="text-base font-black tracking-tight text-slate-900">Temikia</span>
          <p class="text-[9px] text-slate-500">Impreso el: <span class="font-medium">${fechaImpresion}</span></p>
        </div>
      </div>

      <!-- KPIS PRINCIPALES -->
      <div class="grid grid-cols-3 gap-2 border border-slate-300 rounded-lg p-2 bg-slate-50">
        <div class="text-center border-r border-slate-300">
          <span class="text-[8px] font-bold text-slate-500 uppercase block tracking-wider">SCORE TEMIKIA</span>
          <div class="mt-0.5">
            <span class="text-lg font-black text-slate-900">${lead.lead_score || '0'}</span>
            <span class="text-[10px] text-slate-400 font-bold">/100</span>
          </div>
        </div>
        <div class="text-center border-r border-slate-300">
          <span class="text-[8px] font-bold text-slate-500 uppercase block tracking-wider">ESTATUS PIPELINE</span>
          <span class="text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded inline-block mt-0.5">${(form.estatus || 'nuevo').toUpperCase()}</span>
        </div>
        <div class="text-center">
          <span class="text-[8px] font-bold text-slate-500 uppercase block tracking-wider">PRIORIDAD COMERCIAL</span>
          <span class="text-[10px] font-extrabold uppercase bg-gray-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded inline-block mt-0.5">${(form.prioridad || 'baja').toUpperCase()} PRIORIDAD</span>
        </div>
      </div>

      <!-- GRID DE DOS COLUMNAS -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 print-gap">
        
        <!-- COLUMNA IZQUIERDA -->
        <div class="flex flex-col gap-3.5 print-gap">
          
          <!-- RADIOGRAFÍA -->
          <div class="bg-slate-50 border-t-4 border-cyan-400 rounded-lg shadow-sm overflow-hidden print-card-padding p-3 flex flex-col gap-2">
            <h3 class="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200">
              Radiografía Negocio
            </h3>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label class="text-[8.5px] uppercase font-bold text-slate-500 block">Canal Preferido</label>
                <span class="text-xs text-slate-900 font-semibold mt-0.5 block capitalize">${form.canal_preferido}</span>
              </div>
              <div>
                <label class="text-[8.5px] uppercase font-bold text-slate-500 block">Ejecutivo Asignado</label>
                <span class="text-xs text-slate-900 font-semibold mt-0.5 block">${lead.owner_nombre || 'Sin Asignar'}</span>
              </div>
            </div>
          </div>

          <!-- DATOS CONTACTO -->
          <div class="bg-slate-50 border-t-4 border-cyan-400 rounded-lg shadow-sm overflow-hidden print-card-padding p-3 flex flex-col gap-2">
            <h3 class="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200">
              Datos de Contacto
            </h3>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label class="text-[8.5px] uppercase font-bold text-slate-500 block">Nombre del Contacto</label>
                <span class="text-xs text-slate-900 font-semibold mt-0.5 block">${form.contacto_nombre || 'No provisto'}</span>
              </div>
              <div>
                <label class="text-[8.5px] uppercase font-bold text-slate-500 block">Puesto del Contacto</label>
                <span class="text-xs text-slate-900 font-semibold mt-0.5 block">${form.contacto_puesto || 'No provisto'}</span>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
              <div>
                <label class="text-[8.5px] uppercase font-bold text-slate-500 block">Correos Electrónicos</label>
                <span class="text-[11px] text-slate-900 font-mono block break-all mt-0.5">${emailsList}</span>
              </div>
              <div>
                <label class="text-[8.5px] uppercase font-bold text-slate-500 block">Teléfonos / WhatsApp</label>
                <span class="text-[11px] text-slate-900 font-mono block break-all mt-0.5">${phonesList} / ${whatsappList}</span>
              </div>
            </div>
          </div>

        </div>

        <!-- COLUMNA DERECHA -->
        <div class="flex flex-col gap-3.5 print-gap">
          
          <!-- UBICACIÓN -->
          <div class="bg-slate-50 border-t-4 border-cyan-400 rounded-lg shadow-sm overflow-hidden print-card-padding p-3 flex flex-col gap-2">
            <h3 class="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200">
              Ubicación Geográfica
            </h3>
            <div class="text-xs space-y-2">
              <div>
                <label class="text-[8.5px] uppercase font-bold text-slate-500 block">Dirección Completa</label>
                <p class="text-xs text-slate-900 font-medium leading-tight mt-0.5">${form.direccion1 || 'No provista'}</p>
              </div>
              
              <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200">
                <div class="col-span-2">
                  <label class="text-[8.5px] uppercase font-bold text-slate-500 block">Distrito / Colonia</label>
                  <span class="text-xs text-slate-900 mt-0.5 block">No provisto</span>
                </div>
                <div>
                  <label class="text-[8.5px] uppercase font-bold text-slate-500 block">Código Postal</label>
                  <span class="text-xs text-slate-900 font-mono mt-0.5 block">No provisto</span>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200">
                <div class="col-span-2">
                  <label class="text-[8.5px] uppercase font-bold text-slate-500 block">Ciudad / Delegación</label>
                  <span class="text-xs text-slate-900 mt-0.5 block">${form.ciudad || 'No provista'}</span>
                </div>
                <div>
                  <label class="text-[8.5px] uppercase font-bold text-slate-500 block">Estado</label>
                  <span class="text-xs text-slate-900 mt-0.5 block">${form.estado || 'No provisto'}</span>
                </div>
              </div>

              <div class="pt-1 border-t border-slate-200">
                <label class="text-[8.5px] uppercase font-bold text-slate-500 block">Enlace Satelital de Google Maps (URL Completa)</label>
                <a href="${lead.place_url || '#'}" target="_blank" class="text-[9px] text-cyan-700 hover:underline break-all font-mono block leading-tight mt-0.5">
                  ${lead.place_url || 'No provisto'}
                </a>
              </div>
            </div>
          </div>

          <!-- PRESENCIA DIGITAL -->
          <div class="bg-slate-50 border-t-4 border-cyan-400 rounded-lg shadow-sm overflow-hidden print-card-padding p-3 flex flex-col gap-2">
            <h3 class="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200">
              Presencia Digital y Redes
            </h3>
            <div class="text-xs space-y-2">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-[8.5px] uppercase font-bold text-slate-500 block">Sitio Web Oficial</label>
                  <span class="text-xs font-mono text-slate-900 break-all block mt-0.5">${form.sitio_web || 'No provisto'}</span>
                </div>
                <div>
                  <label class="text-[8.5px] uppercase font-bold text-slate-500 block">Redes Sociales</label>
                  <div class="text-xs text-slate-900 leading-tight block mt-0.5">${socialNetworksHtml}</div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200">
                <div>
                  <label class="text-[8.5px] uppercase font-bold text-slate-500 block">Enlaces Búsqueda (Web Search)</label>
                  <div class="text-[9.5px] text-slate-700 font-mono break-all leading-tight mt-0.5">${webSearchHtml}</div>
                </div>
                <div>
                  <label class="text-[8.5px] uppercase font-bold text-slate-500 block">Competencia y Similares</label>
                  <div class="text-[9.5px] text-slate-700 font-sans leading-tight mt-0.5">${similaresHtml}</div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- OBSERVACIONES -->
      <div class="bg-slate-50 border-t-4 border-cyan-400 rounded-lg shadow-sm overflow-hidden print-card-padding p-3 flex flex-col gap-2.5">
        <h3 class="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200">
          Ficha de Prospección e Internos
        </h3>
        
        <div>
          <label class="text-[8.5px] uppercase font-bold text-slate-500 block mb-0.5">Notas / Observaciones del Lead</label>
          <div class="text-[11px] text-slate-700 italic min-h-[45px] bg-white p-2 rounded border border-slate-200 leading-snug whitespace-pre-wrap">${form.notas || 'Sin anotaciones preliminares.'}</div>
        </div>

        <div class="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-[9px] text-slate-500 font-mono">
          <div>
            <span class="uppercase block font-bold text-slate-400">Fecha de Creación</span>
            <span class="text-slate-700">${fechaCreacion}</span>
          </div>
          <div>
            <span class="uppercase block font-bold text-slate-400">Última Actualización</span>
            <span class="text-slate-700">${fechaActualizacion}</span>
          </div>
          <div>
            <span class="uppercase block font-bold text-slate-400">Próximo Contacto At</span>
            <span class="text-slate-700 italic">${lead.proximo_paso_at ? formatDate(lead.proximo_paso_at) : 'Null'}</span>
          </div>
          <div>
            <span class="uppercase block font-bold text-slate-400">Último Contacto At</span>
            <span class="text-slate-700 italic">${lead.ultimo_contacto_at ? formatDate(lead.ultimo_contacto_at) : 'Null'}</span>
          </div>
        </div>
      </div>

      <!-- OPORTUNIDADES DE VENTA Y PROPUESTA DE VALOR -->
      <div class="bg-slate-50 border-t-4 border-cyan-500 rounded-lg shadow-sm overflow-hidden print-card-padding p-3 flex flex-col gap-2">
        <h3 class="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200">
          Auditoría de Oportunidades y Propuesta de Valor (Temikia CRM Engine)
        </h3>
        <div class="grid grid-cols-2 gap-2 text-xs">
          ${suggestedProducts.map(p => `
            <div class="p-2 rounded border border-slate-200 bg-white flex flex-col gap-0.5">
              <span class="text-[8px] font-bold text-cyan-600 uppercase block tracking-wide">${p.category}</span>
              <span class="text-xs font-bold text-slate-800 block">${p.feature}</span>
              <p class="text-[9.5px] text-slate-600 leading-tight block mt-0.5">${p.description}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- PIE DE PÁGINA -->
      <footer class="text-center text-[9px] text-slate-500 pt-1.5 mt-0.5 border-t border-slate-300">
        <p>© 2026 Temikia.com — Auditoría Comercial Integrada con Temikia. Toda la información es confidencial.</p>
      </footer>

    </article>
  </main>
</body>
</html>
    `;

    // Robust native window.print() in a new tab
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor permite los pop-ups para poder imprimir la ficha técnica.');
      return;
    }

    // Add self-printing script specifically for browser print
    const printHtml = htmlContent.replace('</body>', `
      <script>
        async function waitForPrintAssets() {
          const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

          await Promise.all(links.map(link => {
            return new Promise(resolve => {
              if (link.sheet) return resolve();

              link.onload = resolve;
              link.onerror = resolve;

              // Safe fallback timeout
              setTimeout(resolve, 4000);
            });
          }));

          if (document.fonts && document.fonts.ready) {
            try {
              await document.fonts.ready;
            } catch (e) {}
          }

          // Force browser reflow
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        window.addEventListener('load', async function() {
          await waitForPrintAssets();
          window.focus();
          window.print();
          setTimeout(function() { window.close(); }, 1000);
        });
      <\/script>
    </body>`);

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  if (loading || !lead) {
    return (
      <div className="drawer-backdrop" onClick={onClose}>
        <div className="drawer" onClick={(e) => e.stopPropagation()} style={{ justifyContent: 'center', alignItems: 'center' }}>
          <RefreshCw size={32} className="header-status-dot" style={{ animation: 'pulse-glow 1.5s infinite', color: 'var(--color-primary)' }} />
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Cargando ficha comercial de la base de datos...</p>
        </div>
      </div>
    );
  }

  // Parse schedules & social networks
  const rrss = parseJsonbField(lead.rrss);
  const horarios = parseJsonbField(lead.horario);
  const hasCoordinates = lead.lat && lead.lon;

  // Parse Google Maps additional research fields
  const webSearchLinks = parseStringArray(lead.web_search);
  const peopleAlsoSearchObj = parseJsonbField(lead.peoplealsosearch);
  const relatedSearches = peopleAlsoSearchObj && Array.isArray(peopleAlsoSearchObj.resultados)
    ? peopleAlsoSearchObj.resultados
    : [];

  // Check if Ficha de Prospección has a Drive / external link
  const getDriveUrl = () => {
    if (!form.ficha_prospeccion) return null;
    const trimmed = form.ficha_prospeccion.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    // Match URL inside text
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = trimmed.match(urlRegex);
    if (match && match.length > 0) {
      return match[0];
    }
    return null;
  };
  const driveUrl = getDriveUrl();

  // Extract quick action endpoints
  const emails = parseStringArray(form.correo);
  const firstEmail = emails.length > 0 ? emails[0] : '';

  const phonesList = parseStringArray(form.telefono);
  const firstPhone = phonesList.length > 0 ? phonesList[0] : '';
  const cleanPhone = firstPhone ? firstPhone.replace(/[^\d+]/g, '') : '';

  const waList = parseStringArray(form.whatsapp);
  const firstWa = waList.length > 0 ? waList[0] : '';
  const cleanWa = firstWa ? firstWa.replace(/[^\d+]/g, '') : '';

  // Generate generic, brief conversation-opening message for WhatsApp
  const getWhatsAppMessage = () => {
    const trimmedName = form.contacto_nombre ? form.contacto_nombre.trim() : '';
    const firstName = trimmedName ? trimmedName.split(/\s+/)[0] : '';
    const greeting = firstName ? `Hola ${firstName}, espero que te encuentres muy bien.` : 'Hola, espero que te encuentres muy bien.';
    
    const businessName = form.nombre ? form.nombre.trim() : '';
    const city = form.ciudad ? form.ciudad.trim() : '';
    const giro = lead.giro_nombre || form.estilo || '';
    
    let context = '';
    if (businessName) {
      context = ` en relación a ${businessName}`;
      if (city && giro) {
        context += ` (del giro ${giro.toLowerCase()} en ${city})`;
      } else if (city) {
        context += ` en ${city}`;
      } else if (giro) {
        context += ` (giro ${giro.toLowerCase()})`;
      }
    }
    
    const message = `${greeting} Te contacto${context} para hacerte una consulta muy breve. ¿Es este el medio adecuado para platicar? Saludos.`;
    return encodeURIComponent(message);
  };

  // Google Maps embed resolver using place_url (extracts query parameter to bypass X-Frame blocking)
  const getEmbedMapUrl = () => {
    if (lead.place_url) {
      try {
        const urlObj = new URL(lead.place_url);
        const queryVal = urlObj.searchParams.get('query');
        if (queryVal) {
          return `https://maps.google.com/maps?q=${encodeURIComponent(queryVal)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
        }
      } catch (e) {
        // Fallback below
      }
    }
    if (lead.nombre) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(lead.nombre)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    }
    if (lead.lat && lead.lon) {
      return `https://maps.google.com/maps?q=${lead.lat},${lead.lon}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    }
    return '';
  };

  const mapEmbedUrl = getEmbedMapUrl();

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <h2 className="drawer-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span>{form.nombre || 'Detalle del Prospecto'}</span>
              {lead.negocios_gmaps_id && (() => {
                const totalScoreNum = parseFloat(lead.total_score);
                const reviewsCountNum = parseInt(lead.reviews_count);
                const hasReviews = !isNaN(totalScoreNum) && totalScoreNum > 0 && !isNaN(reviewsCountNum) && reviewsCountNum > 0;
                
                if (hasReviews) {
                  return (
                    <span 
                      title={`Calificación GMaps: ${lead.total_score} estrellas de ${lead.reviews_count} reseñas`}
                      style={{ 
                        fontSize: '13.5px', 
                        color: '#eab308', 
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        backgroundColor: 'rgba(234, 179, 8, 0.07)',
                        padding: '2px 8px',
                        borderRadius: '20px',
                        border: '1px solid rgba(234, 179, 8, 0.25)',
                        lineHeight: '1.2'
                      }}
                    >
                      ★ {lead.total_score} ({lead.reviews_count})
                    </span>
                  );
                } else {
                  return (
                    <span 
                      title="Sin reseñas en Google Maps"
                      style={{ 
                        fontSize: '13.5px', 
                        color: 'var(--text-muted, #94a3b8)', 
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        backgroundColor: 'rgba(148, 163, 184, 0.08)',
                        padding: '2px 8px',
                        borderRadius: '20px',
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                        lineHeight: '1.2'
                      }}
                    >
                      ★ 0 (0)
                    </span>
                  );
                }
              })()}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="card-tag-style">{lead.giro_nombre || form.estilo || 'Sin Categoría'}</span>
              {lead.negocios_gmaps_id && (
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 500 }} title={`ID Maps: ${lead.negocios_gmaps_id}`}>
                  GMaps ID: <strong style={{ color: 'var(--color-primary)' }}>{lead.negocios_gmaps_id}</strong>
                </span>
              )}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          {/* AI Metrics quick summary bar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            backgroundColor: 'rgba(6, 182, 212, 0.05)', 
            padding: '16px', 
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(6, 182, 212, 0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={20} style={{ color: 'var(--color-ai)' }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Evaluación Temikia</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Puntuación dinámica del lead</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-ai)' }}>{lead.lead_score}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/100</span>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleRecalculateScore}
                style={{ padding: '4px 10px', fontSize: '11px' }}
              >
                Recalcular Score
              </button>
            </div>
          </div>

          {/* 1. INFORMACIÓN GENERAL */}
          <div className="drawer-section">
            <span className="drawer-section-title">Información de Ventas</span>
            
            <div className="properties-grid">
              <div className="property-item">
                <label className="property-label">Estatus del Pipeline</label>
                <select name="estatus" value={form.estatus} onChange={handleChange} className="property-input">
                  <option value="nuevo">Nuevo Lead</option>
                  <option value="proceso_contacto">En Proceso de Contacto</option>
                  <option value="contactado">Contactado</option>
                  <option value="calificado">Calificado</option>
                  <option value="propuesta">Propuesta</option>
                  <option value="ganado">Ganado</option>
                  <option value="perdido">Perdido</option>
                  <option value="descalificado">Descalificado / Sin Perfil</option>
                  <option value="datos_invalidos">Datos Inválidos / Inalcanzable</option>
                  <option value="cerrado_inexistente">Cerrado / Inexistente</option>
                </select>
              </div>

              <div className="property-item">
                <label className="property-label">Prioridad Comercial</label>
                <select name="prioridad" value={form.prioridad} onChange={handleChange} className="property-input">
                  <option value="alta">Alta prioridad</option>
                  <option value="media">Media prioridad</option>
                  <option value="baja">Baja prioridad</option>
                </select>
              </div>

              <div className="property-item">
                <label className="property-label">Giro de Negocio</label>
                <select name="giro_id" value={form.giro_id} onChange={handleChange} className="property-input">
                  <option value="">Seleccione un Giro...</option>
                  {girosList.map(g => (
                    <option key={g.id} value={g.id}>{g.giro}</option>
                  ))}
                </select>
              </div>

              <div className="property-item">
                <label className="property-label">Ejecutivo Asignado</label>
                <select 
                  name="miembro_id" 
                  value={form.miembro_id} 
                  onChange={handleChange} 
                  className="property-input"
                >
                  <option value="">Seleccione un Ejecutivo...</option>
                  {miembros.map(m => (
                    <option key={m.miembro_id} value={m.miembro_id}>{m.nombre_completo}</option>
                  ))}
                </select>
              </div>

              <div className="property-item">
                <label className="property-label">Canal Preferido</label>
                <select name="canal_preferido" value={form.canal_preferido} onChange={handleChange} className="property-input">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="correo">Correo Electrónico</option>
                  <option value="telefono">Llamada Telefónica</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. DATOS DE CONTACTO */}
          <div className="drawer-section">
            <span className="drawer-section-title">Datos de Contacto</span>
            
            <div className="properties-grid">
              <div className="property-item">
                <label className="property-label">Nombre del Contacto</label>
                <input type="text" name="contacto_nombre" value={form.contacto_nombre} onChange={handleChange} className="property-input" />
              </div>

              <div className="property-item">
                <label className="property-label">Puesto del Contacto</label>
                <input type="text" name="contacto_puesto" value={form.contacto_puesto} onChange={handleChange} className="property-input" />
              </div>
            </div>

            <div className="property-item" style={{ marginTop: '8px' }}>
              <label className="property-label">Correos Electrónicos (Separados por coma)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" name="correo" value={form.correo} onChange={handleChange} className="property-input" style={{ flex: 1 }} />
                {firstEmail && (
                  <a 
                    href={`mailto:${firstEmail}`} 
                    className="btn btn-secondary" 
                    style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                    title="Mandar Correo"
                  >
                    <Mail size={16} style={{ color: 'var(--color-ai)' }} />
                  </a>
                )}
              </div>
            </div>

            <div className="properties-grid" style={{ marginTop: '8px' }}>
              <div className="property-item">
                <label className="property-label">Teléfonos (Separados por coma)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" name="telefono" value={form.telefono} onChange={handleChange} className="property-input" style={{ flex: 1 }} />
                  {cleanPhone && (
                    <a 
                      href={`tel:${cleanPhone}`} 
                      className="btn btn-secondary" 
                      style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                      title="Llamar Teléfono"
                    >
                      <Phone size={16} style={{ color: 'var(--color-primary)' }} />
                    </a>
                  )}
                </div>
              </div>

              <div className="property-item">
                <label className="property-label">WhatsApp (Separados por coma)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" name="whatsapp" value={form.whatsapp} onChange={handleChange} className="property-input" style={{ flex: 1 }} />
                  {cleanWa ? (
                    <a 
                      href={`https://wa.me/${cleanWa}?text=${getWhatsAppMessage()}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-secondary" 
                      style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                      title="Abrir Chat WhatsApp"
                    >
                      <MessageSquare size={16} style={{ color: 'var(--color-success)' }} />
                    </a>
                  ) : cleanPhone ? (
                    <a 
                      href={`https://wa.me/${cleanPhone}?text=${getWhatsAppMessage()}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-secondary" 
                      style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                      title="Abrir Chat WhatsApp (Teléfono)"
                    >
                      <MessageSquare size={16} style={{ color: 'var(--color-success)' }} />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="property-item" style={{ marginTop: '8px' }}>
              <label className="property-label">Sitio Web</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" name="sitio_web" value={form.sitio_web} onChange={handleChange} className="property-input" style={{ flex: 1 }} />
                {form.sitio_web && (
                  <a href={form.sitio_web.startsWith('http') ? form.sitio_web : `http://${form.sitio_web}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '8px' }}>
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* 3. DIRECCIÓN Y MAPA */}
          <div className="drawer-section">
            <span className="drawer-section-title">Ubicación Geográfica</span>

            <div className="property-item">
              <label className="property-label">Dirección 1</label>
              <input type="text" name="direccion1" value={form.direccion1} onChange={handleChange} className="property-input" />
            </div>

            <div className="properties-grid" style={{ marginTop: '8px' }}>
              <div className="property-item">
                <label className="property-label">Ciudad</label>
                <input type="text" name="ciudad" value={form.ciudad} onChange={handleChange} className="property-input" />
              </div>

              <div className="property-item">
                <label className="property-label">Estado</label>
                <input type="text" name="estado" value={form.estado} onChange={handleChange} className="property-input" />
              </div>

              <div className="property-item">
                <label className="property-label">País</label>
                <input type="text" name="pais" value={form.pais} onChange={handleChange} className="property-input" />
              </div>


            </div>

            {/* Google Maps zero-key iframe embed (supports place_url resolving) */}
            {mapEmbedUrl && (
              <div style={{ marginTop: '12px' }}>
                <label className="property-label" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Compass size={13} style={{ color: 'var(--color-primary)' }} />
                    <span>Ubicación Satelital Google Maps</span>
                  </span>
                  {lead.place_url && (
                    <a 
                      href={lead.place_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ fontSize: '11px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
                      title="Abrir Google Maps en pestaña nueva"
                    >
                      <span>Abrir Google Maps</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </label>
                <div className="map-iframe-container">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    scrolling="no" 
                    marginHeight="0" 
                    marginWidth="0" 
                    src={mapEmbedUrl}
                  ></iframe>
                </div>
              </div>
            )}
          </div>

          {/* 4. REDES SOCIALES */}
          {Object.keys(rrss).length > 0 && (
            <div className="drawer-section">
              <span className="drawer-section-title">Canales Sociales Encontrados</span>
              <div className="social-links-row">
                {Object.keys(rrss).map(platform => {
                  const url = rrss[platform];
                  if (!url || url.trim() === '') return null;
                  return (
                    <a 
                      key={platform} 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="social-chip"
                    >
                      <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{platform}</span>
                      <ExternalLink size={12} />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* BÚSQUEDAS WEB / ENLACES DE INTERÉS */}
          {webSearchLinks && webSearchLinks.length > 0 && (
            <div className="drawer-section">
              <span className="drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Compass size={13} style={{ color: 'var(--color-primary)' }} />
                <span>Búsquedas Web de Interés</span>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {webSearchLinks.map((url, idx) => {
                  if (!url || url.trim() === '') return null;
                  let domain = url;
                  try {
                    domain = new URL(url).hostname;
                  } catch (e) {}
                  return (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-chip"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: 'var(--bg-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        textDecoration: 'none',
                        color: 'var(--text-main)',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)';
                        e.currentTarget.style.backgroundColor = 'rgba(6, 182, 212, 0.04)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.backgroundColor = 'var(--bg-main)';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', textAlign: 'left' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>
                          {domain}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {url}
                        </span>
                      </div>
                      <ExternalLink size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: '8px' }} />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* OTROS USUARIOS TAMBIÉN BUSCARON */}
          {relatedSearches && relatedSearches.length > 0 && (
            <div className="drawer-section">
              <span className="drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} style={{ color: 'var(--color-ai)' }} />
                <span>Otros usuarios también buscaron</span>
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {relatedSearches.map((item, idx) => (
                  <div 
                    key={idx}
                    style={{
                      backgroundColor: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.3)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.05)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.title}>
                      {item.title}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {item.category || 'Búsqueda relacionada'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '11.5px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#eab308', fontWeight: 700 }}>
                        ★ {item.totalScore || item.total_score || 'N/A'}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        ({item.reviewsCount || item.reviews_count || 0} reseñas)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. HORARIOS DE ATENCIÓN */}
          {horarios && horarios.list && horarios.list.length > 0 && (
            <div className="drawer-section">
              <span className="drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} />
                <span>Horarios de Operación</span>
              </span>
              <div style={{ 
                backgroundColor: 'var(--bg-main)', 
                borderRadius: 'var(--radius-md)', 
                padding: '12px',
                border: '1px solid var(--border-color)',
                fontSize: '12.5px' 
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  <span>Día</span>
                  <span>Horas de Atención</span>
                </div>
                {horarios.list.map((h, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '3px 0', borderBottom: i < horarios.list.length - 1 ? '1px dashed rgba(100, 116, 139, 0.1)' : 'none' }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{h.day}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{h.hours}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. GESTIÓN Y NOTAS INTERNAS */}
          <div className="drawer-section">
            <span className="drawer-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={13} />
              <span>Bitácora de Notas Comerciales</span>
            </span>
            <textarea 
              name="notas" 
              value={form.notas} 
              onChange={handleChange} 
              className="notes-textarea"
              placeholder="Escriba aquí los comentarios del vendedor, compromisos acordados, llamadas realizadas y seguimiento..."
            ></textarea>
          </div>

          {/* 7. FICHA DE PROSPECCIÓN IA */}
          <div className="drawer-section" style={{ 
            border: '1px solid rgba(6, 182, 212, 0.2)', 
            borderRadius: 'var(--radius-md)', 
            padding: '16px',
            backgroundColor: 'rgba(6, 182, 212, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} style={{ color: 'var(--color-ai)' }} />
                <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>Ficha de Prospección IA</h4>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                {driveUrl && (
                  <a 
                    href={driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ 
                      padding: '6px 12px', 
                      fontSize: '11px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      textDecoration: 'none',
                      backgroundColor: 'rgba(37, 99, 235, 0.08)',
                      borderColor: 'rgba(37, 99, 235, 0.25)',
                      color: 'var(--color-primary)'
                    }}
                  >
                    <ExternalLink size={12} />
                    <span>Abrir Enlace / Drive</span>
                  </a>
                )}
                
                <button 
                  type="button" 
                  className="btn btn-ai"
                  onClick={handleGenerateStrategy}
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                >
                  Generar Propuesta IA
                </button>
              </div>
            </div>
            
            <textarea 
              name="ficha_prospeccion" 
              value={form.ficha_prospeccion} 
              onChange={handleChange} 
              className="notes-textarea"
              style={{ fontFamily: 'monospace', fontSize: '11.5px', minHeight: '180px', borderColor: 'rgba(6, 182, 212, 0.2)' }}
              placeholder="Esta ficha detalla la estrategia de abordaje de ventas del Agente IA. De clic en 'Generar Propuesta IA' para redactar un pitch elevator y tecnologías B2B recomendadas..."
            ></textarea>
          </div>

          {/* 8. PROPUESTA DE VALOR SUGERIDA (TEMIKIA PRODUCTS) */}
          <div className="drawer-section" style={{
            border: '1px solid rgba(6, 182, 212, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            backgroundColor: 'rgba(6, 182, 212, 0.03)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
              <Sparkles size={16} style={{ color: 'var(--color-ai)' }} />
              <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                Auditoría Comercial Temikia (Propuesta de Valor)
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {getSuggestedProducts(lead, form).map((p, idx) => (
                <div key={idx} style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card, #FFFFFF)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.2s ease'
                }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--color-primary, #06b6d4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {p.category}
                  </span>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                    {p.feature}
                  </span>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0, marginTop: '4px' }}>
                    {p.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>Creado en: {formatDate(lead.created_at)}</span>
            <span>Última modificación: {formatDate(lead.updated_at)}</span>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="drawer-footer" style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr auto 1fr', 
          alignItems: 'center', 
          width: '100%',
          gap: '12px'
        }}>
          <button 
            type="button"
            className="btn btn-danger" 
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting || isSaving}
            style={{ 
              justifySelf: 'start', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              width: '42px',
              height: '42px',
              minWidth: 'auto',
              backgroundColor: '#EF4444',
              borderColor: '#EF4444',
              color: '#FFFFFF'
            }}
            title="Eliminar Prospecto"
          >
            <Trash2 size={16} />
            {/* <span>Borrar</span> */}
          </button>

          <button 
            type="button"
            className="btn btn-secondary" 
            onClick={handlePrintFicha}
            disabled={isSaving || isDeleting}
            style={{ 
              justifySelf: 'center',
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              backgroundColor: 'rgba(6, 182, 212, 0.08)',
              borderColor: 'rgba(6, 182, 212, 0.25)',
              color: 'var(--color-primary)'
            }}
          >
            <Printer size={16} />
            <span>Imprimir</span>
          </button>

          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={isSaving || isDeleting}
            style={{ 
              justifySelf: 'end',
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              transition: 'all 0.3s ease',
              ...(saveStatus === 'success' ? {
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                borderColor: '#10B981',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              } : saveStatus === 'error' ? {
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                borderColor: '#EF4444',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
              } : {})
            }}
          >
            {isSaving ? (
              <>
                <RefreshCw className="animate-spin" size={16} />
                <span>Guardando...</span>
              </>
            ) : saveStatus === 'success' ? (
              <>
                <Check size={16} />
                <span>¡Actualizado!</span>
              </>
            ) : saveStatus === 'error' ? (
              <>
                <X size={16} />
                <span>Error al guardar</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Guardar</span>
              </>
            )}
          </button>
        </div>
      </div>
      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN PRÉMIUM */}
      {showDeleteConfirm && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            style={{
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: 'var(--radius-lg, 12px)',
              padding: '28px',
              width: '400px',
              maxWidth: '90vw',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning Icon Badge */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444'
            }}>
              <Trash2 size={24} />
            </div>

            {/* Text description */}
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main, #0f172a)', marginBottom: '8px' }}>
                ¿Eliminar Prospecto?
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', lineHeight: '1.5', textAlign: 'center' }}>
                ¿Está completamente seguro de eliminar el prospecto <strong>{form.nombre}</strong>? Esta acción es definitiva y se borrará permanentemente de la base de datos.
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', width: '100%', gap: '10px', marginTop: '8px' }}>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, padding: '10px', fontSize: '13px' }}
              >
                No, Cancelar
              </button>
              <button 
                type="button"
                className="btn btn-danger" 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  handleDelete();
                }}
                disabled={isDeleting}
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  fontSize: '13px', 
                  backgroundColor: '#EF4444', 
                  borderColor: '#EF4444', 
                  color: '#FFFFFF' 
                }}
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDetails;
