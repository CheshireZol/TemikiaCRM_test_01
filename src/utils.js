// Formatting and AI Utilities for TemikIA CRM

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

// 5. Dynamic AI Lead Scoring Algorithm (Simulated Client-Side but persistent)
export const calculateAILeadScore = (lead) => {
  let score = 10; // Base score
  
  // 1. Digital Presence Metrics
  if (lead.sitio_web && lead.sitio_web.trim().length > 0) {
    score += 25; // Website is highly valuable
  }
  
  const rrss = parseJsonbField(lead.rrss);
  const socialCount = Object.keys(rrss).filter(k => rrss[k] && rrss[k].trim().length > 0).length;
  score += socialCount * 10; // Up to +30 points for strong social presence
  
  // 2. Communication Readiness Metrics
  const correoList = parseStringArray(lead.correo);
  if (correoList.length > 0 && correoList[0] !== '') score += 10; // Has emails
  
  const phoneList = parseStringArray(lead.telefono);
  if (phoneList.length > 0 && phoneList[0] !== '') score += 5; // Has phone
  
  const waList = parseStringArray(lead.whatsapp);
  if (waList.length > 0 && waList[0] !== '') score += 15; // Directly has WhatsApp array
  
  // 3. Qualification completeness
  if (lead.contacto_nombre && lead.contacto_nombre.trim().length > 0) score += 5; // Person identified
  if (lead.notas && lead.notas.trim().length > 20) score += 10; // Detailed sales notes exist
  
  // Cap score between 0 and 100
  return Math.min(Math.max(score, 0), 100);
};

