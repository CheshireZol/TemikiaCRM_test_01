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
  Printer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  parseStringArray, 
  parseJsonbField, 
  formatDate,
  calculateAILeadScore,
  generateAISalesStrategy,
  getSuggestedProducts,
  parseSocialLinks
} from '../utils.js';

// Dictionary of WhatsApp Templates organized by business category/giro
const WHATSAPP_TEMPLATES = {
  "Otros": [
     "Hola [nombre_contacto]. Te saluda [nombre_ejecutivo] de Temikia. Hablando con directores operativos, me comentan que un gran reto es la velocidad de respuesta con los prospectos: si tardan más de 5 minutos en contestar un mensaje en [canal_o_red_social], la probabilidad de cierre cae un 80% porque el cliente ya le escribió a la competencia. En Temikia eliminamos esa ventana de abandono con respuestas e integraciones inmediatas operadas por IA. Ignoro si en [nombre_negocio] tengan medida su velocidad de respuesta o si el verdadero cuello de botella comercial esté en otra área. ¿Hará sentido revisar un ejemplo rápido?",
     "Buen día [nombre_contacto]. Soy [nombre_ejecutivo] de Temikia. Muchas empresas medianas nos confiesan que sus equipos de atención al cliente consumen más del 60% de su jornada respondiendo consultas de soporte sumamente repetitivas (estatus de pedidos, horarios, coberturas, políticas de devolución), descuidando casos complejos o de retención de valor. Delegamos estas FAQ a agentes inteligentes conversacionales integrados a tus bases de datos. Desconozco si en [nombre_negocio] la carga de soporte esté saturando a tu personal o si el problema de retención responda a otro factor. ¿Te interesaría evaluar un demo sin compromiso?"
  ]
};

// Map lead's business category (giro_nombre / estilo) to the standard templates categories
const getGiroCategory = (giroName, estiloName) => {
  return "Otros";
};

// Resolve the business IANA timezone using country and lat/lon coordinates
const getBusinessTimezone = (lat, lon, country) => {
  const c = (country || '').trim().toLowerCase();
  
  if (c === 'argentina') return 'America/Argentina/Buenos_Aires';
  if (c === 'chile') return 'America/Santiago';
  if (c === 'ecuador') return 'America/Guayaquil';
  if (c === 'venezuela') return 'America/Caracas';
  if (c === 'españa' || c === 'espana' || c === 'spain') return 'Europe/Madrid';
  if (c === 'italia' || c === 'italy') return 'Europe/Rome';
  
  // México
  if (c === 'méxico' || c === 'mexico') {
    if (lon) {
      const numLng = parseFloat(lon);
      if (numLng < -110) return 'America/Tijuana';
      if (numLng < -105) return 'America/Hermosillo';
      if (numLng < -100) return 'America/Chihuahua';
      if (numLng > -88) return 'America/Cancun';
    }
    return 'America/Mexico_City';
  }
  
  // Estados Unidos
  if (c === 'estados unidos' || c === 'usa' || c === 'united states') {
    if (lon) {
      const numLng = parseFloat(lon);
      if (numLng < -114) return 'America/Los_Angeles';
      if (numLng < -104) return 'America/Denver';
      if (numLng < -88) return 'America/Chicago';
      return 'America/New_York';
    }
    return 'America/New_York';
  }
  
  // Fallbacks by coordinates if country is missing or empty
  if (lat && lon) {
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lon);
    
    // Continental US
    if (numLng > -125 && numLng < -66 && numLat > 24 && numLat < 49) {
      if (numLng < -114) return 'America/Los_Angeles';
      if (numLng < -104) return 'America/Denver';
      if (numLng < -88) return 'America/Chicago';
      return 'America/New_York';
    }
    // Mexico
    if (numLng > -118 && numLng < -86 && numLat > 14 && numLat < 33) {
      if (numLng < -110) return 'America/Tijuana';
      if (numLng < -105) return 'America/Hermosillo';
      return 'America/Mexico_City';
    }
    // Spain
    if (numLng > -10 && numLng < 5 && numLat > 35 && numLat < 44) return 'Europe/Madrid';
    // Italy
    if (numLng > 6 && numLng < 19 && numLat > 35 && numLat < 48) return 'Europe/Rome';
  }
  
  return 'America/Mexico_City';
};

// Parse a single day's hour range (e.g. "9:30 AM to 10 PM", "Cerrado")
const parseHoursRange = (hoursStr) => {
  const str = (hoursStr || '').trim().toLowerCase();
  if (str === 'cerrado' || str === 'closed' || str === '') return null;
  if (str.includes('24 horas') || str.includes('24 hours') || str.includes('abierto 24')) return { open24h: true };

  // Split by "to" or "-"
  const parts = str.split(/\s+to\s+|\s*-\s*/);
  if (parts.length < 2) return null;

  const startPart = parts[0].trim();
  const endPart = parts[1].trim();

  const isStartPM = startPart.includes('pm');
  const isStartAM = startPart.includes('am');
  const isEndPM = endPart.includes('pm');
  const isEndAM = endPart.includes('am');

  const startClean = startPart.replace(/(am|pm|\s| )/g, '');
  const endClean = endPart.replace(/(am|pm|\s| )/g, '');

  const startMatch = startClean.match(/^(\d+)(?::(\d+))?$/);
  const endMatch = endClean.match(/^(\d+)(?::(\d+))?$/);

  if (!startMatch || !endMatch) return null;

  let startHr = parseInt(startMatch[1], 10);
  let startMin = startMatch[2] ? parseInt(startMatch[2], 10) : 0;
  let endHr = parseInt(endMatch[1], 10);
  let endMin = endMatch[2] ? parseInt(endMatch[2], 10) : 0;

  // Resolve PM/AM for end time
  if (isEndPM && endHr < 12) {
    endHr += 12;
  } else if (isEndAM && endHr === 12) {
    endHr = 0;
  }

  // Resolve PM/AM for start time
  if (isStartPM) {
    if (startHr < 12) startHr += 12;
  } else if (isStartAM) {
    if (startHr === 12) startHr = 0;
  } else {
    // Infer start PM/AM from end time
    if (isEndPM) {
      const endHrRaw = parseInt(endMatch[1], 10);
      if (startHr < 12 && startHr < endHrRaw) {
        if (startHr < 9) {
          startHr += 12;
        }
      }
    }
  }

  return { startHr, startMin, endHr, endMin };
};

