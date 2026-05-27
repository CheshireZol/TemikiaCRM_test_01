// Formatting and AI Utilities for Temikia CRM

// 1. Array parsing helper
export const parseStringArray = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    if (val.trim() === '') return [];
    if (val.startsWith('[') && val.endsWith(']')) {
      try {
        return JSON.parse(val);
      } catch (e) {
        return [val];
      }
    }
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

// 2. Safe JSONB parser
export const parseJsonbField = (val, fallback = {}) => {
  if (typeof val === 'object' && val !== null) return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch (e) {
      return fallback;
    }
  }
  return fallback;
};

// 2b. Safe social links parser (handles both string and array of strings)
export const parseSocialLinks = (val) => {
  if (Array.isArray(val)) {
    return val.map(item => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
};


// 3. Format Date to readable spanish format
export const formatDate = (dateString) => {
  if (!dateString) return 'Sin fecha';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Fecha inválida';
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return 'Fecha inválida';
  }
};

// 4. Clean phone number for WhatsApp link
export const cleanPhoneForWhatsapp = (phoneArray) => {
  const list = parseStringArray(phoneArray);
  if (list.length === 0) return '';
  // Take first phone and strip spaces, signs except numbers
  return list[0].replace(/[^\d+]/g, '');
};

// 5. Dynamic AI Lead Scoring Algorithm (v3 - Madurez Digital & Huella en Buscadores)
export const calculateAILeadScore = (lead) => {
  if (!lead) return 0;
  let score = 0;
  
  // 1. Contactabilidad e Identificación (Hasta 25 puntos)
  const waList = parseStringArray(lead.whatsapp);
  if (waList.length > 0 && waList[0] !== '' && waList[0] !== 'No provisto') {
    score += 8; // WhatsApp Directo
  }
  
  const phoneList = parseStringArray(lead.telefono);
  if (phoneList.length > 0 && phoneList[0] !== '' && phoneList[0] !== 'No provisto') {
    score += 4; // Teléfono de contacto
  }

  const correoList = parseStringArray(lead.correo);
  if (correoList.length > 0 && correoList[0] !== '' && correoList[0] !== 'No provisto') {
    score += 8; // Correo electrónico
  }

  if (lead.contacto_nombre && lead.contacto_nombre.trim().length > 0 && lead.contacto_nombre !== 'No provisto') {
    score += 5; // Persona de contacto identificada
  }
  
  // 2. Calidad y Perfilado Comercial (Hasta 10 puntos)
  if (lead.notas && lead.notas.trim().length > 20) {
    score += 5; // Notas de prospección detalladas
  }

  if (lead.direccion1 && lead.direccion1.trim().length > 0 && lead.direccion1 !== 'No provisto') {
    score += 5; // Dirección física provista
  }
  
  // 3. Tracción y Tráfico Comercial - Google Maps (Hasta 20 puntos)
  const reviews = parseInt(lead.reviews_count) || 0;
  if (reviews > 100) {
    score += 12; // Muy popular en Google Maps
  } else if (reviews >= 25) {
    score += 8;  // Tráfico moderado activo
  } else if (reviews > 0) {
    score += 4;  // Tráfico inicial
  }

  const rating = parseFloat(lead.total_score) || 0;
  if (rating >= 4.2) {
    score += 8;  // Excelente reputación local
  } else if (rating > 0) {
    score += 4;  // Reputación con áreas de mejora
  }

  // 4. Infraestructura Web y Canales (Hasta 25 puntos)
  const hasWebsite = lead.sitio_web && lead.sitio_web.trim().length > 0 && lead.sitio_web.trim() !== 'No provisto';
  if (hasWebsite) {
    score += 15; // Sitio web corporativo activo (madurez digital)
  }

  const rrss = parseJsonbField(lead.rrss);
  const socialCount = Object.keys(rrss).filter(k => parseSocialLinks(rrss[k]).length > 0).length;
  if (socialCount >= 2) {
    score += 10; // Fuerte huella multicanal social (FB/IG)
  } else if (socialCount === 1) {
    score += 5;  // Presencia social inicial
  }

  // 5. Huella Digital y Búsquedas Relacionadas (Hasta 10 puntos)
  const webSearchList = parseStringArray(lead.web_search);
  const hasWebSearch = webSearchList.length > 0 && webSearchList[0] !== '' && webSearchList[0] !== 'No provisto';
  if (hasWebSearch) {
    score += 10; // Menciones y búsquedas asociadas detectadas
  }

  // 6. Presión Competitiva y Clúster Local (Hasta 10 puntos)
  const peopleAlsoSearchObj = parseJsonbField(lead.peoplealsosearch);
  const competidores = peopleAlsoSearchObj.resultados || [];
  if (competidores.length > 0) {
    score += 10; // Indexado en clúster competitivo local
  }

  // Cap score between 0 and 100
  return Math.min(Math.max(score, 0), 100);
};

// 6. Intelligent AI Commercial Strategy Brief Generator (Fichas de Prospección)
export const generateAISalesStrategy = (lead) => {
  if (!lead) return null;

  const name = lead.nombre || 'el negocio';
  const giro = lead.estilo || 'Giro comercial general';
  const city = lead.ciudad || 'la ciudad';
  const rrss = parseJsonbField(lead.rrss);
  
  // Core business categories
  let category = 'general';
  const lowerGiro = giro.toLowerCase();
  
  if (lowerGiro.includes('restaurante') || lowerGiro.includes('bar') || lowerGiro.includes('comida') || lowerGiro.includes('caf')) {
    category = 'food';
  } else if (lowerGiro.includes('spa') || lowerGiro.includes('salon') || lowerGiro.includes('uñas') || lowerGiro.includes('estet') || lowerGiro.includes('manicur')) {
    category = 'beauty';
  } else if (lowerGiro.includes('dent') || lowerGiro.includes('clinic') || lowerGiro.includes('odont') || lowerGiro.includes('consult')) {
    category = 'health';
  } else if (lowerGiro.includes('soft') || lowerGiro.includes('tecno') || lowerGiro.includes('comput')) {
    category = 'tech';
  }

  // 1. Web Infrastructure Audit
  const hasWebsite = lead.sitio_web && lead.sitio_web.trim().length > 0 && lead.sitio_web.trim() !== 'No provisto';
  const webAudit = hasWebsite 
    ? `INFRAESTRUCTURA WEB ACTIVA: Se detectó sitio oficial [${lead.sitio_web}]. Indica madurez digital básica. Oportunidad: Optimización de tiempos de carga, SEO local en buscadores e instalación de un Webchat Inteligente Temikia para capturar el tráfico y canalizar leads en caliente 24/7.` 
    : `INFRAESTRUCTURA WEB AUSENTE: No cuenta con portal o landing page oficial en la web. Es un punto de fricción de máxima urgencia, ya que pierden la totalidad del tráfico orgánico en Google. Oportunidad prioritaria: Diseño de Landing Page comercial de alta conversión y Formularios CRM Temikia.`;

  // 2. Google Maps Reputation & Traffic Audit
  const reviews = parseInt(lead.reviews_count) || 0;
  const rating = parseFloat(lead.total_score) || 0;
  let mapsAudit = '';
  if (reviews === 0) {
    mapsAudit = `AUDITORÍA DE REPUTACIÓN CRÍTICA: Negocio sin opiniones registradas en Google Maps (★ 0.0 con 0 reseñas). Afecta severamente el nivel de confianza de nuevos prospectos locales. Oportunidad prioritaria: Módulo Temikia automatizado de reactivación y recopilación de reseñas de satisfacción de clientes.`;
  } else if (rating < 4.2) {
    mapsAudit = `AUDITORÍA DE REPUTACIÓN VULNERABLE: Cuenta con ★ ${rating} estrellas y ${reviews} opiniones. Su baja puntuación promedio ahuyenta a prospectos digitales. Oportunidad urgente: Campaña de fidelización automatizada y asistente inteligente de respuesta rápida y filtrado interno de reviews.`;
  } else {
    mapsAudit = `AUDITORÍA DE REPUTACIÓN EXCELENTE: Calificación sobresaliente de ★ ${rating} estrellas sustentada en ${reviews} opiniones. Cuenta con una gran confianza local. Oportunidad comercial: Capitalizar este alto flujo de clientes instalando un Agente telefónico de IA y un Agendamiento autónomo sincronizado.`;
  }

  // 3. Social Media Densidad / Meta Audit
  const socialCount = Object.keys(rrss).filter(k => rrss[k] && rrss[k].trim().length > 0).length;
  const activeSocials = Object.keys(rrss).filter(k => rrss[k] && rrss[k].trim().length > 0).map(k => k.charAt(0).toUpperCase() + k.slice(1));
  let socialAudit = '';
  if (socialCount === 0) {
    socialAudit = `HUELLA SOCIAL INEXISTENTE: No se detectaron perfiles corporativos activos en Meta (Facebook, Instagram). Fuga total de captación social interactiva. Oportunidad prioritaria: Pack Temikia de Social Expansion, creando presencia corporativa integrada.`;
  } else if (socialCount === 1) {
    socialAudit = `HUELLA SOCIAL LIMITADA: Cuenta con un solo canal activo en la red (${activeSocials[0]}). Limitada interacción y baja visibilidad multicanal. Oportunidad: Conexión omnicanal cruzada y ampliación a ecosistemas Meta unificados.`;
  } else {
    socialAudit = `HUELLA SOCIAL ACTIVA: Fuerte posicionamiento en ${activeSocials.join(' y ')}. Sin embargo, la atención por bandeja de entrada (mensajes directos) está descubierta fuera del horario de oficina. Oportunidad prioritaria: Implementación de Respuestas inmediatas por Instagram / Messenger coordinadas con IA.`;
  }

  // 4. Digital Footprint Traces (web_search)
  const webSearchList = parseStringArray(lead.web_search);
  const hasWebSearch = webSearchList.length > 0 && webSearchList[0] !== '' && webSearchList[0] !== 'No provisto';
  const searchAudit = hasWebSearch 
    ? `HUELLA EN BUSCADORES DETECTADA: Se localizaron ${webSearchList.length} enlaces/búsquedas comerciales relacionados en Google. Cuenta con cierta autoridad digital. Oportunidad: Diseñar una estrategia SEO dirigida y campañas locales de Google Ads enlazadas a pre-cotizadores Temikia.` 
    : `HUELLA EN BUSCADORES NULA: Cero registros o menciones del negocio en búsquedas de la web. Invisible para quienes buscan activamente sus servicios. Oportunidad: Alta en directorios, mapa de posicionamiento local y creación de huella digital de autoridad.`;

  // 5. Competitive Pressure (peoplealsosearch / competitor clúster)
  const peopleAlsoSearchObj = parseJsonbField(lead.peoplealsosearch);
  const competidores = peopleAlsoSearchObj.resultados || [];
  const hasCompetidores = competidores.length > 0;
  const competitiveAudit = hasCompetidores 
    ? `ALTA PRESIÓN COMPETITIVA LOCAL: Google vincula directamente esta ficha con ${competidores.length} competidores locales del mismo rubro ("Otros usuarios también buscaron"). Riesgo extremo de perder prospectos ante respuestas lentas. Oportunidad crítica: Integración urgente de WhatsApp con respuestas con IA y Precotizador automático para ganar el cliente en menos de 1 minuto.` 
    : `PRESIÓN COMPETITIVA AISLADA: No se detectó un clúster directo de competidores asociados en la ficha de Google. Mayor exclusividad local en este momento. Oportunidad comercial: Aprovechar la ventaja competitiva temprana monopolizando la atención digital automatizada antes de que la competencia despierte.`;

  const pitchTemplates = {
    food: {
      pitch: `Hola, felicitaciones por la reputación de ${name}. Analizamos su perfil en el giro de alimentos y notamos que en ${city} la competencia digital culinaria local está muy saturada. Desarrollamos un Asistente Virtual IA en WhatsApp que de forma 100% autónoma responde dudas de menú, precios, alérgenos, toma pedidos a domicilio y gestiona reservaciones las 24 horas, integrando el flujo directamente en su CRM. ¿Les interesaría duplicar sus pedidos de delivery de lunes a jueves?`,
      strategy: [
        'Automatización Completa de Reservas: Implementar Agente de IA conversacional para responder al instante la disponibilidad de mesas, estacionamiento y ubicación exacta en WhatsApp.',
        'Captación con Campañas Directas: Configurar anuncios de Meta orientados a las zonas aledañas que abran directamente el chat del Agente IA en WhatsApp, logrando reservas inmediatas con un clic.',
        'Campañas de Fidelización de Baja Afluencia: Automatizar el envío de recordatorios y ofertas de fidelización los días de menor venta (lunes a miércoles) a su lista de comensales recurrentes.'
      ],
      integrations: ['WhatsApp Cloud API', 'Menú Digital Interactivo en Lenguaje Natural', 'CRM de Pedidos y Delivery']
    },
    beauty: {
      pitch: `Hola, un gusto saludarlos. Analizamos la gran presencia de ${name} y nos fascina su concepto. En el sector estético, responder rápido determina si el cliente agenda con ustedes o se va con la competencia. Diseñamos un Agente de IA para WhatsApp que responde preguntas frecuentes, agenda, reprograma y confirma citas las 24 horas, sincronizado perfectamente con su agenda de turnos. ¿Les gustaría reducir el ausentismo de citas en un 40% este mes?`,
      strategy: [
        'Agendamiento Interactivo de Turnos: Automatizar la reserva de citas en lenguaje natural para que ningún prospecto se pierda en horarios nocturnos o de saturación en recepción.',
        'Recordatorios de Citas Autocontrolados: Envío de alertas amigables de confirmación 24 horas antes por WhatsApp, permitiendo confirmar o reagendar de forma autónoma sin ocupar tiempo del personal.',
        'Venta Cruzada Inteligente: Configurar el Agente para sugerir y cotizar tratamientos adicionales o complementarios (ej. manicura al reservar coloración) en el momento álgido del agendamiento.'
      ],
      integrations: ['Sincronizador Google Calendar / Agenda de Turnos', 'Agente IA WhatsApp 24/7', 'Módulo de pre-pagos o reservas de depósitos']
    },
    health: {
      pitch: `Buen día. Encontramos la ficha de ${name} y valoramos su gran nivel de atención médica. Para clínicas o consultorios, el tiempo de los profesionales es valiosísimo y el soporte debe ser profesional y reservado. Desarrollamos un Agente IA especializado que realiza el triaje interactivo de pacientes, responde dudas de coberturas de seguros, explica tratamientos comunes y agenda valoraciones iniciales en su calendario de forma autónoma. ¿Podríamos apoyarlos a automatizar el 75% del soporte de su clínica?`,
      strategy: [
        'Triaje e Interacción Inicial de Pacientes: Filtrar, calificar y organizar el motivo de consulta del paciente antes de enviarlo directamente al software médico.',
        'Resolución de FAQs Clínicas: Responder preguntas repetitivas (horarios, ubicación, estacionamiento, convenios de aseguradoras y métodos de pago aceptados) en milisegundos.',
        'Reagendamiento y Campañas de Prevención: Automatizar el despacho de recordatorios preventivos para citas de seguimiento o limpiezas periódicas (cada 6 meses).'
      ],
      integrations: ['Filtros de Seguridad e Intimidad de Pacientes', 'API de Agendamiento Médico', 'Base de Conocimiento de Cobertura de Seguros']
    },
    tech: {
      pitch: `Hola, equipo de ${name}. Identificamos que son un actor clave en desarrollo de software y servicios. En el rubro B2B, el prospecto que no es calificado y atendido en menos de 5 minutos suele enfriarse totalmente. Diseñamos un SDR Inteligente que califica prospectos en su web, evalúa su presupuesto mediante preguntas interactivas y agenda directamente sesiones demo en el calendario de su equipo comercial. ¿Les gustaría elevar sus demos calificadas en un 55%?`,
      strategy: [
        'Calificación Virtual SDR IA: Implementar un chat conversacional inteligente que formule preguntas breves para calificar el encaje de la empresa (tamaño, presupuesto, dolores comerciales).',
        'Flujos de Nutrición e Investigación B2B: Secuencia programada de envío de casos de éxito y whitepapers altamente relevantes según el giro empresarial detectado en el lead.',
        'Sincronización Inmediata con CRM: Inyección directa de prospectos enriquecidos con información pública al pipeline de ventas de Temikia, alertando al ejecutivo en Slack.'
      ],
      integrations: ['API de Enriquecimiento Comercial (Clearbit/Attio)', 'Agendador de Demos (Calendly/Hubspot)', 'Trigger de Notificaciones en Slack/Teams']
    },
    general: {
      pitch: `Hola, un gusto saludarlos. En Temikia ayudamos a empresas como ${name} a escalar sus operaciones mediante Inteligencia Artificial y flujos automatizados de trabajo. Analizamos detalladamente su radiografía digital y queremos proponerles una auditoría personalizada sin costo para mostrarles cómo un Agente de IA entrenado a la medida de su negocio puede multiplicar sus ventas respondiendo prospectos las 24 horas. ¿Cuándo tendrían 10 minutos para una llamada breve?`,
      strategy: [
        'Centralización Omnicanal: Consolidar WhatsApp, Instagram y Facebook Messenger en una bandeja unificada de atención donde un Agente IA responda instantáneamente.',
        'Seguimiento Sistemático Post-propuesta: Programar alertas automáticas de seguimiento para presupuestos emitidos que aún no han recibido respuesta del cliente.',
        'Recopilación y Respuesta Automática de Opiniones: Despachar invitaciones interactivas de satisfacción tras compras o servicios exitosos para alimentar y mejorar su ranking en buscadores.'
      ],
      integrations: ['Bandeja Omnicanal Centralizada', 'Agente IA Multi-idiomas', 'Módulo de Reportes de Eficiencia Comercial']
    }
  };

  const selected = pitchTemplates[category];
  
  return {
    giroCategorizado: category.toUpperCase(),
    pitchElevator: selected.pitch,
    estrategiasIA: selected.strategy,
    integracionesRecomendadas: selected.integrations,
    auditoriaInicial: [webAudit, mapsAudit, socialAudit, searchAudit, competitiveAudit],
    fechaGeneracion: new Date().toISOString()
  };
};

// 7. Whatsapp customized greeting message generator
export const generateWhatsappMessage = (lead) => {
  const name = lead.nombre || '';
  const giro = lead.estilo || 'su sector';
  const contacto = lead.contacto_nombre ? lead.contacto_nombre.split(' ')[0] : '';
  
  let saludo = contacto ? `Hola ${contacto},` : `Hola, ¿qué tal? Hablo con el encargado de *${name}*,`;
  
  return `${saludo} un gusto saludarte.

Me comunico de parte de *Temikia Agency*. Estuvimos analizando la excelente trayectoria de su negocio en el sector de *${giro}* y diseñamos una propuesta para ayudarles a automatizar su atención a clientes mediante un Asistente Virtual Inteligente (IA) en WhatsApp.

Esto les permitiría responder a consultas frecuentes de forma inmediata y agendar citas o pedidos las 24 horas del día, incrementando sus conversiones sin aumentar el trabajo de su equipo.

¿Les interesaría que les comparta un breve video demo de 2 minutos para ver cómo funcionaría exactamente para *${name}*?

Quedo a tus órdenes. ¡Excelente día!`;
};

// 8. Email customized proposal message generator
export const generateEmailMessage = (lead) => {
  const name = lead.nombre || '';
  const giro = lead.estilo || 'su sector';
  const contacto = lead.contacto_nombre ? lead.contacto_nombre : 'Encargado de ' + name;
  const apodo = lead.contacto_nombre ? lead.contacto_nombre.split(' ')[0] : 'Estimado/a';

  return `Asunto: Propuesta de Automatización IA para ${name} - Temikia Agency

Hola ${apodo}, espero que se encuentre muy bien.

Le escribo de parte de Temikia Agency. Hemos estado analizando la trayectoria de ${name} en el giro de ${giro} y identificamos una oportunidad excelente para implementar un Asistente Virtual Inteligente (IA) entrenado a la medida de su negocio.

Esta automatización permite:
• Atención inmediata 24/7 y agendamiento interactivo directo en WhatsApp y Web.
• Calificación autónoma de leads reduciendo la carga operativa de su personal.
• Incremento de hasta un 35% en tasas de reservas y conversiones de ventas.

Hemos preparado una propuesta personalizada para ${name} y nos encantaría agendar una breve videollamada de 10 minutos esta semana para presentarle un prototipo funcional sin compromiso.

¿Tendría disponibilidad el día de mañana o el miércoles en la tarde?

Quedo atento a su respuesta.

Atentamente,
Equipo de Expansión - Temikia Agency`;
};

// 9. Phone call script generator
export const generateCallMessage = (lead) => {
  const name = lead.nombre || '';
  const giro = lead.estilo || 'su sector';
  const contacto = lead.contacto_nombre ? lead.contacto_nombre.split(' ')[0] : '';
  const saludo = contacto ? `Hola ${contacto}, buenos días/tardes.` : `Hola, buenas/tardes, ¿me podría comunicar con el gerente o encargado de ${name}?`;

  return `[GUION DE LLAMADA TELEFÓNICA]

1. APERTURA Y SALUDO:
"${saludo} Mi nombre es [Tu Nombre] y le hablo de Temikia Agency."

2. GANCHO COMERCIAL (ELÉVATOR PITCH):
"Le llamo brevemente porque analizamos el perfil de ${name} y nos encantó su trabajo en el giro de ${giro}. Ayudamos a negocios locales a automatizar su atención al cliente de modo que un Agente IA responda cotizaciones y agende citas las 24 horas en WhatsApp y redes de manera 100% autónoma."

3. CALIFICACIÓN RÁPIDA:
"Actualmente, ¿cómo gestionan el flujo de mensajes y citas fuera de horario de oficina? ¿Han experimentado alguna demora en responder que les haga perder clientes?"

4. PROPUESTA DE ACCIÓN (Llamada al cierre):
"Para no quitarle tiempo, me gustaría mandarle un video demostrativo de 2 minutos de cómo funcionaría para ${name} o agendar una sesión demo interactiva de 10 minutos por Zoom esta semana. ¿Le queda mejor el miércoles o el jueves?"`;
};

// 10. Logical assigner of Temikia capabilities based on public business radiografía
export const getSuggestedProducts = (lead, form) => {
  if (!lead) return [];

  const suggestions = [];

  // Rule 1: Website absence or presence
  const hasWebsite = form.sitio_web && form.sitio_web.trim().length > 0 && form.sitio_web.trim() !== 'No provisto';
  if (!hasWebsite) {
    suggestions.push({
      category: "Web, landing pages y portales",
      feature: "Diseño de landing page comercial",
      description: "Desarrollo de un sitio web corporativo o página de aterrizaje ultra-rápida y responsiva para captar clientes locales."
    });
    suggestions.push({
      category: "Web, landing pages y portales",
      feature: "Formularios conectados a CRM",
      description: "Integración de formularios dinámicos para canalizar prospectos de forma directa a la base de datos del negocio."
    });
  } else {
    suggestions.push({
      category: "Web, landing pages y portales",
      feature: "Optimización SEO básica",
      description: "Optimización SEO On-Page técnica para impulsar la visibilidad y ranking del sitio web existente en búsquedas locales."
    });
    suggestions.push({
      category: "Atención al cliente",
      feature: "Respuestas inmediatas por webchat",
      description: "Instalación de un agente inteligente interactivo en la web para asistir a los visitantes en tiempo real las 24 horas."
    });
  }

  // Rule 2: Google Maps reviews count and score (reputation & traffic)
  const reviews = parseInt(lead.reviews_count) || 0;
  const rating = parseFloat(lead.total_score) || 0;

  if (reviews > 100) {
    // Highly popular business -> high inbound traffic
    suggestions.push({
      category: "Voz y llamadas",
      feature: "Agente telefónico IA",
      description: "Un asistente virtual por llamada automatizado para responder preguntas frecuentes y agendar de forma natural por teléfono."
    });
    suggestions.push({
      category: "Agenda, citas y reservas",
      feature: "Agendamiento automático",
      description: "Mapeo inteligente de turnos libres sincronizados en tiempo real con Google Calendar para capturar reservas autónomamente."
    });
  } else if (reviews > 0 && reviews < 25) {
    // Low reviews -> needs reputation booster
    suggestions.push({
      category: "Atención al cliente",
      feature: "Resolución de dudas sobre servicios",
      description: "Configuración detallada de preguntas frecuentes de la marca en lenguaje natural para robustecer la atención digital."
    });
    suggestions.push({
      category: "Atención al cliente",
      feature: "Respuesta automática de opiniones (Reviews)",
      description: "Envío sistematizado de felicitaciones o solicitudes de satisfacción para fomentar opiniones positivas en Google Maps."
    });
  }

  // Rule 3: Active social media networks presence (FB/IG)
  const rrssObj = parseJsonbField(lead.rrss);
  const activeSocials = Object.keys(rrssObj).filter(k => parseSocialLinks(rrssObj[k]).length > 0);

  if (activeSocials.length > 0) {
    suggestions.push({
      category: "Atención al cliente",
      feature: "Respuestas inmediatas por Instagram / Facebook Messenger",
      description: "Habilitación del Agente de IA para automatizar la bandeja de mensajes directos de Meta de manera inmediata y fluida."
    });
  }

  // Rule 4: Preferred communication channels
  const preferredCanal = (form.canal_preferido || 'whatsapp').toLowerCase();
  if (preferredCanal.includes('whatsapp')) {
    suggestions.push({
      category: "Cotización y precotización",
      feature: "Precotización automática",
      description: "Módulo conversacional interactivo en WhatsApp que calcula presupuestos estimados recopilando datos del cliente."
    });
    suggestions.push({
      category: "Comunicación automática",
      feature: "Envío de confirmación por WhatsApp",
      description: "Despacho automatizado e inmediato de comprobantes, recordatorios y alertas directos a la mensajería del cliente."
    });
  }

  // General Fallbacks: ensure we always provide exactly 4 robust suggestions
  if (suggestions.length < 4) {
    suggestions.push({
      category: "Ventas y CRM",
      feature: "Captura automática de leads",
      description: "Centralización y registro automático de prospectos provenientes de chats en el pipeline de ventas del negocio."
    });
  }

  // Return the top 4 highly targeted recommendations
  return suggestions.slice(0, 4);
};