// 6. Intelligent AI Commercial Strategy Brief Generator (Fichas de Prospección)
export const generateAISalesStrategy = (lead) => {
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

  const pitchTemplates = {
    food: {
      pitch: `Hola, felicitaciones por la reputación de ${name}. Notamos que en ${city} la competencia culinaria digital crece rápido. Desarrollamos un asistente de WhatsApp con IA que responde preguntas frecuentes, reserva mesas y toma pedidos a domicilio de forma 100% autónoma, integrando sus menús y liberando a su personal para atender mejor en salón. ¿Les interesaría duplicar sus pedidos de delivery de lunes a jueves?`,
      strategy: [
        'Automatización de Reservas: Implementar Agente de IA para responder de inmediato consultas de horarios, ubicación y disponibilidad en WhatsApp.',
        'Captación por Redes Sociales: Configurar anuncios Meta dirigidos en el área local, enlazando directamente al Agente IA para conversión inmediata.',
        'Fidelización Gastronómica: Enviar ofertas personalizadas en base a días de baja afluencia usando la base de datos de clientes recurrentes.'
      ],
      integrations: ['WhatsApp Cloud API', 'Menú Digital Interactivo con IA', 'CRM de pedidos locales']
    },
    beauty: {
      pitch: `Hola, un gusto saludarlos. Analizamos la gran presencia de ${name} y nos encanta su concepto. Sabemos que en el sector de estética, responder rápido a consultas de citas define si el cliente agenda con ustedes o busca en otro salón. Diseñamos un Agente de IA para WhatsApp que agenda, re-programa y confirma citas las 24 horas sincronizado con su calendario de turnos. ¿Les gustaría reducir el ausentismo de clientes en un 40% este mes?`,
      strategy: [
        'Agendamiento Inteligente: Automatizar citas vía chat interactivo para que ningún cliente se pierda por falta de respuesta fuera de horario.',
        'Recordatorio Automático: Envío de alertas amigables 24 horas antes de la cita con opción interactiva de confirmación o cambio.',
        'Venta Cruzada Automatizada: El asistente puede sugerir tratamientos complementarios (ej. manicura al agendar tinte de cabello) usando reglas predictivas.'
      ],
      integrations: ['Sincronizador Google Calendar / Agenda', 'Agente IA WhatsApp 24/7', 'Módulo de prepagos de depósitos']
    },
    health: {
      pitch: `Buen día. Encontramos la ficha de ${name} y apreciamos su nivel de atención. Para las clínicas de especialidades médicas o dentales, el tiempo de los doctores es crítico y la atención inicial debe ser extremadamente profesional y discreta. Desarrollamos un Agente IA validado que realiza el triaje inicial de pacientes, explica tratamientos predefinidos, responde dudas frecuentes sobre seguros y agenda la primera consulta de valoración de forma autónoma. ¿Podríamos apoyarlos a automatizar el 75% del servicio de soporte de su clínica?`,
      strategy: [
        'Triaje Inicial Informativo: Filtrar y clasificar el motivo de consulta del paciente antes de asignarlo a un médico calificado.',
        'Resolución de FAQs de Pacientes: Responder preguntas recurrentes de precios de consultas, direcciones, estacionamiento y seguros médicos aceptados.',
        'Re-agendamiento Preventivo: Activar notificaciones automáticas para limpiezas dentales o consultas preventivas recurrentes cada 6 meses.'
      ],
      integrations: ['Filtros de Privacidad de Datos de Pacientes', 'API de Agendamiento Médico', 'Portal interactivo de información médica']
    },
    tech: {
      pitch: `Hola, equipo de ${name}. Identificamos que son un actor clave en desarrollo de software o servicios. En el rubro B2B digital, el lead que no se califica y atiende en menos de 5 minutos suele enfriarse por completo. Diseñamos un conector inteligente de IA que califica a los prospectos que visitan su sitio web, evalúa su presupuesto/tamaño corporativo mediante preguntas guiadas y agenda directamente una sesión demo en el calendario de sus ingenieros de venta. ¿Les gustaría elevar su tasa de demos calificadas en un 55%?`,
      strategy: [
        'Calificación Inmediata (SDR IA): Formular preguntas breves interactivas al ingresar un prospecto para evaluar el encaje de negocio.',
        'Nutrición de Leads B2B: Secuencia automatizada de envío de casos de éxito y whitepapers informativos según el giro del interesado.',
        'Sincronización de CRM Comercial: Inserción directa de fichas completas enriquecidas con datos públicos de LinkedIn del prospecto.'
      ],
      integrations: ['API de Enriquecimiento (Clearbit/Attio)', 'Agendador de Demos (Calendly/Hubspot)', 'Trigger de Notificaciones en Slack']
    },
    general: {
      pitch: `Hola, un gusto saludarlos. En TemikIA ayudamos a empresas como ${name} a escalar sus operaciones mediante Inteligencia Artificial y workflows de automatización. Notamos que tienen un gran potencial de captación y queremos proponerles una auditoría digital sin costo para mostrarles cómo un Agente de IA entrenado para su negocio puede multiplicar sus oportunidades de ventas atendiendo prospectos las 24 horas del día. ¿Cuándo tendrían 10 minutos para una llamada breve?`,
      strategy: [
        'Optimización de Canales de Contacto: Centralizar WhatsApp, Instagram y Facebook Messenger en una bandeja unificada de atención automatizada.',
        'Seguimiento Sistemático: Programar alertas automatizadas de seguimiento para propuestas de ventas pendientes de respuesta.',
        'Recopilación de Opiniones (Reviews): Enviar solicitudes automatizadas de satisfacción para incentivar opiniones positivas en Google Maps tras un servicio exitoso.'
      ],
      integrations: ['Bandeja Omnicanal Centralizada', 'Agente IA Multi-idiomas', 'Módulo de Reportes de Desempeño Comercial']
    }
  };

  const selected = pitchTemplates[category];
  
  // Build standard dynamic structured report
  return {
    giroCategorizado: category.toUpperCase(),
    pitchElevator: selected.pitch,
    estrategiasIA: selected.strategy,
    integracionesRecomendadas: selected.integrations,
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

Me comunico de parte de *TemikIA Agency*. Estuvimos analizando la excelente trayectoria de su negocio en el sector de *${giro}* y diseñamos una propuesta para ayudarles a automatizar su atención a clientes mediante un Asistente Virtual Inteligente (IA) en WhatsApp.

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

  return `Asunto: Propuesta de Automatización IA para ${name} - TemikIA Agency

Hola ${apodo}, espero que se encuentre muy bien.

Le escribo de parte de TemikIA Agency. Hemos estado analizando la trayectoria de ${name} en el giro de ${giro} y identificamos una oportunidad excelente para implementar un Asistente Virtual Inteligente (IA) entrenado a la medida de su negocio.

Esta automatización permite:
• Atención inmediata 24/7 y agendamiento interactivo directo en WhatsApp y Web.
• Calificación autónoma de leads reduciendo la carga operativa de su personal.
• Incremento de hasta un 35% en tasas de reservas y conversiones de ventas.

Hemos preparado una propuesta personalizada para ${name} y nos encantaría agendar una breve videollamada de 10 minutos esta semana para presentarle un prototipo funcional sin compromiso.

¿Tendría disponibilidad el día de mañana o el miércoles en la tarde?

Quedo atento a su respuesta.

Atentamente,
Equipo de Expansión - TemikIA Agency`;
};

// 9. Phone call script generator
export const generateCallMessage = (lead) => {
  const name = lead.nombre || '';
  const giro = lead.estilo || 'su sector';
  const contacto = lead.contacto_nombre ? lead.contacto_nombre.split(' ')[0] : '';
  const saludo = contacto ? `Hola ${contacto}, buenos días/tardes.` : `Hola, buenas/tardes, ¿me podría comunicar con el gerente o encargado de ${name}?`;

  return `[GUION DE LLAMADA TELEFÓNICA]

1. APERTURA Y SALUDO:
"${saludo} Mi nombre es [Tu Nombre] y le hablo de TemikIA Agency."

2. GANCHO COMERCIAL (ELÉVATOR PITCH):
"Le llamo brevemente porque analizamos el perfil de ${name} y nos encantó su trabajo en el giro de ${giro}. Ayudamos a negocios locales a automatizar su atención al cliente de modo que un Agente IA responda cotizaciones y agende citas las 24 horas en WhatsApp y redes de manera 100% autónoma."

3. CALIFICACIÓN RÁPIDA:
"Actualmente, ¿cómo gestionan el flujo de mensajes y citas fuera de horario de oficina? ¿Han experimentado alguna demora en responder que les haga perder clientes?"

4. PROPUESTA DE ACCIÓN (Llamada al cierre):
"Para no quitarle tiempo, me gustaría mandarle un video demostrativo de 2 minutos de cómo funcionaría para ${name} o agendar una sesión demo interactiva de 10 minutos por Zoom esta semana. ¿Le queda mejor el miércoles o el jueves?"`;
};
