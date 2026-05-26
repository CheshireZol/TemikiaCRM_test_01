import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Sparkles, 
  MapPin, 
  Phone, 
  UserCheck,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { parseStringArray } from '../utils.js';

// Define the 4 Macro Groups and 10 Subgroups of Temikia CRM
const KANBAN_STRUCTURE = [
  {
    id: 'pre_pipeline',
    label: 'Pre-Pipeline',
    color: '#3B82F6', // Blue
    bgColor: 'rgba(59, 130, 246, 0.04)',
    stages: [
      { id: 'nuevo', label: 'Nuevo Lead', desc: 'Esperando asignación o primer disparo de bot.', color: '#3B82F6' },
      { id: 'proceso_contacto', label: 'En Proceso de Contacto', desc: 'Intentos de comunicación activos.', color: '#60A5FA' }
    ]
  },
  {
    id: 'pipeline_activo',
    label: 'Pipeline Activo',
    color: '#06B6D4', // Cyan
    bgColor: 'rgba(6, 182, 212, 0.04)',
    stages: [
      { id: 'contactado', label: 'Contactado', desc: 'Conversación bidireccional establecida.', color: '#F59E0B' },
      { id: 'calificado', label: 'Calificado', desc: 'Cumple ICP y hay interés inicial.', color: '#06B6D4' },
      { id: 'propuesta', label: 'Propuesta', desc: 'Oferta comercial o demo entregada.', color: '#6366F1' }
    ]
  },
  {
    id: 'cierre',
    label: 'Cierre',
    color: '#10B981', // Green
    bgColor: 'rgba(16, 185, 129, 0.04)',
    stages: [
      { id: 'ganado', label: 'Ganado', desc: 'Cliente cierra contrato.', color: '#10B981' },
      { id: 'perdido', label: 'Perdido', desc: 'Estuvo en proceso pero eligió otra opción o se enfrió.', color: '#EF4444' }
    ]
  },
  {
    id: 'exclusiones',
    label: 'Exclusiones (Descartes)',
    color: '#64748B', // Slate
    bgColor: 'rgba(100, 116, 139, 0.04)',
    stages: [
      { id: 'descalificado', label: 'Descalificado / Sin Perfil', desc: 'Negocio activo pero no apto para el servicio.', color: '#64748B' },
      { id: 'datos_invalidos', label: 'Datos Inválidos / Inalcanzable', desc: 'Teléfono erróneo, sin canales de comunicación.', color: '#94A3B8' },
      { id: 'cerrado_inexistente', label: 'Cerrado / Inexistente', desc: 'Fichas de GMaps con estatus "Cerrado Permanentemente" o duplicados.', color: '#CBD5E1' }
    ]
  }
];

const priorityLabels = {
  alta: "Alta",
  media: "Media",
  baja: "Baja"
};

