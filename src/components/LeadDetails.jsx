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
  getSuggestedProducts
} from '../utils.js';

// Dictionary of WhatsApp Templates organized by business category/giro
const WHATSAPP_TEMPLATES = {
  "Arte": [
    "Hola [nombre_contacto]. Soy [nombre_ejecutivo] de Temikia. Últimamente converso con galerías y artistas de [ciudad] y me comentan que uno de sus mayores retos es perder encargos porque no pueden responder rápido los mensajes de [canal_o_red_social] mientras están en su proceso creativo. Otros me dicen que el problema es el tiempo que pierden enviando precotizaciones o detalles de envíos uno por uno. No sé si alguno de estos escenarios te resulte familiar en [nombre_negocio], o si la fricción se encuentra en otro frente. Si esto hace eco contigo, ¿te interesaría ver cómo un asistente con IA responde y precotiza tus obras en automático?",
    "Qué tal [nombre_contacto]. Hablando con profesionales del sector del arte, noto que muchos atraen interesados constantemente gracias a su contenido visual, pero batallan para centralizar esos contactos y darles un seguimiento automático para futuras exposiciones o ventas. Soy [nombre_ejecutivo] de Temikia. No estoy seguro de si la falta de bases de datos ordenadas y seguimiento de prospectos sea un cuello de botella hoy en [nombre_negocio], o si su desafío principal hoy va por otro lado. Si te resulta familiar este dolor, ¿tendrías 5 minutos la próxima semana para mostrarte cómo lo resolvemos?",
    "Hola [nombre_contacto]. Analizando el rubro de galerías y creadores en [ciudad], notamos que un gran desafío es atender a coleccionistas interesados en [canal_o_red_social] mientras el equipo está en pleno proceso creativo. Otros mencionan que su problema real es dar seguimiento a piezas de alto valor sin parecer insistentes. Soy [nombre_ejecutivo] de Temikia. No sé si en [nombre_negocio] vivan algo de esto, o si en la mente tienen algún otro problema más urgente a resolver. Si es así, ¿tendría sentido que revisemos cómo delegar esto a un agente IA?",
    "Qué tal [nombre_contacto]. Te escribe [nombre_ejecutivo]. Conversando con profesionales de [giro_negocio], me cuentan que atraer tráfico visual no es problema, pero sí lo es convertir esos \"me gusta\" en una base de datos de compradores VIP a la cual nutrir. En Temikia automatizamos la extracción y calificación de esos contactos. Ignoro si hoy esto sea un cuello de botella para ustedes o si la prioridad actual sea distinta. ¿Están abiertos a ver un breve ejemplo?",
    "Buen día. Mi nombre es [nombre_ejecutivo] y represento a Temikia. Muchos negocios de arte nos comparten que organizar envíos, seguros y precotizaciones por [canal_preferido] les consume horas diarias. Otros sufren por no tener sus datos centralizados para ofrecer atención personalizada. No estoy seguro si [nombre_negocio] enfrente estos retos actualmente o si la fricción se encuentre en otro frente. Si esto resuena contigo, ¿te interesaría evaluar un tablero automático que lo resuelva?",
    "Qué tal [nombre_contacto]. Soy [nombre_ejecutivo]. Al colaborar con creadores del sector de [giro_negocio], noto que tras participar en ferias o exposiciones, acumulan decenas de contactos que se quedan rezagados inútilmente en libretas o chats sin un flujo de nutrición automatizado. En Temikia creamos sistemas que digitalizan y segmentan estos prospectos al instante. No sé si la falta de seguimiento post-evento sea un problema en [nombre_negocio], o si su cuello de botella operativo real esté en otra área. Si te interesa ver cómo se resuelve, ¿te comparto un ejemplo rápido?",
    "Hola [nombre_contacto]. Mi nombre es [nombre_ejecutivo] de Temikia. Muchos estudios de arte nos comparten que el proceso de gestionar encargos personalizados o comisiones es un caos operativo: enviar contratos, validar anticipos y reportar avances por [canal_o_red_social] les quita horas de taller. Desconozco si en [nombre_negocio] este flujo manual afecte sus tiempos de entrega o si la complejidad operativa se ubique en otro punto. Si es así, ¿estarías abierto a revisar cómo centralizar el estatus de tus proyectos sin esfuerzo manual?",
    "Qué tal [nombre_contacto]. Te saluda [nombre_ejecutivo]. Analizando el mercado de [giro_negocio], vemos que atender solicitudes de cotización que no se atienden pronto hace que se enfríen prospectos de alto valor. En Temikia desarrollamos agentes conversacionales multilingües que envían catálogos y tarifas 24/7. No estoy seguro si la atención fuera de horario sea un cuello de botella para [nombre_negocio] o si la fuga de prospectos ocurra en un frente distinto. Si te resuena, ¿tendría sentido revisar un demo rápido?",
    "Buen día [nombre_contacto]. Soy [nombre_ejecutivo] de Temikia. Varias firmas de arte nos comentan que enviar catálogos digitales pesados y listas de precios por [canal_preferido] satura a su equipo, además de que no saben qué piezas generaron verdadero interés. Creamos tableros que automatizan el envío de portafolios y miden la interacción del cliente. Ignoro si en [nombre_negocio] busquen optimizar este proceso de venta o si su prioridad inmediata esté en otro frente. ¿Te interesaría conocer los detalles?"
  ],
  "Arte corporal y perforaciones": [
    "Buen día [nombre_contacto]. Te habla [nombre_ejecutivo]. Colaborando con estudios de [giro_negocio], me comparten que su mayor dolor de cabeza son las inasistencias o cancelaciones de última hora que les dejan la agenda rota y merman sus ingresos. Otros mencionan el tiempo perdido respondiendo las mismas dudas de cuidados post-tatuaje por WhatsApp. No sé si en [nombre_negocio] se identifiquen con esto o si el verdadero dolor de cabeza esté en otro punto de la operación. Si es así, ¿tiene sentido que platiquemos sobre cómo automatizamos las confirmaciones y reagendamientos automáticos desde Temikia?",
    "Hola [nombre_contacto]. Mi nombre es [nombre_ejecutivo] de Temikia. Varios artistas corporales me cuentan que pierden mucho tiempo filtrando ideas y dando precios aproximados por [canal_preferido], restándoles horas en el estudio. Algunos más sufren para organizar los anticipos y la disponibilidad de horarios permitidos. Ignoro si esta carga operativa les suceda en [nombre_negocio] o si la fricción se encuentre en otro frente. Si algo de esto te resuena, ¿te gustaría que te envíe un ejemplo de cómo nuestro agente filtra, precotiza y agenda citas solo?",
    "Hola [nombre_contacto], soy [nombre_ejecutivo] de Temikia. Hablando con estudios de [giro_negocio], el dolor más frecuente que escucho es el tiempo que pierden respondiendo mensajes de personas que solo buscan precio y no agendan. Otros batallan para gestionar los anticipos de forma ordenada. No sé si en [nombre_negocio] se identifiquen con alguno de estos escenarios o si su desafío principal hoy sea distinto. Si es así, ¿te enviamos un video de 1 minuto mostrando cómo un asistente IA filtra y cobra por ti?",
    "Qué tal [nombre_contacto]. Últimamente asesoro a estudios en [ciudad] y me dicen que enviar instrucciones de cuidado post-tatuaje y hacer seguimiento a cada cliente para futuros retoques es operativamente inviable a mano. Desde Temikia creamos ecosistemas que automatizan esto por [canal_o_red_social]. Soy [nombre_ejecutivo], ¿les resulta familiar esta fuga de tiempo o su desafío principal hoy va por otro lado?",
    "Buen día. Te saluda [nombre_ejecutivo]. Varios artistas corporales me comentan que su agenda es un caos cuando intentan cuadrar disponibilidades, diseños y sesiones largas por [canal_preferido]. En Temikia conectamos WhatsApp directo a su calendario para reservas 100% autónomas. Desconozco si esto sea un dolor de cabeza en [nombre_negocio] o si tengan algún otro problema más urgente a resolver. Si hace sentido, ¿tendrías un momento la próxima semana para platicarlo?",
    "Hola [nombre_contacto]. Te escribe [nombre_ejecutivo] de Temikia. Colaborando con estudios de [giro_negocio], veo que la organización de \"Flash Days\" o la visita de artistas invitados suele colapsar sus canales de atención, mezclando citas regulares con solicitudes masivas. Diseñamos flujos específicos de agendamiento exprés para eventos de alta demanda. Desconozco si en [nombre_negocio] batallen para gestionar estos picos de trabajo o si la complicación operativa se ubique en otra parte. Si es el caso, ¿te gustaría ver cómo automatizamos la asignación de turnos?",
    "Qué tal [nombre_contacto]. Soy [nombre_ejecutivo]. Hablando con dueños de estudios en [ciudad], me dicen que la recolección de responsivas médicas y el llenado de formularios de consentimiento consume demasiado tiempo presencial en el mostrador. En Temikia integramos sistemas que envían y validan estos documentos vía [canal_preferido] un día antes de la cita. No sé si en [nombre_negocio] sigan haciendo este papeleo a mano o si la carga administrativa real se encuentre en otro frente. Si buscas digitalizarlo, ¿platicamos 5 minutos esta semana?",
    "Hola [nombre_contacto], te saluda [nombre_ejecutivo] de Temikia. Muchos artistas con agendas cerradas nos comentan que gestionar sus listas de espera manualmente es inviable, provocando que cuando una cita se cancela, el espacio quede vacío por no poder contactar rápido a los sustitutos. Automatizamos listas de espera dinámicas que reasignan el turno al instante por [canal_o_red_social]. Ignoro si en [nombre_negocio] sufran por esta pérdida de ingresos o si su principal reto actual sea otro. ¿Hará sentido que revisemos la solución?",
    "Qué tal [nombre_contacto]. Mi nombre es [nombre_ejecutivo]. En el rubro de [giro_negocio], noto que recordar a los clientes de perforaciones su cita de seguimiento para el cambio de pieza (downsize) depende totalmente de la memoria del perforador, perdiendo una venta secundaria garantizada. Con Temikia, estos recordatorios se disparan solos según el tiempo de cicatrización. Desconozco si en [nombre_negocio] tengan automatizada esta recompra o si la atención esté puesta en un desafío distinto. ¿Te interesaría evaluar un flujo de este tipo?",
    "Buen día [nombre_contacto]. Te habla [nombre_ejecutivo] de Temikia. Varios estudios nos reportan que, aunque sus clientes salen felices con sus tatuajes, olvidan dejar reseñas en Google Maps, limitando su posicionamiento local. Desarrollamos automatizaciones que vinculan el fin de la sesión con una solicitud automatizada de opinión calificada. No sé si incrementar sus reseñas sea prioridad actual para [nombre_negocio] o si la fricción se encuentre en otro frente. Si es así, ¿están abiertos a explorar la herramienta?"
  ],
  "Educación": [
    "Hola [nombre_contacto], te saluda [nombre_ejecutivo]. Hablando con directivos del sector educativo, me comentan que en época de admisiones pierden muchos alumnos potenciales por demorar en responder dudas a los padres de familia. Otros me dicen que la carga administrativa de armar exámenes, generar retroalimentación y enviar informes de cursos los sobrepasa. No sé si en [nombre_negocio] enfrenten algo similar o si los cuellos de botella administrativos estén en otro punto. Desde Temikia automatizamos la gestión académica y de admisiones; ¿estarías abierto a ver un breve caso de uso?",
    "Qué tal [nombre_contacto]. En Temikia, analizando instituciones de [giro_negocio] en [ciudad], identificamos que muchas sufren al no tener un sistema de seguimiento para revivir el interés de prospectos que no se matricularon a la primera. Otros nos cuentan que el control y la comunicación con sus bases de datos de alumnos actuales consumen demasiado tiempo. Soy [nombre_ejecutivo]. Desconozco si en [nombre_negocio] sientan que se les enfrían prospectos por falta de seguimiento o si su verdadero desafío comercial esté en otro frente. Si te hace sentido, ¿lo revisamos juntos?",
    "Hola [nombre_contacto]. Soy [nombre_ejecutivo] de Temikia. Colaborando con directivos de [giro_negocio], noto que pierden muchas inscripciones porque no logran dar seguimiento a los prospectos que preguntaron pero no se matricularon de inmediato. Otros sufren para responder dudas sobre planes de estudio en horarios fuera de servicio. No sé si estos escenarios apliquen a [nombre_negocio] o si la pérdida de alumnos se deba a otra razón. Si te suena familiar, ¿te interesaría ver cómo automatizamos esa recuperación de alumnos?",
    "Qué tal, te escribe [nombre_ejecutivo]. Al conversar con institutos en [ciudad], me comparten que la validación de pagos, el envío de temarios y el agendamiento de exámenes de admisión satura a su equipo administrativo. En Temikia centralizamos todo esto mediante agentes conversacionales. Ignoro si tengan un reto similar en [nombre_negocio] hoy en día o si la carga operativa se concentre en otro proceso. Si es el caso, ¿están abiertos a explorar soluciones tecnológicas de este tipo?",
    "Buen día [nombre_contacto]. Mi nombre es [nombre_ejecutivo] y trabajo en Temikia. Muchos centros de [giro_negocio] nos dicen que su principal problema es captar la atención de prospectos internacionales por diferencias de horario, perdiendo la conversión del primer contacto. No sé si en [nombre_negocio] este sea un cuello de botella o si la fricción se encuentre en otro frente. Si algo de esto hace eco, ¿tiene sentido que revisemos brevemente nuestra atención multilingüe 24/7?",
    "Qué tal [nombre_contacto]. Te saluda [nombre_ejecutivo] de Temikia. Conversando con directivos del sector, me comentan que los procesos de reinscripción anual para alumnos actuales suelen saturar las líneas de atención por dudas repetitivas sobre costos, horarios y carga de documentos. Diseñamos asistentes virtuales que guían al estudiante paso a paso por [canal_preferido]. Ignoro si en [nombre_negocio] vivan este caos administrativo cada ciclo o si su reto principal hoy sea completamente distinto. ¿Te interesaría ver cómo agilizarlo?",
    "Hola [nombre_contacto]. Soy [nombre_ejecutivo]. Analizando el sector de [giro_negocio] en [ciudad], notamos que la coordinación de visitas guiadas o asistencias a sus \"Open House\" consume decenas de llamadas manuales de confirmación que los padres terminan ignorando. En Temikia automatizamos la reserva de recorridos y el envío de recordatorios interactivos por [canal_o_red_social]. No sé si en [nombre_negocio] este proceso les reste eficiencia operativa o si la complejidad real esté en otra área. ¿Tiene sentido que lo revisemos?",
    "Hola [nombre_contacto]. Mi nombre es [nombre_ejecutivo] de Temikia. Muchas instituciones nos comparten que el departamento de admisiones pierde días enteros persiguiendo a los aspirantes para que entreguen certificados o identificaciones faltantes, deteniendo el flujo de caja de las matrículas. Automatizamos embudos que detectan documentación incompleta y la solicitan de forma autónoma. Desconozco si en [nombre_negocio] tengan esta fuga de tiempo o si en mente tengan algún otro problema más urgente. ¿Te interesaría evaluar un caso de uso?",
    "Qué tal [nombre_contacto]. Te escribe [nombre_ejecutivo]. Al trabajar con centros de [giro_negocio], vemos que difundir convocatorias para talleres extraescolares o cursos de actualización de manera manual reduce drásticamente el porcentaje de alumnos inscritos. Conectamos bases de datos para segmentar y enviar invitaciones personalizadas masivas sin riesgo de baneo. No sé si hoy la comunicación de su oferta complementaria sea un reto en [nombre_negocio] o si la prioridad actual sea otra. ¿Estarían abiertos a conocer la estrategia?",
    "Buen día [nombre_contacto]. Soy [nombre_ejecutivo] de Temikia. Administradores de academias nos comentan que la validación manual de transferencias bancarias y la posterior liberación de accesos a plataformas educativas satura al área de finanzas. En Temikia sincronizamos pasarelas de pago y sistemas escolares en tiempo real. Ignoro si en [nombre_negocio] realicen esta conciliación a mano o si la fricción operativa se ubique en otro frente. Si hace eco contigo, ¿buscamos un espacio para platicarlo?"
  ],
  "Rehabilitación y Salud Mental": [
    "Hola [nombre_contacto]. Soy [nombre_ejecutivo]. Varios especialistas de [giro_negocio] me comparten que su mayor preocupación es dejar sin respuesta a pacientes que buscan ayuda fuera del horario de consulta, ya que en esta área la empatía y la contención inmediata son vitales. Otros batallan con el hueco que dejan las cancelaciones de última hora sin reprogramar. No sé si esto les resulte un problema operativo hoy en [nombre_negocio] o si su principal desafío vaya por otro lado. Si es así, desde Temikia implementamos asistentes empáticos 24/7; ¿tendrías un par de minutos para platicarlo?",
    "Buen día [nombre_contacto], mi nombre es [nombre_ejecutivo] de Temikia. Constantemente escucho a clínicas de [ciudad] decir que el tiempo que su personal invierte confirmando citas manualmente o dando indicaciones previas a los pacientes merma su productividad. Otros se frustran al no tener reportes claros de su ocupación y pacientes recurrentes. Desconozco si su desafío en [nombre_negocio] vaya por ahí o si la fricción operativa se encuentre en otro frente. Si es el caso, ¿les interesaría evaluar cómo automatizamos el agendamiento y confirmaciones directo a su calendario?",
    "Hola [nombre_contacto]. Hablando con especialistas de [giro_negocio], me comentan que a menudo los pacientes buscan apoyo emocional o información de crisis a deshoras, y no tener respuesta inmediata los desmotiva a agendar. Soy [nombre_ejecutivo] de Temikia; desarrollamos asistentes empáticos y éticos para primer contacto. No sé si este sea un reto para [nombre_negocio] o si tengan en mente algún otro problema más urgente a resolver. ¿Te haría sentido conocer más al respecto?",
    "Qué tal [nombre_contacto], soy [nombre_ejecutivo] de Temikia. Algunos terapeutas en [ciudad] nos dicen que el envío de cuestionarios previos, historiales y recordatorios manuales de sesiones les quita mucho tiempo de valor. Otros batallan para reprogramar a pacientes recurrentes. Ignoro si [nombre_negocio] enfrente estos procesos repetitivos o si el verdadero cuello de botella sea distinto. Si te resulta familiar, ¿te gustaría que te comparta algunas ideas de automatización de agendas?",
    "Buen día. Te habla [nombre_ejecutivo]. En el sector de [giro_negocio], una gran frustración suele ser la alta tasa de abandono de tratamientos por falta de un seguimiento cálido entre sesiones. Desde Temikia integramos flujos que nutren al paciente automáticamente por [canal_preferido]. Desconozco si esto sea una prioridad a resolver para ustedes o si su enfoque esté puesto en un frente distinto. ¿Tendrías 5 minutos para evaluar si esto les suma valor?",
    "Hola [nombre_contacto]. Te saluda [nombre_ejecutivo] de Temikia. Conversando con coordinadores de clínicas de [giro_negocio], mencionan que la gestión de talleres terapéuticos o sesiones grupales es compleja debido al control manual de aforos y cobros recurrentes. Desarrollamos sistemas que automatizan la inscripción, el pago seguro y el envío del enlace de acceso o ubicación de forma autónoma. Desconozco si en [nombre_negocio] ofrezcan estas modalidades o si el cuello de botella administrativo se encuentre en otra área. ¿Te interesaría conocer cómo lo resolvemos?",
    "Qué tal [nombre_contacto]. Soy [nombre_ejecutivo]. Varios especialistas en [ciudad] me comentan que el tiempo invertido en emitir facturas, recibos de honorarios para aseguradoras o constancias de asistencia drena sus horas de consulta. En Temikia enlazamos las solicitudes del paciente directo al sistema de facturación sin intervención del terapeuta. No sé si la carga administrativa sea un cuello de botella actual en [nombre_negocio] o si su principal reto operativo sea otro. ¿Tendrías 5 minutos para revisar un ejemplo?",
    "Hola [nombre_contacto]. Mi nombre es [nombre_ejecutivo] de Temikia. En el rubro de la salud mental, el primer contacto requiere un delicado triaje para asignar al especialista correcto según el motivo de consulta (ansiedad, terapia de pareja, infantil, etc.). Diseñamos asistentes conversacionales con IA que perfilan con total confidencialidad la necesidad del paciente antes de agendar. Ignoro si en [nombre_negocio] este filtro se haga hoy de manera manual o si la fricción con el paciente ocurra en otro frente. ¿Hará sentido explorar un demo?",
    "Qué tal [nombre_contacto]. Te escribe [nombre_ejecutivo]. Muchos centros de [giro_negocio] nos reportan que la tasa de inasistencia disminuye drásticamente cuando el recordatorio por [canal_preferido] permite al paciente cancelar o reprogramar con un solo clic, permitiendo liberar la hora para alguien en espera. Construimos agendas dinámicas autogestionables. No estoy seguro si en [nombre_negocio] cuenten con esta tecnología o si su principal desafío de ausentismo tenga otra causa. ¿Te interesaría evaluar su viabilidad?",
    "Buen día [nombre_contacto]. Soy [nombre_ejecutivo] de Temikia. Algunos terapeutas nos comentan que les gustaría automatizar el envío de escalas de evaluación o lecturas recomendadas entre sesiones, pero temen perder la calidez en el trato. Integramos flujos automatizados personalizados que respetan el tono profesional y empático de tu práctica a través de [canal_o_red_social]. Desconozco si la fidelización y seguimiento del paciente sea un área a mejorar hoy en [nombre_negocio] o si la prioridad actual esté en otro frente. ¿Platicamos?"
  ],
  "Restaurante": [
    "Qué tal [nombre_contacto]. Te escribe [nombre_ejecutivo]. Conversando con dueños de restaurantes, me cuentan que a menudo pierden reservas de mesas grandes porque el personal está a tope y no contesta [canal_preferido] a tiempo. Algunos más se desgastan respondiendo dudas sobre el menú, precios o la ubicación diez veces al día. En Temikia resolvemos justo eso integrando respuestas a preguntas frecuentes con IA. No sé si alguno de estos sea un cuello de botella para [nombre_negocio] o si la fricción operativa esté en otro frente. Si lo es, ¿te interesaría ver un demo rápido?",
    "Hola [nombre_contacto]. Mi nombre es [nombre_ejecutivo] de Temikia. En el rubro gastronómico, muchos gerentes me dicen que tienen miles de contactos de clientes pasados, pero no los aprovechan para enviarles campañas de reactivación y llenar el local en días de baja afluencia. Otros batallan para digitalizar su base de datos de comensales frecuentes. No sé si en [nombre_negocio] les pase igual o si su desafío principal hoy se encuentre en un frente distinto. Si les resulta familiar, ¿qué opinas de que revisemos algunas ideas de comunicación automática?",
    "Hola [nombre_contacto]. Soy [nombre_ejecutivo] de Temikia. Conversando con gerentes gastronómicos, me cuentan que los fines de semana colapsan atendiendo pedidos para llevar por [canal_o_red_social] y se cometen errores de captura. Otros me dicen que su reto es captar reservas para eventos grandes. No sé si en [nombre_negocio] vivan algo similar o si en mente tengan algún otro problema más urgente a resolver. Si es así, ¿estarías abierto a ver cómo un agente levanta pedidos directo a su sistema?",
    "Qué tal, te escribe [nombre_ejecutivo]. En Temikia notamos que muchos negocios de [giro_negocio] tienen bases de datos enormes de comensales, pero no las usan para enviar promociones personalizadas en días de baja afluencia. No estoy seguro de si la falta de reactivación de clientes sea un problema hoy en [nombre_negocio] o si su dolor de cabeza principal sea otro. Si te resuena, ¿tiene sentido que platiquemos sobre cómo automatizar campañas de fidelización en WhatsApp?",
    "Buen día [nombre_contacto]. Mi nombre es [nombre_ejecutivo] de Temikia. Varios dueños de restaurantes en [ciudad] se quejan de que no logran extraer ni centralizar las opiniones o datos de Google Maps para mejorar su servicio o buscar alianzas corporativas. Construimos sistemas de scraping que hacen esto en segundos. Ignoro si tengan esta necesidad en [nombre_negocio] o si la prioridad del restaurante esté en un frente distinto. Si hace eco contigo, ¿te enviamos un caso de uso?",
    "Hola [nombre_contacto]. Te escribe [nombre_ejecutivo] de Temikia. Hablando con gerentes de restaurantes en [ciudad], me comentan que las solicitudes de cotización para eventos privados o banquetes corporativos tardan días en responderse porque el menú y los precios varían constantemente, perdiendo cuentas de alto valor. En Temikia creamos cotizadores automatizados con IA que responden al instante por [canal_preferido]. Ignoro si en [nombre_negocio] este canal corporativo esté desatendido o si la fuga de banquetes se deba a otra causa. ¿Te gustaría ver cómo funciona?",
    "Qué tal [nombre_contacto]. Soy [nombre_ejecutivo]. En el sector gastronómico, las horas pico del fin de semana suelen ahuyentar a comensales debido a las largas filas de espera físicas. Implementamos sistemas de lista de espera digital donde un agente de IA le avisa automáticamente por WhatsApp cuando su mesa está lista. No sé si la pérdida de clientes en puerta sea un problema en [nombre_negocio] o si la fricción operativa se encuentre en otro frente. Si te resuena, ¿evaluamos un caso de éxito?",
    "Hola [nombre_contacto]. Mi nombre es [nombre_ejecutivo] de Temikia. Muchos operadores de [giro_negocio] nos dicen que capturar las preferencias de sus comensales (alergias, cumpleaños, mesa favorita) en una libreta no sirve para personalizar la experiencia a gran escala. Conectamos tus canales de reserva a un CRM gastronómico automático. Desconozco si en [nombre_negocio] busquen elevar el ticket promedio con esto o si en mente tengan un reto operativo más urgente. ¿Tiene sentido que lo hablemos?",
    "Qué tal [nombre_contacto]. Te saluda [nombre_ejecutivo]. Notamos que muchos restaurantes sufren por malas reseñas en plataformas digitales debido a malentendidos operativos que pudieron resolverse en el momento. Diseñamos encuestas de satisfacción automáticas post-consumo que alertan al gerente en tiempo real si un cliente califica negativo, permitiendo contener la crisis antes de que llegue a internet. Ignoro si en [nombre_negocio] controlen su reputación de esta forma o si los malentendidos con clientes ocurran en otro frente. ¿Te interesaría conocer la herramienta?",
    "Buen día [nombre_contacto]. Soy [nombre_ejecutivo] de Temikia. La rotación de personal y la coordinación de turnos de meseros y cocina suele quitarle horas de sueño a la administración. Desarrollamos flujos internos automatizados que notifican y confirman asistencias o cambios de rol del Staff directo a sus teléfonos. No sé si la comunicación interna sea un desafío operativo hoy en [nombre_negocio] o si la carga administrativa real esté en otra área. Si buscas reducir esa carga, ¿estás abierto a explorar una solución tecnológica?"
  ],
  "Salud y Clínica General": [
    "Buen día [nombre_contacto]. Soy [nombre_ejecutivo] de Temikia. Últimamente hablo con administradores de clínicas y me dicen que su recepción suele saturarse intentando agendar consultas y validar horarios permitidos simultáneamente. Otros lidian con la carga de enviar instrucciones previas o derivar a los médicos correctos. No sé si estos escenarios apliquen a la realidad de [nombre_negocio] o si la fuga de pacientes ocurra por un motivo distinto. Si te suena familiar la fuga de pacientes por falta de respuesta, ¿tendrías un momento para que te comparta cómo lo solucionamos?",
    "Hola [nombre_contacto]. Te saluda [nombre_ejecutivo]. Detectamos que en empresas de [giro_negocio], un dolor de cabeza frecuente es la falta de seguimiento a pacientes con tratamientos abiertos, o el tiempo perdido centralizando expedientes que llegan por diferentes vías. Construimos ecosistemas en Temikia para que esa información se organice integrándose con su base de datos o CRM en automático. Ignoro si este sea un problema en [nombre_negocio] o si la complejidad con los expedientes se encuentre en otro frente. Si hace sentido con su situación, ¿te enviamos un breve caso de éxito?",
    "Hola [nombre_contacto], soy [nombre_ejecutivo]. Directores de clínicas me comparten que su recepción pierde horas haciendo \"triaje\" básico: averiguando síntomas por chat para derivar al especialista correcto. En Temikia diseñamos asistentes que perfilan al paciente automáticamente antes de agendar. No sé si en [nombre_negocio] tengan este cuello de botella operativo o si su desafío principal hoy vaya por otro lado. Si es el caso, ¿te interesaría ver un demo rápido de cómo funciona?",
    "Qué tal [nombre_contacto]. Te saluda [nombre_ejecutivo] de Temikia. Hablando con administradores de [giro_negocio], su dolor de cabeza suele ser la entrega de resultados de laboratorio o notificaciones de rutinas que consumen mucho esfuerzo manual. Otros mencionan la falta de integración entre su software médico y WhatsApp. Desconozco si alguno sea su desafío actual o si en la mente tengan algún otro problema más urgente a resolver. ¿Estarías disponible la próxima semana para platicarlo?",
    "Buen día. Mi nombre es [nombre_ejecutivo]. Trabajando con centros de salud en [ciudad], notamos que muchos pacientes cancelan a último minuto y el espacio se pierde porque no hay un sistema automático para alertar a la lista de espera. Con Temikia, ese espacio se reasigna sin intervención humana. No sé si esto les resulte familiar en [nombre_negocio] o si la fricción con la agenda se ubique en otro frente. Si es así, ¿tendrías un par de minutos para revisar nuestra solución?",
    "Hola [nombre_contacto]. Te escribe [nombre_ejecutivo] de Temikia. Platicando con administradores de centros médicos, veo que coordinar consultas de telemedicina es un doble trabajo: validar el pago, generar el enlace de la videollamada y enviarlo manualmente con las indicaciones. En Temikia automatizamos este flujo completo enlazando su pasarela de pagos con su agenda digital. Desconozco si en [nombre_negocio] ofrezcan este servicio o si el cuello de botella real de la recepción esté en otra tarea. ¿Valdrá la pena revisarlo?",
    "Qué tal [nombre_contacto]. Soy [nombre_ejecutivo]. Al colaborar con empresas de [giro_negocio], notamos que los pacientes recurrentes (como aquellos con padecimientos crónicos o chequeos anuales) se pierden por falta de un sistema que les recuerde reactivar sus estudios periódicos. Programamos alertas automatizadas basadas en el historial clínico del paciente. No sé si la retención de pacientes sea un cuello de botella hoy en [nombre_negocio] o si su prioridad actual se encuentre en otro frente. ¿Te interesaría ver cómo automatizar estos recordatorios?",
    "Hola [nombre_contacto]. Mi nombre es [nombre_ejecutivo] de Temikia. Muchas clínicas que manejan convenios corporativos con empresas pierden mucho tiempo validando manualmente si los empleados vigentes entran en la cobertura de atención. Sincronizamos padrones de empresas aliadas con sistemas de recepción para una validación instantánea por [canal_preferido]. Ignoro si en [nombre_negocio] el sector B2B les genere fricción administrativa o si su principal reto operativo sea distinto. ¿Hará sentido explorar la solución?",
    "Qué tal [nombre_contacto]. Te saluda [nombre_ejecutivo]. Un dolor frecuente en clínicas en [ciudad] es que los pacientes saturan las líneas telefónicas solo para preguntar si su receta médica ya está lista para surtirse o si sus análisis de laboratorio fueron liberados. Automatizamos consultas de estatus integradas a su software médico vía [canal_o_red_social]. No sé si en [nombre_negocio] vivan esta saturación en recepción o si los canales de consulta sufran de otro problema. ¿Te gustaría conocer el demo?",
    "Buen día [nombre_contacto]. Soy [nombre_ejecutivo] de Temikia. La experiencia post-operatoria o de alta médica suele descuidarse por falta de tiempo del personal, omitiendo encuestas de seguimiento de calidad o control de síntomas básicos. Diseñamos flujos conversacionales automatizados que monitorean al paciente en su recuperación y alertan al médico si hay anomalías. Desconozco si en [nombre_negocio] prioricen automatizar este estándar de calidad o si tengan un desafío operativo más crítico. ¿Tendrías 5 minutos para evaluarlo?"
  ],
  "Servicios de imagen y cuidado personal": [
    "Hola [nombre_contacto]. Habla [nombre_ejecutivo]. Muchos dueños de salones y spas en [ciudad] me confiesan que les frustra tener que interrumpir el servicio de un cliente para contestar [canal_o_red_social] y tratar de cuadrar una cita. Otros me dicen que su problema no es ese, sino los \"no-shows\" (inasistencias) que les dejan huecos sin rentabilidad. Desde Temikia solucionamos ambos retos integrando calendarios inteligentes. No sé si [nombre_negocio] esté pasando por algo de esto o si la fricción con la agenda se encuentre en otro frente, ¿tienen algún cuello de botella con la gestión de su agenda?",
    "Qué tal [nombre_contacto], soy [nombre_ejecutivo] de Temikia. Conversando con especialistas de [giro_negocio], me comentan que batallan mucho para recuperar a clientes que vinieron una vez a un servicio y no volvieron por falta de seguimiento. Otros sufren para dar respuesta inmediata a las dudas sobre precios o políticas del negocio. No sé si alguno de estos escenarios sea su caso en [nombre_negocio] o si su desafío principal actual sea completamente distinto. Si algo de esto te resuena, ¿te gustaría evaluar cómo un agente de IA puede automatizar su reactivación por WhatsApp?",
    "Hola [nombre_contacto]. Soy [nombre_ejecutivo] de Temikia. En el rubro de [giro_negocio], muchos dueños nos cuentan que pierden la oportunidad de vender productos adicionales (como tratamientos o cremas) porque olvidan ofrecerlos después de la cita. Implementamos seguimientos de venta cruzada automáticos por [canal_preferido]. Ignoro si hoy estén buscando subir su ticket promedio en [nombre_negocio] o si su prioridad comercial esté en otro frente. ¿Te hace sentido que lo hablemos?",
    "Qué tal, te escribe [nombre_ejecutivo]. Varios especialistas de cuidado personal me dicen que las dudas repetitivas sobre cuánto dura un servicio o qué preparación previa requiere les quitan horas de trabajo productivo. En Temikia delegamos esto a un agente IA empático. No sé si en [nombre_negocio] la carga operativa en [canal_o_red_social] sea un problema o si en mente tengan un reto más urgente a resolver. Si te suena familiar, ¿te comparto cómo lo estamos resolviendo?",
    "Buen día [nombre_contacto], soy [nombre_ejecutivo]. Conversando con clínicas estéticas y salones de [ciudad], me comparten que no logran fidelizar clientes para que vuelvan recurrentemente por falta de recordatorios sistematizados. Desde Temikia creamos flujos de reactivación automáticos. Desconozco si esta fuga de ingresos les pase en [nombre_negocio] o si la desconexión con los clientes ocurra en otro punto. Si algo de esto resuena, ¿están abiertos a explorar una herramienta para evitarlo?",
    "Hola [nombre_contacto]. Te habla [nombre_ejecutivo] de Temikia. Muchos centros estéticos y spas en [ciudad] nos comparten que venden paquetes de varias sesiones (como depilación o masajes), pero el cliente olvida agendar sus citas subsecuentes, retrasando los resultados y la ocupación proyectada de la clínica. Automatizamos el seguimiento de saldos de paquetes por [canal_preferido] para forzar el agendamiento mensual. Ignoro si en [nombre_negocio] sufran este rezago de citas o si el verdadero cuello de botella operativo esté en otro lado. ¿Te interesaría ver cómo lo resolvemos?",
    "Qué tal [nombre_contacto]. Soy [nombre_ejecutivo]. Conversando con salones especializados en eventos masivos (como bodas o graduaciones), me comentan lo caótico que es cotizar y coordinar agendas para grupos grandes que requieren múltiples servicios simultáneos. En Temikia estructuramos flujos de reserva grupal que asignan estilistas en automático según disponibilidad. No sé si este canal de eventos sea un dolor de cabeza en [nombre_negocio] o si la fricción logística se encuentre en otro frente. Si te resuena, ¿revisamos ideas?",
    "Hola [nombre_contacto]. Mi nombre es [nombre_ejecutivo] de Temikia. En salones que operan bajo el modelo de renta de cabinas o porcentaje por estilista, conciliar las comisiones y los servicios atendidos por cada colaborador al final de la semana consume horas de Excel. Conectamos los registros del asistente conversacional directo a tableros financieros automatizados. Desconozco si en [nombre_negocio] este control interno sea lento o si la complejidad real de la operación radique en otra parte. ¿Te haría sentido optimizarlo?",
    "Qué tal [nombre_contacto]. Te escribe [nombre_ejecutivo]. Noto que muchos negocios de [giro_negocio] lanzan promociones o tarjetas de regalo para fechas especiales, pero el proceso de validación y canje en sucursal genera cuellos de botella por falta de un sistema centralizado. Creamos cupones automatizados rastreables por WhatsApp. No estoy seguro si en [nombre_negocio] utilicen estas estrategias o si el desorden administrativo provenga de otro frente. ¿Estarían abiertos a ver una solución digital?",
    "Buen día [nombre_contacto]. Soy [nombre_ejecutivo] de Temikia. Algunos tratamientos invasivos o avanzados (como microblading o peelings químicos) requieren cuidados rigurosos las primeras 72 horas. Enviar estas instrucciones a mano a cada cliente es inviable para tu equipo. Diseñamos flujos que, al marcar la cita como terminada, envían recomendaciones personalizadas e imágenes de cuidado de forma autónoma. Ignoro si en [nombre_negocio] busquen automatizar esta atención post-servicio o si tengan alguna otra prioridad más urgente. ¿Te interesa?"
  ],
  "Servicios dentales": [
    "Hola [nombre_contacto]. Soy [nombre_ejecutivo] de Temikia. Los directores de clínicas dentales con los que converso suelen mencionar que su principal fuga de dinero son las inasistencias por falta de confirmación o recordatorios previos efectivos. Otros me dicen que el problema está en no poder dar seguimiento sistemático a presupuestos de tratamientos de alto valor. No sé si en [nombre_negocio] esto les resulte familiar o si la fricción se encuentre en otro frente. Si es así, ¿estarías abierto a escuchar cómo automatizamos este proceso desde el primer contacto?",
    "Buen día [nombre_contacto]. Te escribe [nombre_ejecutivo]. Muchas clínicas de [giro_negocio] invierten en captación en [canal_o_red_social], pero me comparten que pierden a esos prospectos porque su equipo tarda mucho en responder y precotizar la primera valoración. En Temikia conectamos agentes que califican leads al instante y validan cupos disponibles. Ignoro si tengan este desafío de conversión en [nombre_negocio] o si el cuello de botella real esté en otro proceso, ¿tiene sentido que veamos brevemente si nuestra integración les suma valor?",
    "Hola [nombre_contacto], te habla [nombre_ejecutivo]. Colaborando con clínicas dentales, escucho a menudo que el mayor reto es dar seguimiento a presupuestos de alto valor (como ortodoncia o implantes) a lo largo de los meses sin parecer desesperados. En Temikia diseñamos embudos de nutrición a la medida. No sé si [nombre_negocio] enfrente este desafío de conversión o si su reto principal hoy vaya por otro lado. Si es tu caso, ¿tiene sentido que veamos brevemente si podemos sumarles valor?",
    "Qué tal [nombre_contacto]. Soy [nombre_ejecutivo] de Temikia. Algunos consultorios de [giro_negocio] invierten en publicidad en redes, pero los leads se enfrían porque no se les precalifica al instante para ver si son viables para un tratamiento. Conectamos asistentes que responden y filtran 24/7. Ignoro si este escenario operativo sea familiar en [nombre_negocio] o si tengan en mente un problema más urgente a resolver. Si hace eco contigo, ¿te enviamos un breve caso de éxito?",
    "Buen día. Mi nombre es [nombre_ejecutivo]. Muchos odontólogos nos comentan que programar las limpiezas semestrales recurrentes depende de la memoria humana, perdiendo ingresos predecibles por falta de seguimiento. En Temikia automatizamos estos recordatorios conectando su base de datos a WhatsApp. No estoy seguro si en [nombre_negocio] tengan este problema resuelto o si la fuga de ingresos predecibles se deba a otra causa. Si no, ¿tendrías 5 minutos para platicar de nuestra solución?",
    "Hola [nombre_contacto]. Te saluda [nombre_ejecutivo] de Temikia. Al platicar con directores de clínicas dentales, descubro que un gran dolor de cabeza es agendar citas de tratamientos complejos (como coronas o prótesis) antes de confirmar que el laboratorio externo entregó la pieza a tiempo, provocando cancelaciones penosas con el paciente. Sincronizamos el estatus de tus proveedores de laboratorio con tu agenda de WhatsApp. Desconozco si en [nombre_negocio] sufran este desajuste logístico o si la complicación con el laboratorio esté en otro frente. ¿Te gustaría evaluar cómo solucionarlo?",
    "Qué tal [nombre_contacto]. Soy [nombre_ejecutivo]. Muchas clínicas de [giro_negocio] en [ciudad] tienen problemas para dar seguimiento a las pre-autorizaciones o aprobaciones de presupuestos con aseguradoras, dejando tratamientos pausados por semanas. En Temikia creamos alertas automatizadas que notifican tanto al paciente como al personal administrativo los estatus pendientes del seguro. No sé si la burocracia de los seguros afecte la conversión en [nombre_negocio] o si la prioridad actual de la clínica sea otra. ¿Hará sentido revisarlo?",
    "Hola [nombre_contacto]. Mi nombre es [nombre_ejecutivo] de Temikia. Un reto común en consultorios odontológicos familiares es optimizar la agenda agrupando citas de miembros de la misma familia el mismo día (back-to-back), evitando huecos muertos. Automatizamos motores de reserva inteligentes que sugerensespacio contiguos para grupos familiares por [canal_preferido]. Ignoro si en [nombre_negocio] organicen sus jornadas de esta forma o si el problema de la agenda muerta provenga de otro lado. ¿Te interesaría conocer un demo?",
    "Qué tal [nombre_contacto]. Te escribe [nombre_ejecutivo]. En el sector dental, las urgencias por dolor agudo ocurren a cualquier hora y perder esa llamada o mensaje significa que el paciente irá con la competencia. Desarrollamos flujos de triaje de emergencias con IA que determinan la gravedad y enlazan al dentista de guardia en automático. No estoy seguro si en [nombre_negocio] cuenten con un filtro de urgencias 24/7 o si la pérdida de pacientes ocurra por un motivo distinto. ¿Valdría la pena conocerlo?",
    "Buen día [nombre_contacto]. Soy [nombre_ejecutivo] de Temikia. En clínicas que ofrecen ortodoncia con alineadores invisibles, monitorear que el paciente cambie de fase o asista a sus revisiones fotográficas periódicas requiere un seguimiento manual exhaustivo. Automatizamos embudos de cumplimiento de tratamiento vía [canal_o_red_social]. Desconozco si en [nombre_negocio] busquen escalar esto o si la fricción operativa se encuentre en otro frente. ¿Hablamos?"
  ],
  "Otros (Genérico)": [
    "Qué tal [nombre_contacto]. Mi nombre es [nombre_ejecutivo] de Temikia. Hablando con algunos directivos comerciales, me comentan que uno de sus mayores dolores de cabeza es que su equipo pierde demasiadas horas buscando y filtrando bases de datos de prospectos en lugar de estar cerrando ventas. Otros me dicen que la fuga de leads ocurre por demoras al enviar cotizaciones formales. No sé si en [nombre_negocio] se identifiquen con alguno de estos problemas o si su desafío principal hoy sea distinto. Si es el caso, ¿tendrías 5 minutos para que platiquemos de cómo la IA lo resuelve mediante scraping y CRM automatizado?",
    "Hola [nombre_contacto]. Soy [nombre_ejecutivo] de Temikia. Al conversar con gerentes en [ciudad], noto que una preocupación común es la falta de trazabilidad: tienen ventas y prospectos, pero los datos están tan dispersos que no pueden generar dashboards ejecutivos ni medir tiempos de respuesta sin un gran trabajo manual. Otros sienten que sus sistemas y bases de datos no se comunican entre sí. No sé si alguno de estos escenarios de desconexión te resulte familiar en [nombre_negocio] o si la fricción se encuentre en otro frente. ¿Te haría sentido revisar cómo orquestamos y conectamos todo esto vía automatizaciones?",
    "Hola [nombre_contacto]. Soy [nombre_ejecutivo] de Temikia. Líderes del sector me dicen constantemente que su equipo comercial gasta más tiempo buscando datos y haciendo prospección manual en directorios que realmente cerrando ventas. Otros sufren por bases de datos desactualizadas. No sé si alguno de estos sea un cuello de botella en [nombre_negocio] o si tengan en mente algún otro problema más urgente a resolver. Si te resulta familiar, ¿te interesaría ver cómo automatizamos la captación de prospectos?",
    "Buen día [nombre_contacto]. Mi nombre es [nombre_ejecutivo] de Temikia. Un problema que escucho mucho en empresas de su sector es la desconexión: tienen un software interno, cotizadores y WhatsApp, pero nada se comunica entre sí, requiriendo doble captura manual. Construimos ecosistemas que sincronizan todo en automático. Desconozco si esta carga administrativa exista en [nombre_negocio] o si la complejidad real de sus sistemas esté en otro frente. Si te resuena, ¿estarías disponible para que te muestre un ejemplo sin compromiso?",
    "Hola [nombre_contacto]. Te saluda [nombre_ejecutivo] de Temikia. Hablando con directores operativos, me comentan que un gran reto es la velocidad de respuesta con los prospectos: si tardan más de 5 minutos en contestar un mensaje en [canal_o_red_social], la probabilidad de cierre cae un 80% porque el cliente ya le escribió a la competencia. En Temikia eliminamos esa ventana de abandono con respuestas e integraciones inmediatas operadas por IA. Ignoro si en [nombre_negocio] tengan medida su velocidad de respuesta o si el verdadero cuello de botella comercial esté en otra área. ¿Hará sentido revisar un ejemplo rápido?",
    "Qué tal [nombre_contacto]. Soy [nombre_ejecutivo]. Analizando empresas en [ciudad], noto que un dolor administrativo constante es el \"re-trabajo\": capturar manualmente los datos que un cliente dejó en un formulario web hacia el CRM, y luego volverlos a escribir para generar la orden en el sistema interno o de facturación. Construimos flujos de integración que unifican tus plataformas para que la información viaje sola. No sé si la duplicidad de tareas sea una carga hoy en [nombre_negocio] o si su prioridad actual se ubique en otro frente. ¿Te interesaría ver cómo automatizarlo?",
    "Hola [nombre_contacto]. Mi nombre es [nombre_ejecutivo] de Temikia. Al conversar con líderes comerciales, me comparten que el proceso de \"Onboarding\" o bienvenida de un nuevo cliente (recabar firmas de contratos, solicitar identificaciones, enviar correos de inicio) se vuelve lento y traba la operación inicial. En Temikia automatizamos la entrega y recolección de requisitos de apertura mediante flujos dinámicos en [canal_preferido]. Desconozco si en [nombre_negocio] este arranque de proyecto sea totalmente manual o si en mente tengan un reto operativo más crítico. ¿Valdrá la pena conocer una alternativa eficiente?",
    "Qué tal [nombre_contacto]. Te escribe [nombre_ejecutivo]. Un problema frecuente en equipos de ventas en crecimiento es la asignación equitativa y oportuna de los prospectos que llegan por campañas digitales. Cuando la distribución de leads es manual, hay retrasos y disputas internas. Diseñamos sistemas de enrutamiento automatizado (Round Robin) que asignan el contacto al vendedor disponible en segundos según su carga de trabajo. Ignoro si la asignación de leads sea un desafío actual en [nombre_negocio] o si la fricción del equipo de ventas se encuentre en otro frente. ¿Estarían abiertos a ver cómo lo resolvemos?",
    "Buen día [nombre_contacto]. Soy [nombre_ejecutivo] de Temikia. Muchas empresas medianas nos confiesan que sus equipos de atención al cliente consumen más del 60% de su jornada respondiendo consultas de soporte sumamente repetitivas (estatus de pedidos, horarios, coberturas, políticas de devolución), descuidando casos complejos o de retención de valor. Delegamos estas FAQ a agentes inteligentes conversacionales integrados a tus bases de datos. Desconozco si en [nombre_negocio] la carga de soporte esté saturando a tu personal o si el problema de retención responda a otro factor. ¿Te interesaría evaluar un demo sin compromiso?"
  ]
};

