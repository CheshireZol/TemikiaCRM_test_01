import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Sparkles, 
  MapPin, 
  Mail, 
  Phone, 
  RefreshCw, 
  Pencil, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Briefcase,
  TrendingUp,
  Percent,
  Award,
  BookOpen
} from 'lucide-react';
import { parseStringArray, formatDate } from '../utils.js';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

const statusLabels = {
  nuevo: "Nuevo",
  proceso_contacto: "En Proceso",
  contactado: "Contactado",
  calificado: "Calificado",
  propuesta: "Propuesta",
  ganado: "Ganado",
  perdido: "Perdido",
  descalificado: "Descalificado",
  datos_invalidos: "Datos Inválidos",
  cerrado_inexistente: "Cerrado"
};

const priorityLabels = {
  alta: "Alta",
  media: "Media",
  baja: "Baja"
};

const Equipo = ({ user, onLeadClick }) => {
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(false);

  // Expanded member card leads table state (tracks which member_id has its leads open)
  const [expandedLeads, setExpandedLeads] = useState({});
  const [leadsData, setLeadsData] = useState({}); // Stores leads fetched for each member
  const [loadingLeads, setLoadingLeads] = useState({});

  // Editing interests state
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [tempIntereses, setTempIntereses] = useState('');
  const [savingIntereses, setSavingIntereses] = useState(false);

  // Fetch team dashboard stats
  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/equipo');
        if (!res.ok) throw new Error('Error al consultar datos del equipo');
        const data = await res.json();
        setMiembros(data);
      } catch (err) {
        console.error(err);
        setError('No se pudo establecer comunicación con la base de datos de producción.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [refreshTrigger]);

  // Fetch leads on-demand for a specific team member
  const fetchMemberLeads = async (miembroId) => {
    if (leadsData[miembroId]) return; // Already fetched
    
    try {
      setLoadingLeads(prev => ({ ...prev, [miembroId]: true }));
      const res = await fetch(`/api/prospectos?miembro_id=${miembroId}&limit=100`);
      if (!res.ok) throw new Error('Error al obtener los leads');
      const data = await res.json();
      setLeadsData(prev => ({ ...prev, [miembroId]: data.rows || [] }));
    } catch (err) {
      console.error('Error loading member leads:', err);
    } finally {
      setLoadingLeads(prev => ({ ...prev, [miembroId]: false }));
    }
  };

  const toggleLeadsAccordion = (miembroId) => {
    const isNowOpen = !expandedLeads[miembroId];
    setExpandedLeads(prev => ({ ...prev, [miembroId]: isNowOpen }));
    
    if (isNowOpen) {
      fetchMemberLeads(miembroId);
    }
  };

  // Open interests editing panel
  const handleStartEditIntereses = (miembro) => {
    setEditingMemberId(miembro.miembro_id);
    setTempIntereses(miembro.intereses || '');
  };

  const handleSaveIntereses = async (miembroId) => {
    try {
      setSavingIntereses(true);
      const res = await fetch(`/api/equipo/${miembroId}/intereses`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intereses: tempIntereses })
      });

      if (!res.ok) throw new Error('Error al guardar intereses');
      
      setEditingMemberId(null);
      setRefreshTrigger(prev => !prev);
    } catch (err) {
      console.error(err);
      alert('Error de red al guardar los intereses.');
    } finally {
      setSavingIntereses(false);
    }
  };

  // Global calculations
  const totalMiembros = miembros.length;
  const totalLeadsEquipo = miembros.reduce((sum, m) => sum + parseInt(m.total_leads || 0), 0);
  
  const totalGanados = miembros.reduce((sum, m) => sum + parseInt(m.leads_ganados || 0), 0);
  const totalPerdidos = miembros.reduce((sum, m) => sum + parseInt(m.leads_perdidos || 0), 0);
  const totalFinalizados = totalGanados + totalPerdidos;
  const tasaConversionGlobal = totalFinalizados > 0 ? Math.round((totalGanados / totalFinalizados) * 100) : 0;
  
  const scorePromedioGlobal = totalMiembros > 0 
    ? Math.round(miembros.reduce((sum, m) => sum + parseFloat(m.avg_lead_score || 0), 0) / totalMiembros) 
    : 0;

  // Custom initials avatar background color map based on name
  const getAvatarStyle = (name) => {
    if (!name) return { background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)' };
    const charCode = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
    const hue = charCode % 360;
    return {
      background: `linear-gradient(135deg, hsl(${hue}, 70%, 45%) 0%, hsl(${(hue + 60) % 360}, 65%, 35%) 100%)`,
      color: '#FFFFFF'
    };
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Convert interests comma-separated string to Array of clean pills
  const parseInterests = (interestStr) => {
    if (!interestStr || interestStr.trim() === '') return [];
    return interestStr.split(',').map(s => s.trim()).filter(Boolean);
  };

  // Map data for sales friendly competition charts
  const chartData = miembros.map(m => {
    const leadsGanados = parseInt(m.leads_ganados || 0);
    const leadsPerdidos = parseInt(m.leads_perdidos || 0);
    const totalCerrados = leadsGanados + leadsPerdidos;
    const conversion = totalCerrados > 0 ? Math.round((leadsGanados / totalCerrados) * 100) : 0;
    
    return {
      name: m.nombre_corto || m.nombre_completo.split(' ')[0],
      'Efectividad (%)': conversion,
      'Lead Score Promedio': Math.round(parseFloat(m.avg_lead_score || 0)),
      'Leads Ganados': leadsGanados
    };
  });

  if (loading && miembros.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>
        <RefreshCw size={24} className="header-status-dot" style={{ animation: 'pulse-glow 1.5s infinite', color: 'var(--color-primary)' }} />
        <p style={{ marginTop: '12px' }}>Cargando información del equipo Temikia...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. GLOBAL TEAM METRICS ROW */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '16px' 
      }}>
        {/* KPI 1: Miembros */}
        <div className="kpi-card" style={{ padding: '16px' }}>
          <div className="kpi-info">
            <span className="kpi-label">Colaboradores Activos</span>
            <span className="kpi-value">{totalMiembros}</span>
          </div>
          <div className="kpi-icon-wrapper success">
            <Users size={20} />
          </div>
        </div>

        {/* KPI 2: Total Leads */}
        <div className="kpi-card" style={{ padding: '16px' }}>
          <div className="kpi-info">
            <span className="kpi-label">Cartera Total Leads</span>
            <span className="kpi-value">{totalLeadsEquipo}</span>
          </div>
          <div className="kpi-icon-wrapper" style={{ backgroundColor: 'rgba(37, 99, 235, 0.08)', color: 'var(--color-primary)' }}>
            <Award size={20} />
          </div>
        </div>

        {/* KPI 3: Tasa de Conversión Global */}
        <div className="kpi-card" style={{ padding: '16px' }}>
          <div className="kpi-info">
            <span className="kpi-label">Conversión Promedio</span>
            <span className="kpi-value">{tasaConversionGlobal}%</span>
          </div>
          <div className="kpi-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-success)' }}>
            <TrendingUp size={20} />
          </div>
        </div>

        {/* KPI 4: Score Promedio */}
        <div className="kpi-card" style={{ padding: '16px' }}>
          <div className="kpi-info">
            <span className="kpi-label">Lead Score de Equipo</span>
            <span className="kpi-value">{scorePromedioGlobal}<span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/100</span></span>
          </div>
          <div className="kpi-icon-wrapper ai">
            <Sparkles size={20} />
          </div>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--priority-alta-bg)', color: 'var(--priority-alta-text)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
          <X size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. TEAM MEMBERS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {miembros.map((m) => {
          const leadsGanados = parseInt(m.leads_ganados || 0);
          const leadsPerdidos = parseInt(m.leads_perdidos || 0);
          const totalLeads = parseInt(m.total_leads || 0);
          const leadsActivos = parseInt(m.leads_activos || 0);
          const totalCerrados = leadsGanados + leadsPerdidos;
          const tasaConversion = totalCerrados > 0 ? Math.round((leadsGanados / totalCerrados) * 100) : 0;
          
          const isCurrentUser = user && user.miembroId === m.miembro_id;
          const isEditing = editingMemberId === m.miembro_id;
          const interestsList = parseInterests(m.intereses);

          return (
            <div 
              key={m.miembro_id}
              className="glass-card"
              style={{
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                boxShadow: 'var(--shadow-md)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
            >
              {/* Card Header Cover Background */}
              <div style={{
                height: '70px',
                background: isCurrentUser 
                  ? 'linear-gradient(90deg, rgba(37, 99, 235, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)' 
                  : 'rgba(226, 232, 240, 0.3)',
                borderBottom: '1px solid var(--border-color)',
                position: 'relative'
              }}>
                {isCurrentUser && (
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    fontSize: '9px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    color: 'var(--color-primary)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid rgba(37, 99, 235, 0.25)'
                  }}>
                    Tú (Tercero)
                  </span>
                )}
              </div>

              {/* Card Profile Section */}
              <div style={{
                padding: '0 20px 20px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginTop: '-35px',
                position: 'relative',
                zIndex: 1
              }}>
                {/* Photo & Name Group */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px' }}>
                  {/* Photo circular box */}
                  <div style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    border: '3px solid var(--bg-card)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '24px',
                    boxShadow: 'var(--shadow-sm)',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 2,
                    ...getAvatarStyle(m.nombre_completo)
                  }}>
                    {m.foto_url ? (
                      <img 
                        src={m.foto_url} 
                        alt={m.nombre_completo}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span>{getInitials(m.nombre_completo)}</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.nombre_completo}>
                      {m.nombre_completo}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Briefcase size={11} style={{ color: 'var(--color-primary)' }} />
                      {m.cargo || 'Sales Executive'}
                    </span>
                  </div>
                </div>

                {/* Public contact details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
                  {/* Location Pin */}
                  {(m.ciudad || m.pais) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
                      <span>{m.ciudad ? `${m.ciudad}, ` : ''}{m.pais}</span>
                    </div>
                  )}
                  {/* Correspondence Email */}
                  {m.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      <Mail size={12} style={{ color: 'var(--text-muted)' }} />
                      <a href={`mailto:${m.email}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }} className="hover:underline">
                        {m.email}
                      </a>
                    </div>
                  )}
                </div>



                {/* 4. Leads Performance Stats */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* First row of metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                    <div style={{ backgroundColor: 'var(--bg-main)', padding: '6px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <span style={{ display: 'block', fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>{totalLeads}</span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>Leads Asignados</span>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-main)', padding: '6px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <span style={{ display: 'block', fontSize: '16px', fontWeight: 800, color: 'var(--color-success)' }}>{tasaConversion}%</span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>Conversión Won</span>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-main)', padding: '6px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-ai)', display: 'inline-flex', alignItems: 'center', gap: '2px', width: '100%', justifyContent: 'center' }}>
                        <Sparkles size={11} />
                        {m.avg_lead_score}
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>Score Promedio</span>
                    </div>
                  </div>

                  {/* Conversion progress bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      <span>TASA DE EFECTIVIDAD COMERCIAL</span>
                      <span>{tasaConversion}%</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--border-color)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{ width: `${tasaConversion}%`, height: '100%', backgroundColor: 'var(--color-success)', borderRadius: 'var(--radius-full)' }}></div>
                    </div>
                  </div>

                  {/* Distribution counts */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-secondary)', padding: '0 4px' }}>
                    <span>Activos: <strong style={{ color: 'var(--color-primary)' }}>{leadsActivos}</strong></span>
                    <span>Ganados: <strong style={{ color: 'var(--color-success)' }}>{leadsGanados}</strong></span>
                    <span>Perdidos: <strong style={{ color: 'var(--color-danger)' }}>{leadsPerdidos}</strong></span>
                  </div>
                </div>

                {/* 5. Acordeón para ver leads asignados */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                  <button 
                    onClick={() => toggleLeadsAccordion(m.miembro_id)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontWeight: 700,
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-color)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                  >
                    <span>{expandedLeads[m.miembro_id] ? 'Ocultar prospectos asignados' : 'Ver prospectos asignados'}</span>
                    {expandedLeads[m.miembro_id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {/* Leads Data Table (Rendered if expanded) */}
                  {expandedLeads[m.miembro_id] && (
                    <div style={{ 
                      marginTop: '10px', 
                      maxHeight: '260px', 
                      overflowY: 'auto',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-main)'
                    }}>
                      {loadingLeads[m.miembro_id] ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '11px' }}>
                          <RefreshCw size={14} className="animate-spin" style={{ color: 'var(--color-primary)', marginRight: '6px' }} />
                          Cargando prospectos...
                        </div>
                      ) : leadsData[m.miembro_id] && leadsData[m.miembro_id].length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                              <th style={{ padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 700 }}>Prospecto</th>
                              <th style={{ padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 700 }}>Estatus</th>
                              <th style={{ padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 700, width: '40px' }}>Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leadsData[m.miembro_id].map((leadItem) => (
                              <tr 
                                key={leadItem.id} 
                                style={{ borderBottom: '1px dashed var(--border-color)', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                                onClick={() => onLeadClick(leadItem.id)}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                title="Ver Ficha Completa"
                              >
                                <td style={{ padding: '8px', fontWeight: 600, color: 'var(--text-main)', lineBreak: 'anywhere' }}>
                                  {leadItem.nombre}
                                </td>
                                <td style={{ padding: '8px' }}>
                                  <span style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: 'var(--radius-full)',
                                    backgroundColor: 
                                      leadItem.estatus === 'ganado' ? 'var(--status-ganado-bg)' :
                                      leadItem.estatus === 'perdido' ? 'var(--status-perdido-bg)' :
                                      'rgba(100, 116, 139, 0.1)',
                                    color:
                                      leadItem.estatus === 'ganado' ? 'var(--status-ganado-text)' :
                                      leadItem.estatus === 'perdido' ? 'var(--status-perdido-text)' :
                                      'var(--text-secondary)'
                                  }}>
                                    {statusLabels[leadItem.estatus] || leadItem.estatus}
                                  </span>
                                </td>
                                <td style={{ padding: '8px', fontWeight: 700, color: 'var(--color-ai)', textAlign: 'center' }}>
                                  {leadItem.lead_score}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <BookOpen size={14} />
                          <span>Este colaborador no tiene leads asignados.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* 3. SALES COMPETITION / MOTIVATIONAL LEADERBOARD CHART */}
      <div className="glass-card" style={{
        padding: '24px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-card)',
        boxShadow: 'var(--shadow-md)',
        marginTop: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} style={{ color: '#F59E0B' }} />
              <span>🏆 Tabla de Competitividad Comercial</span>
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, marginTop: '2px' }}>
              Métricas de rendimiento comparativo para incentivar la excelencia y motivación de todo el equipo de ventas.
            </p>
          </div>
        </div>

        <div style={{ width: '100%', height: '320px', marginTop: '8px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="var(--text-secondary)" 
                fontSize={11}
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="var(--text-secondary)" 
                fontSize={11}
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  borderColor: 'var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: '#fff',
                  fontSize: '12px',
                  boxShadow: 'var(--shadow-md)',
                  backdropFilter: 'blur(8px)'
                }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconSize={10}
              />
              <Bar 
                dataKey="Efectividad (%)" 
                fill="#10B981" 
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
              <Bar 
                dataKey="Lead Score Promedio" 
                fill="#06B6D4" 
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
              <Bar 
                dataKey="Leads Ganados" 
                fill="#2563EB" 
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default Equipo;