const Kanban = ({ user, searchQuery, setSearchQuery, onLeadClick, triggerRefreshToggle }) => {
  const [leads, setLeads] = useState([]);
  const [filters, setFilters] = useState({
    pais: '',
    giro: '',
    prioridad: '',
    owner: '',
    miembro_id: ''
  });
  
  const [miembros, setMiembros] = useState([]);
  const [asignadoAMi, setAsignadoAMi] = useState(false);

  // Available filter options dynamically retrieved from DB
  const [options, setOptions] = useState({
    paises: [],
    giros: [],
    miembros: [],
    prioridades: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Track visual drop indicator states (Subgroups stage id)
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Accordion collapsed state for each of the 10 commercial stages
  const [collapsedStages, setCollapsedStages] = useState({
    nuevo: false,
    proceso_contacto: false,
    contactado: false,
    calificado: false,
    propuesta: false,
    ganado: false,
    perdido: false,
    descalificado: true, // Descartes collapsed by default
    datos_invalidos: true, // Descartes collapsed by default
    cerrado_inexistente: true // Descartes collapsed by default
  });

  // 1. Fetch static team members once
  useEffect(() => {
    const fetchMiembros = async () => {
      try {
        const res = await fetch('/api/miembros');
        if (res.ok) {
          const data = await res.json();
          setMiembros(data);
        }
      } catch (err) {
        console.error('Error fetching team members:', err);
      }
    };
    fetchMiembros();
  }, [triggerRefreshToggle]);

  // 1.5 Fetch distinct dynamic filters in real time (Faceted Search)
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const params = new URLSearchParams();
        
        // Append all active filters as query params
        Object.keys(filters).forEach(key => {
          if (filters[key]) {
            params.append(key, filters[key]);
          }
        });

        if (asignadoAMi && user && user.miembroId) {
          params.append('miembro_id', user.miembroId);
        }

        const res = await fetch(`/api/filtros?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setOptions({
            paises: data.paises || [],
            giros: data.giros || [],
            miembros: data.miembros || [],
            prioridades: data.prioridades || []
          });
        }
      } catch (err) {
        console.error('Error fetching dynamic filters in Kanban:', err);
      }
    };
    fetchFilters();
  }, [filters, asignadoAMi, triggerRefreshToggle]);

  // 2. Fetch leads based on search query and filters
  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        limit: 120, // Keep loaded records clean
        q: searchQuery
      });
      
      if (filters.pais) queryParams.append('pais', filters.pais);
      if (filters.giro) queryParams.append('giro', filters.giro);
      if (filters.prioridad) queryParams.append('prioridad', filters.prioridad);
      
      if (filters.miembro_id) {
        queryParams.append('miembro_id', filters.miembro_id);
      } else if (asignadoAMi && user && user.miembroId) {
        queryParams.append('miembro_id', user.miembroId);
      } else if (filters.owner) {
        queryParams.append('owner', filters.owner);
      }
      
      const res = await fetch(`/api/prospectos?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Error al consultar prospectos');
      const data = await res.json();
      setLeads(data.rows);
    } catch (err) {
      console.error(err);
      setError('No se pudo establecer conexión con la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [searchQuery, filters, asignadoAMi, triggerRefreshToggle]);

  // 3. Native Drag and Drop Handlers
  const handleDragStart = (e, leadId, currentStatus) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.setData('originalStatus', currentStatus);
    
    // Add micro-styling
    setTimeout(() => {
      const el = document.getElementById(`card-${leadId}`);
      if (el) el.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (leadId) => {
    const el = document.getElementById(`card-${leadId}`);
    if (el) el.classList.remove('dragging');
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    const leadId = e.dataTransfer.getData('text/plain');
    const originalStatus = e.dataTransfer.getData('originalStatus');

    if (!leadId || originalStatus === targetStatus) return;

    // 1. Optimistic Update in UI
    const draggedLead = leads.find(l => l.id === leadId);
    if (!draggedLead) return;

    setLeads(prevLeads => 
      prevLeads.map(l => l.id === leadId ? { ...l, estatus: targetStatus } : l)
    );

    // 2. Confetti celebration on conversion!
    if (targetStatus === 'ganado') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563EB', '#06B6D4', '#10B981', '#F59E0B']
      });
    }

    // 3. Persist update in PostgreSQL
    try {
      const res = await fetch(`/api/prospectos/${leadId}/estatus`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus: targetStatus })
      });

      if (!res.ok) {
        throw new Error('Servidor falló al actualizar estado.');
      }
    } catch (err) {
      console.error(err);
      // Rollback
      setLeads(prevLeads => 
        prevLeads.map(l => l.id === leadId ? { ...l, estatus: originalStatus } : l)
      );
      alert('Error de conexión: No se pudo guardar el cambio de estatus.');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getLeadsByStatus = (statusId) => {
    return leads.filter(l => l.estatus === statusId);
  };

  const toggleCollapse = (stageId) => {
    setCollapsedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  if (loading && leads.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
        <RefreshCw size={24} className="header-status-dot" style={{ animation: 'pulse-glow 1.5s infinite' }} />
        <p style={{ marginTop: '12px' }}>Cargando pipeline comercial...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Mobile Search Bar */}
      <div className="mobile-search-bar">
        <div className="header-search-wrapper" style={{ width: '100%' }}>
          <Search className="header-search-icon" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre, giro..."
            className="header-search-input"
            style={{ width: '100%', padding: '10px 12px 10px 38px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filtering Toolbar */}
      <div className="kanban-controls" style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-card)' }}>
        <div className="kanban-filters" style={{ gap: '10px' }}>
          <select 
            value={filters.pais} 
            onChange={(e) => handleFilterChange('pais', e.target.value)}
            className="filter-select"
          >
            <option value="">Todos los Países</option>
            {options.paises.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select 
            value={filters.giro} 
            onChange={(e) => handleFilterChange('giro', e.target.value)}
            className="filter-select"
          >
            <option value="">Cualquier Giro</option>
            {options.giros.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <select 
            value={filters.miembro_id} 
            onChange={(e) => handleFilterChange('miembro_id', e.target.value)}
            className="filter-select"
            disabled={asignadoAMi}
          >
            <option value="">Todos los Asesores</option>
            {options.miembros.map(m => (
              <option key={m.miembro_id} value={m.miembro_id}>{m.nombre_completo}</option>
            ))}
          </select>

          <select 
            value={filters.prioridad} 
            onChange={(e) => handleFilterChange('prioridad', e.target.value)}
            className="filter-select"
          >
            <option value="">Cualquier Prioridad</option>
            {options.prioridades.map(p => (
              <option key={p} value={p}>{priorityLabels[p] || p}</option>
            ))}
          </select>

          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            cursor: 'pointer', 
            fontSize: '13px', 
            color: 'var(--text-main)', 
            userSelect: 'none',
            padding: '8px 12px',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: asignadoAMi ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-card)',
            borderColor: asignadoAMi ? 'var(--color-primary)' : 'var(--border-color)',
            transition: 'all var(--transition-fast)'
          }}>
            <input 
              type="checkbox" 
              checked={asignadoAMi} 
              onChange={(e) => {
                const checked = e.target.checked;
                setAsignadoAMi(checked);
                if (checked) {
                  setFilters({
                    pais: '',
                    giro: '',
                    prioridad: '',
                    owner: '',
                    miembro_id: ''
                  });
                }
              }}
              style={{ width: '13px', height: '13px', accentColor: 'var(--color-primary)' }}
            />
            <span style={{ fontWeight: asignadoAMi ? 700 : 500, color: asignadoAMi ? 'var(--color-primary)' : 'var(--text-secondary)' }}>Asignado a mí</span>
          </label>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {(filters.pais || filters.giro || filters.prioridad || filters.miembro_id || filters.owner || asignadoAMi) && (
            <button 
              className="btn btn-secondary btn-text" 
              onClick={() => {
                setFilters({ pais: '', giro: '', prioridad: '', owner: '', miembro_id: '' });
                setAsignadoAMi(false);
              }}
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              Limpiar Filtros
            </button>
          )}
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Mostrando <strong>{leads.length}</strong> prospectos
          </div>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--priority-alta-bg)', color: 'var(--priority-alta-text)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
          <AlertCircle size={16} />
          <span>{error} Revisa la conexión a PostgreSQL.</span>
        </div>
      )}

      {/* Kanban Board Container: 4 Macro Columns */}
      <div className="kanban-board" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(280px, 1fr))',
        gap: '16px',
        alignItems: 'start',
        overflowX: 'auto',
        paddingBottom: '16px'
      }}>
        {KANBAN_STRUCTURE.map((macroGroup) => {
          // Calculate total leads in this macro column
          const totalMacroLeads = macroGroup.stages.reduce((sum, s) => sum + getLeadsByStatus(s.id).length, 0);

          return (
            <div 
              key={macroGroup.id} 
              className="kanban-macro-column"
              style={{
                backgroundColor: 'rgba(226, 232, 240, 0.25)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 12px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                minHeight: '650px',
                transition: 'all 0.25s ease'
              }}
            >
              {/* Macro Column Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '10px',
                borderBottom: `2px solid ${macroGroup.color}`
              }}>
                <span style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {macroGroup.label}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)'
                }}>
                  {totalMacroLeads} leads
                </span>
              </div>

              {/* Subgroups Acordeón Stack */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {macroGroup.stages.map((stage) => {
                  const stageLeads = getLeadsByStatus(stage.id);
                  const isCollapsed = collapsedStages[stage.id];
                  const isOver = dragOverColumn === stage.id;

                  return (
                    <div 
                      key={stage.id} 
                      onDragOver={(e) => handleDragOver(e, stage.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, stage.id)}
                      style={{
                        borderRadius: 'var(--radius-md)',
                        border: isOver ? `2px dashed ${stage.color}` : '1px solid var(--border-color)',
                        backgroundColor: isOver ? 'rgba(6, 182, 212, 0.04)' : 'var(--bg-card)',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      {/* Subgroup Header (Clickable to collapse) */}
                      <div 
                        onClick={() => toggleCollapse(stage.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: stage.color,
                            flexShrink: 0
                          }} />
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                            {stage.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: 'var(--text-secondary)',
                            backgroundColor: 'rgba(100, 116, 139, 0.08)',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)'
                          }}>
                            {stageLeads.length}
                          </span>
                          {isCollapsed ? <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />}
                        </div>
                      </div>

                      {/* Action Guide / Flow Desc (Visible if expanded) */}
                      {!isCollapsed && (
                        <p style={{
                          fontSize: '10.5px',
                          color: 'var(--text-secondary)',
                          margin: 0,
                          lineHeight: '1.4',
                          fontStyle: 'italic',
                          borderLeft: `2px solid rgba(100, 116, 139, 0.15)`,
                          paddingLeft: '6px'
                        }}>
                          {stage.desc}
                        </p>
                      )}

                      {/* Subgroup Draggable Cards container (Visible if expanded) */}
                      {!isCollapsed && (
                        <div 
                          className="cards-list"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            marginTop: '4px',
                            minHeight: '60px',
                            boxSizing: 'border-box'
                          }}
                        >
                          {stageLeads.length > 0 ? (
                            stageLeads.map((lead) => {
                              const phones = parseStringArray(lead.telefono);
                              
                              return (
                                <div
                                  key={lead.id}
                                  id={`card-${lead.id}`}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, lead.id, stage.id)}
                                  onDragEnd={() => handleDragEnd(lead.id)}
                                  onClick={() => onLeadClick(lead.id)}
                                  className="kanban-card"
                                  style={{
                                    margin: 0,
                                    boxShadow: 'var(--shadow-sm)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '10px',
                                    backgroundColor: 'var(--bg-card)',
                                    cursor: 'grab',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                                  }}
                                >
                                  {/* Priority Row */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <span style={{ 
                                      fontSize: '8.5px',
                                      fontWeight: 800,
                                      padding: '2px 6px',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.03em',
                                      borderRadius: 'var(--radius-sm)',
                                      backgroundColor: 
                                        lead.prioridad === 'alta' ? 'var(--priority-alta-bg)' :
                                        lead.prioridad === 'media' ? 'var(--priority-media-bg)' :
                                        'var(--priority-baja-bg)',
                                      color:
                                        lead.prioridad === 'alta' ? 'var(--priority-alta-text)' :
                                        lead.prioridad === 'media' ? 'var(--priority-media-text)' :
                                        'var(--priority-baja-text)'
                                    }}>
                                      {lead.prioridad || 'Baja'}
                                    </span>
                                    
                                    {lead.owner_nombre && lead.owner_nombre !== 'Sin Asignar' && (
                                      <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }} title={lead.owner_nombre}>
                                        <UserCheck size={10} style={{ color: 'var(--color-primary)' }} />
                                        {lead.owner_nombre.split(' ')[0]}
                                      </span>
                                    )}
                                  </div>

                                  {/* Lead Name */}
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', lineBreak: 'anywhere' }} title={lead.nombre}>
                                    {lead.nombre}
                                  </span>

                                  {/* Giro / Tag style */}
                                  {(lead.giro_nombre || lead.estilo) && (
                                    <span style={{
                                      fontSize: '9.5px',
                                      fontWeight: 600,
                                      color: 'var(--text-secondary)',
                                      backgroundColor: 'rgba(100, 116, 139, 0.06)',
                                      padding: '2px 6px',
                                      borderRadius: 'var(--radius-sm)',
                                      width: 'fit-content',
                                      textOverflow: 'ellipsis',
                                      overflow: 'hidden',
                                      whiteSpace: 'nowrap',
                                      maxWidth: '100%'
                                    }}>
                                      {lead.giro_nombre || lead.estilo}
                                    </span>
                                  )}

                                  {/* Geolocation */}
                                  {lead.ciudad && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                                      <MapPin size={10} style={{ flexShrink: 0, color: 'var(--text-secondary)' }} />
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {lead.ciudad}, {lead.pais}
                                      </span>
                                    </div>
                                  )}

                                  {/* Score indicator */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: 'var(--text-secondary)' }}>
                                      <Phone size={9} style={{ color: 'var(--text-secondary)' }} />
                                      <span>{phones.length > 0 && phones[0] !== '' ? 'Sí' : 'No'}</span>
                                    </div>
                                    
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      fontSize: '9px',
                                      fontWeight: 700,
                                      color: 'var(--color-ai)',
                                      backgroundColor: 'rgba(6, 182, 212, 0.08)',
                                      padding: '2px 5px',
                                      borderRadius: 'var(--radius-sm)'
                                    }}>
                                      <Sparkles size={9} />
                                      <span>Score: {lead.lead_score}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '16px 8px',
                              border: '1px dashed var(--border-color)',
                              borderRadius: 'var(--radius-md)',
                              color: 'var(--text-muted)',
                              textAlign: 'center',
                              minHeight: '60px'
                            }}>
                              <HelpCircle size={14} style={{ color: 'var(--text-muted)' }} />
                              <p style={{ fontSize: '9.5px', color: 'var(--text-secondary)', margin: 0, marginTop: '4px' }}>
                                Arrastrar aquí
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Kanban;