// Map lead's business category (giro_nombre / estilo) to the standard templates categories
const getGiroCategory = (giroName, estiloName) => {
  const g = (giroName || estiloName || '').toLowerCase().trim();
  if (!g) return "Otros (Genérico)";

  if (g.includes('arte corporal') || g.includes('tatuaje') || g.includes('tattoo') || g.includes('perforacion') || g.includes('piercing')) {
    return "Arte corporal y perforaciones";
  }
  if (g.includes('arte') || g.includes('galeria') || g.includes('artista') || g.includes('museo') || g.includes('pintura') || g.includes('escultura')) {
    return "Arte";
  }
  if (g.includes('educa') || g.includes('escuela') || g.includes('colegio') || g.includes('universi') || g.includes('academia') || g.includes('curso') || g.includes('instituto') || g.includes('clases')) {
    return "Educación";
  }
  if (g.includes('psico') || g.includes('salud mental') || g.includes('terapia') || g.includes('rehab') || g.includes('psiquia') || g.includes('terapeuta')) {
    return "Rehabilitación y Salud Mental";
  }
  if (g.includes('restauran') || g.includes('comida') || g.includes('gastron') || g.includes('cafe') || g.includes('bar') || g.includes('cocina') || g.includes('gourmet') || g.includes('taqueria') || g.includes('bistro')) {
    return "Restaurante";
  }
  if (g.includes('dental') || g.includes('dentista') || g.includes('odonto') || g.includes('ortodoncia')) {
    return "Servicios dentales";
  }
  if (g.includes('estetic') || g.includes('salon') || g.includes('spa') || g.includes('barber') || g.includes('peluquer') || g.includes('imagen') || g.includes('cuidado personal') || g.includes('manicur') || g.includes('belleza')) {
    return "Servicios de imagen y cuidado personal";
  }
  if (g.includes('salud') || g.includes('clinica') || g.includes('hospital') || g.includes('consultorio') || g.includes('medico') || g.includes('medicina') || g.includes('doctor') || g.includes('pediatra') || g.includes('ginec')) {
    return "Salud y Clínica General";
  }

  return "Otros (Genérico)";
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
            const truncatedUrl = url.length > 55 ? `${url.substring(0, 52)}...` : url;
            return `• <a href="${url}" target="_blank" style="color:#0ea5e9; text-decoration:underline;">${domain}</a><span class="text-slate-400"> (${truncatedUrl})</span>`;
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
    const giroCategory = getGiroCategory(lead?.giro_nombre, form.estilo);
    const templatesForGiro = WHATSAPP_TEMPLATES[giroCategory] || WHATSAPP_TEMPLATES["Otros (Genérico)"];
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

  const isEditable = !lead || !lead.miembro_id || lead.miembro_id === '' || (user && lead.miembro_id === user.miembroId);
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
          <fieldset disabled={!isEditable} style={{ border: 'none', padding: 0, margin: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: 'transparent' }}>
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
                <select name="estatus" value={form.estatus} onChange={handleChange} className="property-input">
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
                <select name="prioridad" value={form.prioridad} onChange={handleChange} className="property-input">
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
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
                    <span style={{ fontSize: '9px', color: 'var(--color-success)', fontWeight: '600', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)' }}>
                      Reemplazo Inteligente
                    </span>
                  </div>
                  
                  {(() => {
                    const templates = WHATSAPP_TEMPLATES[getGiroCategory(lead?.giro_nombre, form.estilo)] || WHATSAPP_TEMPLATES["Otros (Genérico)"];
                    const totalTemplates = templates.length;
                    const handlePrev = () => {
                      setSelectedTemplateIndex((prev) => (prev - 1 + totalTemplates) % totalTemplates);
                    };
                    const handleNext = () => {
                      setSelectedTemplateIndex((prev) => (prev + 1) % totalTemplates);
                    };
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={handlePrev}
                          className="btn btn-secondary"
                          style={{
                            padding: '6px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          title="Mensaje Anterior"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        
                        <div style={{
                          flex: 1,
                          textAlign: 'center',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(15, 23, 42, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontWeight: '500',
                          minHeight: '34px'
                        }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '12.5px', fontWeight: '600' }}>
                            #{selectedTemplateIndex + 1}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal', opacity: 0.7 }}>
                            de {totalTemplates}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleNext}
                          className="btn btn-secondary"
                          style={{
                            padding: '6px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          title="Siguiente Mensaje"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    );
                  })()}

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
                      (WHATSAPP_TEMPLATES[getGiroCategory(lead?.giro_nombre, form.estilo)] || WHATSAPP_TEMPLATES["Otros (Genérico)"])[selectedTemplateIndex] || ''
                    )}
                  </div>
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
        </fieldset>
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
            disabled={isSaving || isDeleting || !isEditable}
            style={{ 
              justifySelf: 'end',
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              transition: 'all 0.3s ease',
              opacity: isEditable ? 1 : 0.5,
              cursor: isEditable ? 'pointer' : 'not-allowed',
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
