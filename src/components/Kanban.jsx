import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Sparkles, 
  MapPin, 
  Phone, 
  UserCheck,
  AlertCircle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { parseStringArray } from '../utils.js';

// Define the 6 commercial stages of TemikIA Agency
const STAGES = [
  { id: 'nuevo', label: 'nuevos leads', color: '#3B82F6' },
  { id: 'contactado', label: 'contactados', color: '#F59E0B' },
  { id: 'calificado', label: 'calificados (IA)', color: '#06B6D4' },
  { id: 'propuesta', label: 'propuesta enviada', color: '#6366F1' },
  { id: 'ganado', label: 'cierres ganados', color: '#10B981' },
  { id: 'perdido', label: 'leads perdidos', color: '#EF4444' }
];

const Kanban = ({ user, searchQuery, onLeadClick, triggerRefreshToggle }) => {
  const [leads, setLeads] = useState([]);
  const [filters, setFilters] = useState({
    pais: '',
    prioridad: '',
    owner: '',
    miembro_id: ''
  });
  
  const [miembros, setMiembros] = useState([]);
  const [asignadoAMi, setAsignadoAMi] = useState(false);

  // Available filter options dynamically retrieved from DB
  const [options, setOptions] = useState({
    paises: [],
    owners: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Track visual drop indicator states
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // 1. Fetch dynamic filters (countries, owners) once
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch('/api/filtros');
        if (res.ok) {
          const data = await res.json();
          setOptions({
            paises: data.paises,
            owners: data.owners
          });
        }
      } catch (err) {
        console.error('Error fetching filters:', err);
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
        console.error('Error fetching team members:', err);
      }
    };
    fetchFilters();
    fetchMiembros();
  }, [triggerRefreshToggle]);

  // 2. Fetch leads based on search query and filter selections
  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        limit: 120, // Load top 120 matching leads to keep UI lightweight
        q: searchQuery
      });
      
      if (filters.pais) queryParams.append('pais', filters.pais);
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
    
    // Add micro-styling when starting drag
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

    // 1. Optimistic Update in UI State immediately for high responsiveness
    const draggedLead = leads.find(l => l.id === leadId);
    if (!draggedLead) return;

    // Update local state
    setLeads(prevLeads => 
      prevLeads.map(l => l.id === leadId ? { ...l, estatus: targetStatus } : l)
    );

    // 2. Trigger Confetti celebration if lead is Won!
    if (targetStatus === 'ganado') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563EB', '#06B6D4', '#10B981', '#F59E0B']
      });
    }

    // 3. Persist update in PostgreSQL Supabase database
    try {
      const res = await fetch(`/api/prospectos/${leadId}/estatus`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus: targetStatus })
      });

      if (!res.ok) {
        throw new Error('Servidor falló al persistir cambio de estado.');
      }
      
      console.log(`Database updated: Lead ${draggedLead.nombre} moved to ${targetStatus}`);
    } catch (err) {
      console.error(err);
      // Rollback optimistic update on error
      setLeads(prevLeads => 
        prevLeads.map(l => l.id === leadId ? { ...l, estatus: originalStatus } : l)
      );
      alert('Error de conexión: No se pudo guardar el cambio de estatus en la base de datos.');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Group leads by their status column
  const getLeadsByStatus = (statusId) => {
    return leads.filter(l => l.estatus === statusId);
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
      {/* Filtering Toolbar */}
      <div className="kanban-controls">
        <div className="kanban-filters">
          <select 
            value={filters.pais} 
            onChange={(e) => handleFilterChange('pais', e.target.value)}
            className="filter-select"
          >
            <option value="">Todos los Países</option>
            {options.paises.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select 
            value={filters.miembro_id} 
            onChange={(e) => handleFilterChange('miembro_id', e.target.value)}
            className="filter-select"
            disabled={asignadoAMi}
          >
            <option value="">Todos los Asesores</option>
            {miembros.map(m => <option key={m.miembro_id} value={m.miembro_id}>{m.nombre_completo}</option>)}
          </select>

          <select 
            value={filters.prioridad} 
            onChange={(e) => handleFilterChange('prioridad', e.target.value)}
            className="filter-select"
          >
            <option value="">Cualquier Prioridad</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
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
              onChange={(e) => setAsignadoAMi(e.target.checked)}
              style={{ width: '13px', height: '13px', accentColor: 'var(--color-primary)' }}
            />
            <span style={{ fontWeight: asignadoAMi ? 700 : 500, color: asignadoAMi ? 'var(--color-primary)' : 'var(--text-secondary)' }}>Asignado a mí</span>
          </label>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {(filters.pais || filters.prioridad || filters.miembro_id || filters.owner || asignadoAMi) && (
            <button 
              className="btn btn-secondary btn-text" 
              onClick={() => {
                setFilters({ pais: '', prioridad: '', owner: '', miembro_id: '' });
                setAsignadoAMi(false);
              }}
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              Limpiar Filtros
            </button>
          )}
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Mostrando <strong>{leads.length}</strong> prospectos filtrados
          </div>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--priority-alta-bg)', color: 'var(--priority-alta-text)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
          <AlertCircle size={16} />
          <span>{error} Revisa la conexión a PostgreSQL.</span>
        </div>
      )}

      {/* Kanban Board Container */}
      <div className="kanban-board">
        {STAGES.map((stage) => {
          const stageLeads = getLeadsByStatus(stage.id);
          const isOver = dragOverColumn === stage.id;
          
          return (
            <div 
              key={stage.id} 
              className={`kanban-column ${isOver ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <div className="column-header">
                <div className="column-title-group">
                  <span className="column-color-indicator" style={{ backgroundColor: stage.color }}></span>
                  <span className="column-title">{stage.label}</span>
                </div>
                <span className="column-count">{stageLeads.length}</span>
              </div>

              {/* Cards List */}
              <div className="cards-list">
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
                      >
                        {/* Priority Badge */}
                        <div className="card-priority-line">
                          <span className={`badge`} style={{ 
                            fontSize: '9px',
                            padding: '2px 6px',
                            backgroundColor: 
                              lead.prioridad === 'alta' ? 'var(--priority-alta-bg)' :
                              lead.prioridad === 'media' ? 'var(--priority-media-bg)' :
                              'var(--priority-baja-bg)',
                            color:
                              lead.prioridad === 'alta' ? 'var(--priority-alta-text)' :
                              lead.prioridad === 'media' ? 'var(--priority-media-text)' :
                              'var(--priority-baja-text)'
                          }}>
                            Prioridad: {lead.prioridad || 'Baja'}
                          </span>
                          
                          {lead.owner_nombre && lead.owner_nombre !== 'Sin Asignar' && (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }} title={lead.owner_nombre}>
                              <UserCheck size={10} />
                              {lead.owner_nombre.split(' ')[0]}
                            </span>
                          )}
                        </div>

                        {/* Title Name */}
                        <span className="card-title-name" title={lead.nombre}>
                          {lead.nombre}
                        </span>

                        {/* Giro / Estilo */}
                        {(lead.giro_nombre || lead.estilo) && (
                          <span className="card-tag-style">
                            {lead.giro_nombre || lead.estilo}
                          </span>
                        )}

                        {/* Geolocation */}
                        {lead.ciudad && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                            <MapPin size={11} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {lead.ciudad}, {lead.pais}
                            </span>
                          </div>
                        )}

                        {/* Card Footer containing Lead Score */}
                        <div className="card-footer-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={10} />
                            <span>{phones.length > 0 && phones[0] !== '' ? 'Sí' : 'No'}</span>
                          </div>
                          
                          <div className="card-score-pill">
                            <Sparkles size={10} />
                            <span>Score: {lead.lead_score}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 12px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', textAlign: 'center', minHeight: '120px' }}>
                    <HelpCircle size={18} />
                    <p style={{ fontSize: '11px', marginTop: '6px' }}>Arrastrar leads aquí</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Kanban;