// Check if a business is currently open
const checkIsOpen = (hoursStr, currentHour, currentMin) => {
  const range = parseHoursRange(hoursStr);
  if (!range) return false;
  if (range.open24h) return true;

  const { startHr, startMin, endHr, endMin } = range;
  
  const currentTotal = currentHour * 60 + currentMin;
  const startTotal = startHr * 60 + startMin;
  let endTotal = endHr * 60 + endMin;

  if (endTotal < startTotal) {
    // Overnight case, e.g. 7 PM to 2 AM (19:00 to 02:00)
    endTotal += 24 * 60;
    if (currentTotal < startTotal) {
      const currentTotalAdjusted = currentTotal + 24 * 60;
      return currentTotalAdjusted >= startTotal && currentTotalAdjusted <= endTotal;
    }
  }
  
  return currentTotal >= startTotal && currentTotal <= endTotal;
};

const LeadDetails = ({ leadId, user, onClose, onSaveSuccess }) => {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [girosList, setGirosList] = useState([]); // Giros Lookup state
  const [miembros, setMiembros] = useState([]); // Team Members list
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'success' | 'error'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // State for custom delete confirmation modal
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [hasWebsiteError, setHasWebsiteError] = useState(false);
  const [dynamicTemplate0, setDynamicTemplate0] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

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
    canal_preferido: 'whatsapp',
    asistente_ia_activo: false
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


// -------------------------------------------------


// Helper para determinar la hora local del negocio según su zona horaria
const getLocalHour = () => {
  try {
    const tz = user?.zonaHoraria || 'America/Mexico_City';
    const formatter = new Intl.DateTimeFormat('es-MX', {
      timeZone: tz,
      hour: 'numeric',
      hour12: false
    });
    return parseInt(formatter.format(new Date()), 10);
  } catch (e) {
    return new Date().getHours();
  }
};

// Generador optimizado de mensajes dinámicos
const regenerateGreetingMessage = () => {
  const contactName = form.contacto_nombre ? form.contacto_nombre.trim() : '';
  const executiveName = user?.nombreCompleto || user?.nombre_completo || user?.nombre_corto || user?.nombre || 'asesor de Temikia';
  const businessName = form.nombre ? form.nombre.trim() : 'su negocio';

  const hour = getLocalHour();
  
  // 1. Definición del saludo temporal estricto
  let timeGreeting = 'Buenos días';
  if (hour >= 12 && hour < 19) {
    timeGreeting = 'Buenas tardes';
  } else if (hour >= 19 || hour < 5) {
    timeGreeting = 'Buenas noches';
  }

  // 2. Bloques de construcción (Pools ampliados y sin riesgo de redundancia cruzada)
  
  // Saludos iniciales independientes del tiempo o dependientes controlados
  const openings = contactName ? [
    `¡Hola, ${contactName}!`,
    `${timeGreeting}, ${contactName}.`,
    `¿Qué tal, ${contactName}?`,
    `Espero que se encuentre muy bien, ${contactName}.`,
    `Un gusto saludarle, ${contactName}.`
  ] : [
    `¡Hola!`,
    `${timeGreeting}.`,
    `¿Qué tal?`,
    `Espero que se encuentren muy bien.`,
    `Un gusto saludarles.`
  ];

  // Variaciones de presentación del ejecutivo (15 opciones)
  const presentations = [
    `Mi nombre es ${executiveName} de Temikia Agency.`,
    `Me llamo ${executiveName} de Temikia.`,
    `Soy ${executiveName}, parte del equipo de Temikia.`,
    `Le escribe ${executiveName} de Temikia Agency.`,
    `Habla ${executiveName} de Temikia.`,
    `Mi nombre es ${executiveName} y represento a Temikia.`,
    `Le saludo de parte de Temikia, soy ${executiveName}.`,
    `Soy ${executiveName}, asesor en Temikia Agency.`,
    `Me presento, soy ${executiveName} del equipo de Temikia.`,
    `Le contacta ${executiveName}, en representación de Temikia.`,
    `Mi nombre es ${executiveName}, me comunico desde Temikia.`,
    `Soy ${executiveName}, especialista en Temikia Agency.`,
    `Le escribe ${executiveName}, miembro de Temikia.`,
    `Me llamo ${executiveName} y le contacto desde Temikia.`,
    `Mi nombre es ${executiveName}, consultor de Temikia.`
  ];

  // Frases de contacto B2B (15 opciones corregidas y balanceadas)
  // Nota: Contiene una mezcla de preguntas de apertura y afirmaciones directas.
  const businessSentences = [
    `¿Me comunico con el equipo de ${businessName}?`,
    `¿Tengo el agrado de comunicarme con el equipo de ${businessName}?`,
    `Es un placer contactar a la administración de ${businessName}.`,
    `¿Escribo directamente a los encargados de ${businessName}?`,
    `¿Me dirijo al equipo principal de ${businessName}?`,
    `Tengo el interés de conversar con el equipo de ${businessName}.`,
    `Me acerco a ustedes para saludar al equipo de ${businessName}.`,
    `Busco ponerme en contacto con la gerencia de ${businessName}.`,
    `¿Es este el contacto principal de ${businessName}?`,
    `Tengo el gusto de dirigirme a los representantes de ${businessName}.`,
    `Me interesa establecer comunicación con el equipo de ${businessName}.`,
    `¿Hablo directamente con el equipo de ${businessName}?`,
    `Mi intención es comunicarme con los encargados de ${businessName}.`,
    `Es un gusto acercarme a la gente de ${businessName}.`,
    `¿Tengo el gusto de saludar a la administración de ${businessName}?`
  ];
  // 3. Estructuras sintácticas alternativas (Rompe la rigidez de orden)
  // Esto multiplica las combinaciones base y cambia cómo abre el mensaje.
  const structures = [
    // Estructura A: Saludo + Presentación + Conector B2B
    () => {
      const op = openings[Math.floor(Math.random() * openings.length)];
      const pr = presentations[Math.floor(Math.random() * presentations.length)];
      let bz = businessSentences[Math.floor(Math.random() * businessSentences.length)];
      
      // Control de cacofonía manual si coinciden términos
      if (op.includes("gusto") && bz.includes("placer")) {
        bz = `¿Me pongo en contacto con el equipo de ${businessName}?`;
      }
      return `${op} ${pr} ${bz}`;
    },
    // Estructura B: Presentación (con saludo integrado) + Conector B2B
    () => {
      const pr = presentations[Math.floor(Math.random() * presentations.length)];
      const bz = businessSentences[Math.floor(Math.random() * businessSentences.length)];
      return `${timeGreeting}. ${pr} ${bz}`;
    },
    // Estructura C: Conector B2B inverso + Presentación
    () => {
      const op = openings[Math.floor(Math.random() * openings.length)];
      const pr = presentations[Math.floor(Math.random() * presentations.length)];
      return `${op} ¿Le escribo al equipo de ${businessName}?, mi nombre es ${executiveName} de Temikia.`;
    }
  ];

  // Selección aleatoria de la estructura gramatical
  const selectedStructure = structures[Math.floor(Math.random() * structures.length)];
  const finalMessage = selectedStructure();

  setDynamicTemplate0(finalMessage);
};

// --------------------------------------------------------------



  // Helper to randomly pick a template from all available ones with a 50/50 balance
  const handleRegenerateTemplate = () => {
    setIsRegenerating(true);
    setTimeout(() => setIsRegenerating(false), 500);

    const templates = getTemplatesList();
    if (templates.length <= 1) {
      regenerateGreetingMessage();
      setSelectedTemplateIndex(0);
      return;
    }
    
    // 50/50 chance to select dynamic greeting vs a static template
    const chooseDynamic = Math.random() < 0.5;
    
    let newIndex = 0;
    if (chooseDynamic) {
      newIndex = 0;
      regenerateGreetingMessage();
    } else {
      // Pick a random static template (indices 1 to templates.length - 1)
      const staticCount = templates.length - 1;
      let randStaticOffset = Math.floor(Math.random() * staticCount);
      newIndex = 1 + randStaticOffset;
      
      // Try to avoid picking the exact same static template index if we were already on a static one
      if (selectedTemplateIndex > 0 && templates.length > 2) {
        let attempts = 0;
        while (newIndex === selectedTemplateIndex && attempts < 10) {
          randStaticOffset = Math.floor(Math.random() * staticCount);
          newIndex = 1 + randStaticOffset;
          attempts++;
        }
      }
    }
    
    setSelectedTemplateIndex(newIndex);
  };

  // Update Template #0 dynamically when the lead is changed or edited
  useEffect(() => {
    if (lead?.id) {
      regenerateGreetingMessage();
    }
  }, [lead?.id, form.contacto_nombre, form.nombre, user]);

  const getTemplatesList = () => {
    const giroCategory = getGiroCategory(lead?.giro_nombre, form.estilo);
    const baseTemplates = WHATSAPP_TEMPLATES[giroCategory] || WHATSAPP_TEMPLATES["Otros"];
    return ["[plantilla_0]", ...baseTemplates];
  };

  // Fetch full details of the selected lead
  useEffect(() => {
    const fetchLeadDetail = async () => {
      if (!leadId) return;
      setSelectedTemplateIndex(0); // Reset template selection for new lead
      try {
        setLoading(true);
        const res = await fetch(`/api/prospectos/${leadId}`);
        if (!res.ok) throw new Error('Error al cargar detalle');
        const data = await res.json();
        
        setLead(data);
        
        const rawWeb = data.sitio_web || '';
        const hasWebErr = rawWeb.toLowerCase().includes('(error)');
        const cleanWeb = rawWeb.replace(/^\(error\)\s*/i, '');
        setHasWebsiteError(hasWebErr);
        
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
          sitio_web: cleanWeb,
          correo: parseStringArray(data.correo).join(', '),
          telefono: parseStringArray(data.telefono).join(', '),
          whatsapp: parseStringArray(data.whatsapp).join(', '),
          direccion1: data.direccion1 || '',
          ciudad: data.ciudad || '',
          estado: data.estado || '',
          pais: data.pais || '',
          notas: data.notas || '',
          ficha_prospeccion: data.ficha_prospeccion || '',
          canal_preferido: data.canal_preferido || 'whatsapp',
          asistente_ia_activo: data.asistente_ia_activo === true
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
      .map(key => {
        const links = parseSocialLinks(parsedRrss[key]);
        if (links.length === 0) return '';
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        return links.map(url => {
          return `• <a href="${url}" target="_blank" style="color:#0891b2; text-decoration:underline; word-break:break-all;"><strong>${label}</strong>: ${url}</a>`;
        }).join('<br/>');
      })
      .filter(Boolean)
      .join('<br/>') || 'Ninguna identificada';

    // Format Web Search references
    const webSearchList = parseStringArray(lead.web_search);
    const webSearchHtml = webSearchList.length > 0
      ? webSearchList.map(url => {
          try {
            const domain = new URL(url).hostname;
            const truncatedUrl = url.length > 55 ? `${url.substring(0, 52)}...` : url;
            return `• <a href="${url}" target="_blank" style="color:#0891b2; text-decoration:underline;">${domain}</a><span style="color:#94a3b8;"> (${truncatedUrl})</span>`;
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
      ? relatedResults.map(item => `• <strong>${item.title}</strong> - ${item.category || 'Similar'} <span style="color:#d97706; font-weight:700;">★ ${item.totalScore || item.total_score || '0'}</span> (${item.reviewsCount || item.reviews_count || 0} reseñas)`).join('<br/>')
      : 'Ninguno catalogado en el sector';

    // Self-contained Premium Canva-styled CSS system (No external CSS dependencies or Tailwind required)
    const printCss = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Manrope:wght@400;600;700;800&display=swap');
      
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      html, body {
        margin: 0;
        padding: 0;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        background-color: #f8fafc;
        color: #0f172a;
      }

      body {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      .print-container {
        width: 100%;
        max-width: 1024px;
        margin: 0 auto;
        padding: 20px;
      }

      .sheet {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
        padding: 28px;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      /* Header */
      .header {
        border-bottom: 2px solid #f1f5f9;
        padding-bottom: 14px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
      }

      .eyebrow {
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        font-weight: 800;
        color: #0891b2;
      }

      .title {
        margin: 6px 0 6px;
        font-size: 23px;
        line-height: 1.2;
        font-weight: 800;
        font-family: 'Manrope', 'Inter', sans-serif;
        color: #0f172a;
      }

      .meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        font-size: 11.5px;
        color: #64748b;
      }

      .meta-row strong {
        color: #334155;
        text-transform: uppercase;
      }

      .meta-row .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 10.5px;
      }

      .meta-row .rating {
        color: #eab308;
        font-weight: 600;
      }

      .brand {
        text-align: right;
      }

      .brand-name {
        font-size: 19px;
        font-weight: 900;
        color: #0f172a;
        letter-spacing: -0.025em;
      }

      .brand-date {
        margin-top: 3px;
        font-size: 9.5px;
        font-weight: 500;
        color: #94a3b8;
      }

      /* KPIs */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: #f8fafc;
        padding: 14px;
      }

      .kpi {
        text-align: center;
        border-right: 1px solid #e2e8f0;
      }

      .kpi:last-child {
        border-right: none;
      }

      .kpi-label {
        display: block;
        font-size: 8.5px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 700;
        color: #64748b;
      }

      .kpi-value-container {
        margin-top: 5px;
      }

      .kpi-value {
        font-size: 20px;
        font-weight: 800;
        color: #0f172a;
      }

      .kpi-value-max {
        font-size: 11px;
        color: #94a3b8;
        font-weight: 700;
      }

      .badge {
        display: inline-block;
        margin-top: 3px;
        padding: 3px 9px;
        border-radius: 6px;
        font-size: 9.5px;
        font-weight: 700;
        text-transform: uppercase;
        border: 1px solid #bfdbfe;
        color: #1d4ed8;
        background: #dbeafe;
      }

      .badge-gray {
        border: 1px solid #cbd5e1;
        color: #475569;
        background: #f1f5f9;
      }

      /* Layout */
      .columns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
      }

      .stack {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      /* Card Section */
      .card {
        background: #f8fafc;
        border-top: 4px solid #06b6d4;
        border-radius: 12px;
        box-shadow: 0 4px 10px rgba(15, 23, 42, 0.02);
        padding: 14px;
        border-left: 1px solid #e2e8f0;
        border-right: 1px solid #e2e8f0;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .card-title {
        margin: 0 0 4px;
        padding-bottom: 6px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.10em;
        font-weight: 800;
        color: #0f172a;
      }

      .field-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .field {
        min-width: 0;
      }

      .field-border-top {
        border-top: 1px solid #e2e8f0;
        padding-top: 8px;
        margin-top: 2px;
      }

      .label {
        display: block;
        font-size: 8.5px;
        text-transform: uppercase;
        font-weight: 700;
        color: #64748b;
        margin-bottom: 3px;
      }

      .value {
        display: block;
        font-size: 12px;
        line-height: 1.35;
        font-weight: 600;
        color: #0f172a;
        word-break: break-word;
      }

      .capitalize {
        text-transform: capitalize;
      }

      .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 11px;
      }

      .link {
        color: #0891b2;
        text-decoration: underline;
        word-break: break-all;
      }

      /* Notes / Observaciones */
      .muted-box {
        min-height: 48px;
        padding: 9px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #ffffff;
        font-size: 11px;
        line-height: 1.4;
        color: #334155;
        white-space: pre-wrap;
        font-style: italic;
      }

      .field-grid-4 {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
      }

      .meta-label {
        font-size: 8px;
        text-transform: uppercase;
        font-weight: 700;
        color: #94a3b8;
        margin-bottom: 2px;
        display: block;
      }

      .meta-value {
        font-size: 10px;
        font-weight: 600;
        color: #475569;
        font-family: ui-monospace, monospace;
      }

      /* Suggested Products */
      .products-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .product {
        padding: 10px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        background: #ffffff;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .product-category {
        font-size: 8px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 800;
        color: #0891b2;
      }

      .product-title {
        font-size: 12px;
        font-weight: 800;
        color: #0f172a;
      }

      .product-desc {
        font-size: 9.5px;
        line-height: 1.3;
        color: #475569;
        margin: 0;
      }

      /* Footer */
      .footer {
        margin-top: 6px;
        padding-top: 10px;
        border-top: 1px solid #e2e8f0;
        text-align: center;
        font-size: 9.5px;
        color: #94a3b8;
        font-weight: 500;
      }

      /* Print styles */
      @media print {
        @page {
          size: letter;
          margin: 0.5cm;
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
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
          gap: 14px !important;
        }
        
        .card {
          box-shadow: none !important;
          page-break-inside: avoid;
        }
        
        .kpi-grid {
          background: #f8fafc !important;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }
      }
    `;

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Temikia - Ficha Técnica - ${form.nombre}</title>
  <style>
    ${printCss}
  </style>
</head>
<body>
  <main class="print-container">
    
    <!-- FICHA UNIFICADA (Estilo Canva de 1 página) -->
    <article class="sheet">
      
      <!-- CABECERA -->
      <div class="header">
        <div>
          <span class="eyebrow">FICHA TÉCNICA DE PROSPECCIÓN</span>
          <h1 class="title">${form.nombre}</h1>
          
          <div class="meta-row">
            <strong>${lead.giro_nombre || form.estilo || 'Sin Categoría'}</strong>
            <span>•</span>
            <span class="mono">GMaps ID: ${lead.negocios_gmaps_id || 'No Enlazado'}</span>
            <span>•</span>
            <span class="rating">★ ${lead.total_score ? lead.total_score + ' (' + (lead.reviews_count || 0) + ')' : '0 (0)'}</span>
          </div>
        </div>
        
        <div class="brand">
          <span class="brand-name">Temikia</span>
          <p class="brand-date">Impreso el: <span>${fechaImpresion}</span></p>
        </div>
      </div>

      <!-- KPIS PRINCIPALES -->
      <div class="kpi-grid">
        <div class="kpi">
          <span class="kpi-label">SCORE TEMIKIA</span>
          <div class="kpi-value-container">
            <span class="kpi-value">${lead.lead_score || '0'}</span>
            <span class="kpi-value-max">/100</span>
          </div>
        </div>
        <div class="kpi">
          <span class="kpi-label">ESTATUS PIPELINE</span>
          <div class="kpi-value-container">
            <span class="badge">${(form.estatus || 'nuevo').toUpperCase()}</span>
          </div>
        </div>
        <div class="kpi">
          <span class="kpi-label">PRIORIDAD COMERCIAL</span>
          <div class="kpi-value-container">
            <span class="badge badge-gray">${(form.prioridad || 'baja').toUpperCase()} PRIORIDAD</span>
          </div>
        </div>
      </div>

      <!-- COLUMNA ÚNICA DE DATOS APILADOS -->
      <div class="stack">
        
        <!-- RADIOGRAFÍA -->
        <div class="card">
          <h3 class="card-title">Radiografía Negocio</h3>
          <div class="field-grid-2">
            <div class="field">
              <span class="label">Canal Preferido</span>
              <span class="value capitalize">${form.canal_preferido}</span>
            </div>
            <div class="field">
              <span class="label">Ejecutivo Asignado</span>
              <span class="value">${lead.owner_nombre || 'Sin Asignar'}</span>
            </div>
          </div>
        </div>

        <!-- DATOS CONTACTO -->
        <div class="card">
          <h3 class="card-title">Datos de Contacto</h3>
          <div class="field-grid-2">
            <div class="field">
              <span class="label">Nombre del Contacto</span>
              <span class="value">${form.contacto_nombre || 'No provisto'}</span>
            </div>
            <div class="field">
              <span class="label">Puesto del Contacto</span>
              <span class="value">${form.contacto_puesto || 'No provisto'}</span>
            </div>
          </div>
          
          <div class="field-grid-2 field-border-top">
            <div class="field">
              <span class="label">Correos Electrónicos</span>
              <span class="value mono">${emailsList}</span>
            </div>
            <div class="field">
              <span class="label">Teléfonos / WhatsApp</span>
              <span class="value mono">${phonesList} / ${whatsappList}</span>
            </div>
          </div>
        </div>

        <!-- UBICACIÓN -->
        <div class="card">
          <h3 class="card-title">Ubicación Geográfica</h3>
          <div class="field">
            <span class="label">Dirección Completa</span>
            <span class="value">${form.direccion1 || 'No provista'}</span>
          </div>
          
          <div class="field-grid-2 field-border-top">
            <div class="field">
              <span class="label">Distrito / Colonia</span>
              <span class="value">No provisto</span>
            </div>
            <div class="field">
              <span class="label">Código Postal</span>
              <span class="value mono">No provisto</span>
            </div>
          </div>

          <div class="field-grid-2 field-border-top">
            <div class="field">
              <span class="label">Ciudad / Delegación</span>
              <span class="value">${form.ciudad || 'No provista'}</span>
            </div>
            <div class="field">
              <span class="label">Estado</span>
              <span class="value">${form.estado || 'No provisto'}</span>
            </div>
          </div>

          <div class="field-border-top">
            <span class="label">Enlace Satelital de Google Maps</span>
            <a href="${lead.place_url || '#'}" target="_blank" class="link mono" style="font-size: 10px; line-height: 1.2;">
              ${lead.place_url || 'No provisto'}
            </a>
          </div>
        </div>

        <!-- PRESENCIA DIGITAL -->
        <div class="card">
          <h3 class="card-title">Presencia Digital y Redes</h3>
          <div class="field-grid-2">
            <div class="field">
              <span class="label">Sitio Web Oficial ${hasWebsiteError ? '<span style="color:#ef4444; font-size:8px; font-weight:800; margin-left:4px;">(ERROR)</span>' : ''}</span>
              <span class="value mono">${form.sitio_web || 'No provisto'}</span>
            </div>
            <div class="field">
              <span class="label">Redes Sociales</span>
              <div class="value" style="font-size: 11px; line-height: 1.35;">${socialNetworksHtml}</div>
            </div>
          </div>

          <div class="field-grid-2 field-border-top">
            <div class="field">
              <span class="label">Enlaces Búsqueda (Web Search)</span>
              <div class="value mono" style="font-size: 10.5px; line-height: 1.3;">${webSearchHtml}</div>
            </div>
            <div class="field">
              <span class="label">Competencia y Similares</span>
              <div class="value" style="font-size: 11px; line-height: 1.3;">${similaresHtml}</div>
            </div>
          </div>
        </div>

      </div>

      <!-- OBSERVACIONES -->
      <div class="card">
        <h3 class="card-title">Ficha de Prospección e Internos</h3>
        
        <div>
          <span class="label">Notas / Observaciones del Lead</span>
          <div class="muted-box">${form.notas || 'Sin anotaciones preliminares.'}</div>
        </div>

        <div class="field-grid-4 field-border-top">
          <div>
            <span class="meta-label">Fecha de Creación</span>
            <span class="meta-value">${fechaCreacion}</span>
          </div>
          <div>
            <span class="meta-label">Última Actualización</span>
            <span class="meta-value">${fechaActualizacion}</span>
          </div>
          <div>
            <span class="meta-label">Próximo Contacto At</span>
            <span class="meta-value">${lead.proximo_paso_at ? formatDate(lead.proximo_paso_at) : 'Null'}</span>
          </div>
          <div>
            <span class="meta-label">Último Contacto At</span>
            <span class="meta-value">${lead.ultimo_contacto_at ? formatDate(lead.ultimo_contacto_at) : 'Null'}</span>
          </div>
        </div>
      </div>

      <!-- OPORTUNIDADES DE VENTA Y PROPUESTA DE VALOR -->
      <div class="card">
        <h3 class="card-title">Auditoría de Oportunidades y Propuesta de Valor (Temikia CRM Engine)</h3>
        <div class="products-grid">
          ${suggestedProducts.map(p => `
            <div class="product">
              <span class="product-category">${p.category}</span>
              <span class="product-title">${p.feature}</span>
              <p class="product-desc">${p.description}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- PIE DE PÁGINA -->
      <footer class="footer">
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
        async function startPrint() {
          if (document.fonts && document.fonts.ready) {
            try {
              await document.fonts.ready;
            } catch (e) {}
          }
          // Force browser layout reflow before showing the print dialog
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          await new Promise(resolve => setTimeout(resolve, 300));
          window.focus();
          window.print();
          setTimeout(function() { window.close(); }, 500);
        }

        window.addEventListener('load', startPrint);
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

  // Resolve business timezone, local current time and open/closed status
  const businessTz = getBusinessTimezone(lead.lat, lead.lon, lead.pais);
  const getBusinessCurrentTime = () => {
    try {
      const nowStr = new Date().toLocaleString("en-US", { timeZone: businessTz });
      return new Date(nowStr);
    } catch (e) {
      console.error("Error formatting timezone date:", e);
      return new Date(); // fallback
    }
  };
  const nowInBusinessTz = getBusinessCurrentTime();
  const businessDayIndex = nowInBusinessTz.getDay();
  const businessHour = nowInBusinessTz.getHours();
  const businessMin = nowInBusinessTz.getMinutes();
  
  const DAYS_ES_NORMALIZED = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const currentDayNormalized = DAYS_ES_NORMALIZED[businessDayIndex];

  let isBusinessOpenNow = false;
  if (horarios && horarios.list && horarios.list.length > 0) {
    const todayEntry = horarios.list.find(h => {
      const hDay = (h.day || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return hDay === currentDayNormalized;
    });
    if (todayEntry) {
      isBusinessOpenNow = checkIsOpen(todayEntry.hours, businessHour, businessMin);
    }
  }

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

  // Generate a personalized, highly contextual B2B conversation-opening message from the 20 templates
  const getSocialChannelName = () => {
    const website = (form.sitio_web || '').toLowerCase();
    const notes = (form.notas || '').toLowerCase();
    const ficha = (lead?.ficha_prospeccion || '').toLowerCase();
    
    const hasFb = website.includes('facebook') || website.includes('fb.com') || notes.includes('facebook') || notes.includes('fb.com') || ficha.includes('facebook') || ficha.includes('fb.com');
    const hasIg = website.includes('instagram') || website.includes('ig.me') || notes.includes('instagram') || notes.includes('ig.me') || ficha.includes('instagram') || ficha.includes('ig.me');
    
    if (hasFb && hasIg) return "redes sociales";
    if (hasFb) return "Facebook";
    if (hasIg) return "Instagram";
    return "redes";
  };

  const compileWhatsAppMessage = (templateText) => {
    if (!templateText) return '';
    if (templateText === "[plantilla_0]") {
      return dynamicTemplate0;
    }
    const contactName = form.contacto_nombre ? form.contacto_nombre.trim() : '';
    const executiveName = user?.nombreCompleto || user?.nombre_completo || user?.nombre_corto || user?.nombre || 'asesor de Temikia';
    const city = form.ciudad ? form.ciudad.trim() : 'tu localidad';
    const businessName = form.nombre ? form.nombre.trim() : 'tu negocio';
    const giro = lead?.giro_nombre || form.estilo || 'tu sector';
    
    const canalPreferidoTerm = 
      form.canal_preferido === 'whatsapp' ? 'WhatsApp' : 
      form.canal_preferido === 'correo' ? 'correo electrónico' : 
      form.canal_preferido === 'telefono' ? 'llamada telefónica' : 'WhatsApp';
      
    let msg = templateText;
    msg = msg.replace(/\[nombre_contacto\]/gi, contactName);
    msg = msg.replace(/\[nombre_ejecutivo\]/gi, executiveName);
    msg = msg.replace(/\[ciudad\]/gi, city);
    msg = msg.replace(/\[nombre_negocio\]/gi, businessName);
    msg = msg.replace(/\[canal_o_red_social\]/gi, getSocialChannelName());
    msg = msg.replace(/\[canal_preferido\]/gi, canalPreferidoTerm);
    msg = msg.replace(/\[giro_negocio\]/gi, giro);
    
    // Fallback cleanup if contactName is empty
    if (!contactName) {
      msg = msg
        .replace(/Hola\s+\[nombre_contacto\]\s*,\s*/gi, 'Hola, ')
        .replace(/Hola\s+\[nombre_contacto\]\s*\.\s*/gi, 'Hola. ')
        .replace(/Hola\s+\[nombre_contacto\]\s*!\s*/gi, 'Hola! ')
        .replace(/Qué tal\s+\[nombre_contacto\]\s*,\s*/gi, 'Qué tal, ')
        .replace(/Qué tal\s+\[nombre_contacto\]\s*\.\s*/gi, 'Qué tal. ')
        .replace(/Buen día\s+\[nombre_contacto\]\s*,\s*/gi, 'Buen día, ')
        .replace(/Buen día\s+\[nombre_contacto\]\s*\.\s*/gi, 'Buen día. ')
        .replace(/,\s*\[nombre_contacto\]/gi, '')
        .replace(/\[nombre_contacto\]\s*,/gi, '')
        .replace(/\[nombre_contacto\]/gi, '')
        .replace(/Hola\s*,\s*soy/gi, 'Hola, soy')
        .replace(/Hola\s*,\s*¿/gi, 'Hola, ¿')
        .replace(/Hola\s*,\s*¡/gi, 'Hola, ¡');
    }
    
    return msg;
  };

  const getWhatsAppMessage = () => {
    const templatesForGiro = getTemplatesList();
    const selectedTemplate = templatesForGiro[selectedTemplateIndex] || templatesForGiro[0] || '';
    
    let compiled = compileWhatsAppMessage(selectedTemplate);
    // Convert bold markdown (**) to WhatsApp bold format (*)
    compiled = compiled.replace(/\*\*/g, '*');
    
    return encodeURIComponent(compiled);
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

  const SIN_ASIGNAR_UUID = 'd251a1fc-0188-4c32-9014-fd5a859b680b';
  const isUnassigned = !lead || !lead.miembro_id || lead.miembro_id === '' || lead.miembro_id === SIN_ASIGNAR_UUID;
  const isEditable = !lead || !lead.id || (user && form.miembro_id === user.miembroId);
  const isAdvisorEditable = !lead || !lead.id || isUnassigned || (user && lead.miembro_id === user.miembroId);
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', backgroundColor: 'transparent' }}>
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
              <div className="property-item" style={{ gridColumn: 'span 2', marginBottom: '8px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: form.asistente_ia_activo ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: form.asistente_ia_activo ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} style={{ color: form.asistente_ia_activo ? 'var(--color-ai, #a855f7)' : 'var(--text-secondary)' }} />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Asistente IA Temikia</p>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>Activa o desactiva la automatización inteligente para este lead</p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    disabled={!isEditable}
                    onClick={() => {
                      if (!isEditable) return;
                      setForm(prev => ({ ...prev, asistente_ia_activo: !prev.asistente_ia_activo }));
                    }}
                    style={{
                      background: form.asistente_ia_activo ? 'var(--color-ai, #a855f7)' : 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '20px',
                      width: '44px',
                      height: '24px',
                      position: 'relative',
                      cursor: isEditable ? 'pointer' : 'not-allowed',
                      opacity: isEditable ? 1 : 0.6,
                      transition: 'all 0.3s ease',
                      padding: 0
                    }}
                  >
                    <span style={{
                      display: 'block',
                      width: '18px',
                      height: '18px',
                      backgroundColor: '#fff',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: '3px',
                      left: form.asistente_ia_activo ? '23px' : '3px',
                      transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                    }} />
                  </button>
                </div>
              </div>

              <div className="property-item">
                <label className="property-label">Estatus</label>
                <select name="estatus" value={form.estatus} onChange={handleChange} className="property-input" disabled={!isEditable}>
                  <option value="nuevo">Nuevo</option>
                  <option value="proceso_contacto">En Proceso</option>
                  <option value="contactado">Contactado</option>
                  <option value="calificado">Calificado</option>
                  <option value="propuesta">Propuesta</option>
                  <option value="ganado">Ganado</option>
                  <option value="perdido">Perdido</option>
                  <option value="descalificado">Descalificado</option>
                  <option value="datos_invalidos">Datos Inválidos</option>
                  <option value="cerrado_inexistente">Cerrado</option>
                </select>
              </div>

              <div className="property-item">
                <label className="property-label">Prioridad</label>
                <select name="prioridad" value={form.prioridad} onChange={handleChange} className="property-input" disabled={!isEditable}>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>

              <div className="property-item">
                <label className="property-label">Giro de Negocio</label>
                <select name="giro_id" value={form.giro_id} onChange={handleChange} className="property-input" disabled={!isEditable}>
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
                  disabled={!isAdvisorEditable}
                >
                  <option value="">Seleccione un Ejecutivo...</option>
                  {miembros.map(m => (
                    <option key={m.miembro_id} value={m.miembro_id}>{m.nombre_completo}</option>
                  ))}
                </select>

                {/* Asignar a mí checkbox */}
                {user && user.miembroId && lead && isUnassigned && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <input 
                      type="checkbox"
                      id="assign-to-me-checkbox"
                      checked={form.miembro_id === user.miembroId}
                      disabled={!isAdvisorEditable}
                      onChange={(e) => {
                        const nextId = e.target.checked ? user.miembroId : SIN_ASIGNAR_UUID;
                        setForm(prev => ({ ...prev, miembro_id: nextId }));
                      }}
                      style={{ 
                        cursor: isAdvisorEditable ? 'pointer' : 'not-allowed',
                        width: '14px',
                        height: '14px',
                        accentColor: 'var(--color-primary)'
                      }}
                    />
                    <label 
                      htmlFor="assign-to-me-checkbox"
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        color: form.miembro_id === user.miembroId ? 'var(--color-primary)' : 'var(--text-secondary)',
                        cursor: isAdvisorEditable ? 'pointer' : 'not-allowed',
                        userSelect: 'none'
                      }}
                    >
                      Asignar a mí
                    </label>
                  </div>
                )}
              </div>

              <div className="property-item">
                <label className="property-label">Canal Preferido</label>
                <select name="canal_preferido" value={form.canal_preferido} onChange={handleChange} className="property-input" disabled={!isEditable}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="correo">Correo Electrónico</option>
                  <option value="telefono">Llamada Telefónica</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. DATOS DE CONTACTO */}
          <fieldset disabled={!isEditable} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: 'transparent', width: '100%' }}>
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

                {/* Selector de Plantilla WhatsApp */}
                <div style={{ 
                  marginTop: '10px', 
                  padding: '12px',
                  borderRadius: '12px', 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="property-label" style={{ fontSize: '11px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Plantilla ({getGiroCategory(lead?.giro_nombre, form.estilo)})
                    </span>
                    
                    {/* Regenerar Button */}
                    <button
                      type="button"
                      onClick={handleRegenerateTemplate}
                      className="btn-regenerate"
                      style={{
                        fontSize: '10px',
                        color: 'var(--color-success)',
                        fontWeight: '600',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s',
                        fontFamily: 'inherit'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                        e.currentTarget.style.transform = 'scale(1.03)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <RefreshCw 
                        size={10} 
                        style={{ 
                          transition: 'transform 0.5s ease',
                          transform: isRegenerating ? 'rotate(360deg)' : 'rotate(0deg)'
                        }} 
                      />
                      <span>Regenerar</span>
                    </button>
                  </div>

                  <div style={{ 
                    marginTop: '8px', 
                    fontSize: '11.5px', 
                    color: 'var(--text-secondary)',
                    backgroundColor: 'rgba(0, 0, 0, 0.15)',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    borderLeft: '2px solid var(--color-success)',
                    maxHeight: '190px',
                    overflowY: 'auto',
                    fontStyle: 'italic',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.45'
                  }}>
                    {compileWhatsAppMessage(
                      getTemplatesList()[selectedTemplateIndex] || ''
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="property-item" style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="property-label" style={{ margin: 0 }}>Sitio Web</label>
                {hasWebsiteError && (
                  <span style={{ 
                    fontSize: '10.5px', 
                    fontWeight: 700, 
                    color: '#ef4444',
                    textTransform: 'uppercase',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    border: '1px solid rgba(239, 68, 68, 0.15)'
                  }}>
                    Error de Conexión
                  </span>
                )}
              </div>
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
          {Object.keys(rrss).some(k => parseSocialLinks(rrss[k]).length > 0) && (
            <div className="drawer-section">
              <span className="drawer-section-title">Canales Sociales Encontrados</span>
              <div className="social-links-row">
                {Object.keys(rrss).reduce((acc, platform) => {
                  const links = parseSocialLinks(rrss[platform]);
                  links.forEach((url, idx) => {
                    const displayLabel = links.length > 1 ? `${platform} ${idx + 1}` : platform;
                    acc.push(
                      <a 
                        key={`${platform}-${idx}`} 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="social-chip"
                      >
                        <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{displayLabel}</span>
                        <ExternalLink size={12} />
                      </a>
                    );
                  });
                  return acc;
                }, [])}
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', textAlign: 'left', minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {domain}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {url.length > 55 ? `${url.substring(0, 52)}...` : url}
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
              <span className="drawer-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={13} />
                  <span>Horarios de Operación</span>
                </div>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: isBusinessOpenNow ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: isBusinessOpenNow ? '#10b981' : '#ef4444',
                  border: isBusinessOpenNow ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                  {isBusinessOpenNow ? 'Abierto' : 'Cerrado'}
                </span>
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
                {horarios.list.map((h, i) => {
                  const hDayNormalized = (h.day || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  const isToday = hDayNormalized === currentDayNormalized;
                  
                  return (
                    <div 
                      key={i} 
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: '8px', 
                        padding: '6px 8px', 
                        margin: '0 -8px',
                        borderRadius: isToday ? '6px' : '0',
                        backgroundColor: isToday ? 'rgba(168, 85, 247, 0.08)' : 'transparent', 
                        border: isToday ? '1px solid rgba(168, 85, 247, 0.25)' : 'none',
                        color: isToday ? '#a855f7' : 'inherit',
                        borderBottom: (!isToday && i < horarios.list.length - 1) ? '1px dashed rgba(100, 116, 139, 0.1)' : 'none'
                      }}
                    >
                      <span style={{ textTransform: 'capitalize', fontWeight: isToday ? 700 : 500 }}>{h.day}</span>
                      <span style={{ color: isToday ? '#a855f7' : 'var(--text-secondary)', fontWeight: isToday ? 600 : 400 }}>{h.hours}</span>
                    </div>
                  );
                })}
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
          </fieldset>
          
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>Creado en: {formatDate(lead.created_at)}</span>
            <span>Última modificación: {formatDate(lead.updated_at)}</span>
          </div>
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
            disabled={isDeleting || isSaving || !isEditable}
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
              color: '#FFFFFF',
              opacity: isEditable ? 1 : 0.4,
              cursor: isEditable ? 'pointer' : 'not-allowed'
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
            disabled={isSaving || isDeleting || !isAdvisorEditable}
            style={{ 
              justifySelf: 'end',
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              transition: 'all 0.3s ease',
              opacity: isAdvisorEditable ? 1 : 0.5,
              cursor: isAdvisorEditable ? 'pointer' : 'not-allowed',
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
