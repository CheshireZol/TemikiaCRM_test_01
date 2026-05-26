import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  UserCheck, 
  MapPin, 
  Cpu, 
  Globe, 
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Mail,
  Phone
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  parseStringArray, 
  parseJsonbField, 
  calculateAILeadScore,
  generateAISalesStrategy,
  generateWhatsappMessage,
  generateEmailMessage,
  generateCallMessage,
  cleanPhoneForWhatsapp
} from '../utils.js';

const AIAssistant = ({ user, triggerRefresh, onLeadClick }) => {
  const [highPriorityLeads, setHighPriorityLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [loadingLeads, setLoadingLeads] = useState(true);

  // AI Generated output states and active channel
  const [activeChannel, setActiveChannel] = useState('whatsapp'); // 'whatsapp' | 'correo' | 'telefono'
  const [salesStrategy, setSalesStrategy] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSavingStrategy, setIsSavingStrategy] = useState(false);
  const [outreachError, setOutreachError] = useState(''); // Error state instead of alerts

  // Fetch top high-priority leads to suggest for IA engagement
  useEffect(() => {
    const fetchHighPriority = async () => {
      try {
        setLoadingLeads(true);
        const queryParams = new URLSearchParams({
          prioridad: 'alta',
          limit: 100
        });

        if (user && user.miembroId) {
          queryParams.append('miembro_id', user.miembroId);
        }

        const res = await fetch(`/api/prospectos?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setHighPriorityLeads(data.rows);
          
          // Select first high-priority lead by default
          if (data.rows.length > 0) {
            handleSelectLead(data.rows[0]);
          } else {
            setSelectedLead(null); // Clear selected lead if no matching leads
          }
        }
      } catch (err) {
        console.error('Error fetching high-priority leads:', err);
      } finally {
        setLoadingLeads(false);
      }
    };
    fetchHighPriority();
  }, [user, triggerRefresh]);

  const handleSelectLead = (lead) => {
    setSelectedLead(lead);
    setOutreachError(''); // Clear error when switching leads
    
    // Auto-select preferred channel
    const pref = lead.canal_preferido || 'whatsapp';
    setActiveChannel(pref);
    
    const strategy = generateAISalesStrategy(lead);
    setSalesStrategy(strategy);
    setIsCopied(false);
  };

  const getActiveScript = () => {
    if (!selectedLead) return '';
    if (activeChannel === 'whatsapp') {
      return generateWhatsappMessage(selectedLead);
    } else if (activeChannel === 'correo') {
      return generateEmailMessage(selectedLead);
    } else {
      return generateCallMessage(selectedLead);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(getActiveScript());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendWhatsapp = () => {
    if (!selectedLead) return;
    setOutreachError('');
    const phoneList = parseStringArray(selectedLead.whatsapp).length > 0 
      ? selectedLead.whatsapp 
      : selectedLead.telefono;
      
    const cleanPhone = cleanPhoneForWhatsapp(phoneList);
    if (!cleanPhone) {
      setOutreachError('Error: Este prospecto no posee números de teléfono o WhatsApp registrados.');
      return;
    }

    const encodedMessage = encodeURIComponent(getActiveScript());
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(waUrl, '_blank');
  };

  const handleSendEmail = () => {
    if (!selectedLead) return;
    setOutreachError('');
    const emailList = parseStringArray(selectedLead.correo);
    const firstEmail = emailList.length > 0 ? emailList[0] : '';
    if (!firstEmail) {
      setOutreachError('Error: Este prospecto no posee un correo electrónico registrado.');
      return;
    }

    const subject = encodeURIComponent(`Propuesta de Automatización IA para ${selectedLead.nombre} - Temikia Agency`);
    const body = encodeURIComponent(getActiveScript());
    const mailtoUrl = `mailto:${firstEmail}?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_self');
  };

  const handlePhoneCall = () => {
    if (!selectedLead) return;
    setOutreachError('');
    const phoneList = parseStringArray(selectedLead.telefono);
    const firstPhone = phoneList.length > 0 ? phoneList[0] : '';
    if (!firstPhone) {
      setOutreachError('Error: Este prospecto no posee números de teléfono registrados.');
      return;
    }

    const cleanPhone = firstPhone.replace(/[^\d+]/g, '');
    window.open(`tel:${cleanPhone}`, '_self');
  };

  const handleSaveStrategyToDb = async () => {
    if (!selectedLead || !salesStrategy) return;

    try {
      setIsSavingStrategy(true);
      
      const formattedFicha = `===========================================
PROPUESTA COMERCIAL - TEMIKIA IA AGENCY
===========================================
Giro Comercial Categorizado: ${salesStrategy.giroCategorizado}
Fecha de Análisis: Nueva Generación IA

ELÉVATOR PITCH SUGERIDO:
"${salesStrategy.pitchElevator}"

ESTRATEGIAS CLAVE DE AUTOMATIZACIÓN DE VENTAS:
${salesStrategy.estrategiasIA.map((s, i) => `${i + 1}. ${s}`).join('\n')}

TECNOLOGÍAS / INTEGRACIONES RECOMENDADAS:
${salesStrategy.integracionesRecomendadas.map(t => `- ${t}`).join('\n')}

ESTADO DEL LEAD SCORE: ${selectedLead.lead_score}/100`;

      // Update in DB via PUT
      const res = await fetch(`/api/prospectos/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: selectedLead.nombre,
          prioridad: selectedLead.prioridad,
          estatus: selectedLead.estatus,
          correo: selectedLead.correo,
          telefono: selectedLead.telefono,
          whatsapp: selectedLead.whatsapp,
          rrss: selectedLead.rrss,
          lead_score: selectedLead.lead_score,
          ficha_prospeccion: formattedFicha
        })
      });

      if (!res.ok) throw new Error('Error al actualizar ficha');
      
      alert('¡Estrategia IA Guardada! La propuesta comercial se ha guardado exitosamente en el campo Ficha de Prospección de este cliente en PostgreSQL.');
    } catch (err) {
      console.error(err);
      alert('Error al guardar la propuesta en la base de datos.');
    } finally {
      setIsSavingStrategy(false);
    }
  };

  return (
    <div className="ai-layout-grid">
      {/* Col 1: AI Workspace Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Active Workspace summary */}
        {selectedLead ? (
          <div className="card ai-card-glow" style={{ minHeight: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span className="badge" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-ai)', fontSize: '11px', marginBottom: '8px' }}>
                  PROSPECTO BAJO ANÁLISIS IA
                </span>
                <h3 className="drawer-title" style={{ fontSize: '20px' }}>{selectedLead.nombre}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span>Giro: <strong>{selectedLead.estilo || 'No clasificado'}</strong></span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <MapPin size={12} />
                    {selectedLead.ciudad}, {selectedLead.pais}
                  </span>
                </div>
              </div>

              <div style={{ 
                backgroundColor: 'var(--bg-main)', 
                padding: '12px 20px', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--border-color)',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Score IA</span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-ai)' }}>{selectedLead.lead_score}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button className="btn btn-secondary" onClick={() => onLeadClick(selectedLead.id)}>
                Ver Ficha Completa
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '120px' }}>
            <p style={{ color: 'var(--text-muted)' }}>Seleccione un lead para iniciar el análisis inteligente.</p>
          </div>
        )}

        {/* AI Tool 1: Sales Pitch / Multi-channel Outreach */}
        {selectedLead && (
          <div className="card">
            <div className="ai-tool-header" style={{ marginBottom: '12px' }}>
              <div className="ai-tool-title-group">
                <MessageSquare size={18} style={{ color: 'var(--color-ai)' }} />
                <span className="ai-tool-title">Primer Abordaje Comercial IA</span>
              </div>
              <span className="ai-tool-description">Seleccione el canal para generar el script de comunicación adaptado</span>
            </div>

            {/* Channels tab bar */}
            <div style={{ 
              display: 'flex', 
              gap: '6px', 
              marginBottom: '16px', 
              borderBottom: '1px solid var(--border-color)', 
              paddingBottom: '12px',
              flexWrap: 'wrap'
            }}>
              <button 
                type="button"
                className={`btn ${activeChannel === 'whatsapp' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setActiveChannel('whatsapp'); setIsCopied(false); setOutreachError(''); }}
                style={{ fontSize: '11.5px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Send size={12} />
                <span>WhatsApp</span>
              </button>
              <button 
                type="button"
                className={`btn ${activeChannel === 'correo' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setActiveChannel('correo'); setIsCopied(false); setOutreachError(''); }}
                style={{ fontSize: '11.5px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Mail size={12} />
                <span>Correo (Email)</span>
              </button>
              <button 
                type="button"
                className={`btn ${activeChannel === 'telefono' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setActiveChannel('telefono'); setIsCopied(false); setOutreachError(''); }}
                style={{ fontSize: '11.5px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Phone size={12} />
                <span>Guion de Llamada</span>
              </button>
            </div>

            <div className="ai-output-box" style={{ minHeight: '180px', whiteSpace: 'pre-line' }}>
              {getActiveScript()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={handleCopyText}>
                {isCopied ? <Check size={16} style={{ color: 'var(--color-success)' }} /> : <Copy size={16} />}
                <span>{isCopied ? '¡Copiado!' : 'Copiar Texto'}</span>
              </button>

              {activeChannel === 'whatsapp' && (
                <button className="btn btn-ai" onClick={handleSendWhatsapp}>
                  <Send size={16} />
                  <span>Enviar por WhatsApp</span>
                </button>
              )}

              {activeChannel === 'correo' && (
                <button className="btn btn-ai" onClick={handleSendEmail} style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', borderColor: '#2563EB' }}>
                  <Mail size={16} />
                  <span>Enviar por Correo</span>
                </button>
              )}

              {activeChannel === 'telefono' && (
                <button className="btn btn-ai" onClick={handlePhoneCall} style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', borderColor: '#059669' }}>
                  <Phone size={16} />
                  <span>Llamar por Teléfono</span>
                </button>
              )}
            </div>

            {outreachError && (
              <div style={{ 
                color: 'var(--color-danger)', 
                fontSize: '12.5px', 
                fontWeight: 600, 
                marginTop: '12px',
                textAlign: 'right'
              }}>
                {outreachError}
              </div>
            )}
          </div>
        )}

        {/* AI Tool 2: Sales Strategy (Ficha de Prospección) */}
        {selectedLead && salesStrategy && (
          <div className="card">
            <div className="ai-tool-header">
              <div className="ai-tool-title-group">
                <Sparkles size={18} style={{ color: 'var(--color-ai)' }} />
                <span className="ai-tool-title">Propuesta e Integraciones B2B Recomendadas</span>
              </div>
              <span className="ai-tool-description">Análisis técnico de integración por giro comercial</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Category categorization */}
              <div style={{ fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Categoría de Negocio IA: </span>
                <strong style={{ color: 'var(--color-primary)' }}>{salesStrategy.giroCategorizado}</strong>
              </div>

              {/* Pitch */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Propuesta de Valor Inicial</span>
                <p style={{ fontSize: '13px', fontStyle: 'italic', backgroundColor: 'var(--bg-main)', padding: '12px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-ai)' }}>
                  "{salesStrategy.pitchElevator}"
                </p>
              </div>

              {/* Strategies list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Estrategias Clave</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {salesStrategy.estrategiasIA.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', fontSize: '13px', alignItems: 'flex-start' }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: 'var(--radius-full)', backgroundColor: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-ai)', fontSize: '10px', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>
                        {idx + 1}
                      </span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technologies */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Integraciones Tecnológicas Recomendadas</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {salesStrategy.integracionesRecomendadas.map((tech) => (
                    <span key={tech} className="badge" style={{ backgroundColor: 'rgba(37, 99, 235, 0.08)', color: 'var(--color-primary)', fontSize: '11px', borderRadius: 'var(--radius-sm)' }}>
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveStrategyToDb}
                disabled={isSavingStrategy}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Cpu size={16} />
                <span>{isSavingStrategy ? 'Guardando en DB...' : 'Guardar Propuesta en Ficha del Cliente'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Col 2: High Priority leads suggestions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="card" style={{ minHeight: 'auto' }}>
          <div>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={16} style={{ color: 'var(--color-danger)' }} />
              <span>Prioritarios Pendientes</span>
            </h3>
            <p className="card-subtitle">Leads calificados como "alta prioridad" que no han concretado cierre.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
            {loadingLeads ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cargando sugerencias...</p>
            ) : highPriorityLeads.length > 0 ? (
              highPriorityLeads.map(lead => (
                <div 
                  key={lead.id} 
                  onClick={() => handleSelectLead(lead)}
                  className={`activity-item ${selectedLead && selectedLead.id === lead.id ? 'active' : ''}`}
                  style={{ 
                    cursor: 'pointer',
                    backgroundColor: selectedLead && selectedLead.id === lead.id ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-main)',
                    borderColor: selectedLead && selectedLead.id === lead.id ? 'var(--color-primary)' : 'var(--border-color)',
                    padding: '10px'
                  }}
                >
                  <div className="activity-info" style={{ width: '85%' }}>
                    <span className="activity-name" style={{ fontSize: '12.5px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{lead.nombre}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{lead.estilo || 'Sin Categoría'}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-ai)' }}>{lead.lead_score}</span>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)', marginLeft: '4px', verticalAlign: 'middle' }} />
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                No hay leads prioritarios pendientes. ¡Excelente trabajo!
              </p>
            )}
          </div>
        </div>

        {/* AI Score Guide Cheat Sheet */}
        <div className="card" style={{ minHeight: 'auto', backgroundColor: 'var(--color-brand-dark)', color: 'var(--text-white)', border: 'none' }}>
          <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '14px', fontWeight: 700, color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={16} style={{ color: 'var(--color-ai)' }} />
            <span>Guía de Scoring Temikia (v3)</span>
          </h4>
          <p style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '4px' }}>
            El Agente IA califica la madurez digital del prospecto en tiempo real basándose en 6 dimensiones ponderadas:
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px', marginTop: '12px', borderTop: '1px solid #1E293B', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #1E293B', paddingBottom: '4px' }}>
              <span style={{ fontWeight: 600 }}>1. Contactabilidad e Identificación</span>
              <strong style={{ color: 'var(--color-ai)' }}>Máx 25 pts</strong>
            </div>
            <div style={{ paddingLeft: '8px', color: '#94A3B8', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>• WhatsApp Directo</span>
                <span>+8 pts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>• Correo Electrónico</span>
                <span>+8 pts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>• Teléfono Registrado</span>
                <span>+4 pts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>• Persona de Contacto</span>
                <span>+5 pts</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #1E293B', paddingBottom: '4px', marginTop: '4px' }}>
              <span style={{ fontWeight: 600 }}>2. Calidad y Perfilado</span>
              <strong style={{ color: 'var(--color-ai)' }}>Máx 10 pts</strong>
            </div>
            <div style={{ paddingLeft: '8px', color: '#94A3B8', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>• Notas extensas (&gt;20 carac.)</span>
                <span>+5 pts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>• Dirección física registrada</span>
                <span>+5 pts</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #1E293B', paddingBottom: '4px', marginTop: '4px' }}>
              <span style={{ fontWeight: 600 }}>3. Tráfico y Rating (Google Maps)</span>
              <strong style={{ color: 'var(--color-ai)' }}>Máx 20 pts</strong>
            </div>
            <div style={{ paddingLeft: '8px', color: '#94A3B8', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>• Opiniones (&gt;100 / 25-100 / &gt;0)</span>
                <span>+12 / +8 / +4 pts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>• Rating de Estrellas (★ &gt;= 4.2 / &gt;0)</span>
                <span>+8 / +4 pts</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #1E293B', paddingBottom: '4px', marginTop: '4px' }}>
              <span style={{ fontWeight: 600 }}>4. Infraestructura y Redes</span>
              <strong style={{ color: 'var(--color-ai)' }}>Máx 25 pts</strong>
            </div>
            <div style={{ paddingLeft: '8px', color: '#94A3B8', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>• Sitio Web Corporativo Activo</span>
                <span>+15 pts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>• Ecosistema Meta (2+ redes / 1 red)</span>
                <span>+10 / +5 pts</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontWeight: 600 }}>5. Huella Digital (web_search)</span>
              <strong style={{ color: 'var(--color-ai)' }}>+10 pts</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontWeight: 600 }}>6. Presión Competitiva (Clúster local)</span>
              <strong style={{ color: 'var(--color-ai)' }}>+10 pts</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
