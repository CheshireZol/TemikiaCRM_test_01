import React, { useState, useEffect } from 'react';
import { 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Sparkles,
  MapPin,
  Mail,
  Phone,
  SlidersHorizontal,
  RefreshCw,
  Wand2,
  Eye
} from 'lucide-react';
import { parseStringArray, formatDate, calculateAILeadScore } from '../utils.js';

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

const LeadList = ({ user, searchQuery, setSearchQuery, onLeadClick, triggerRefreshToggle }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination State
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(25); // Show 25 records per page
  const [offset, setOffset] = useState(0);

  // Sorting State
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Filter States
  const [filters, setFilters] = useState({
    pais: '',
    ciudad: '',
    giro: '',
    owner: '',
    miembro_id: '',
    prioridad: '',
    estatus: ''
  });

  const [miembros, setMiembros] = useState([]);
  const [asignadoAMi, setAsignadoAMi] = useState(true);

  // Dynamic filter lists fetched from DB (Faceted Search v4)
  const [filterOptions, setFilterOptions] = useState({
    paises: [],
    ciudades: [],
    giros: [],
    miembros: [],
    estatuses: [],
    prioridades: []
  });

  // 1. Fetch static team members catalog once
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

  // 2. Fetch distinct dynamic filters in real time (Faceted Search)
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
          setFilterOptions({
            paises: data.paises,
            ciudades: data.ciudades,
            giros: data.giros,
            miembros: data.miembros || [],
            estatuses: data.estatuses || [],
            prioridades: data.prioridades || []
          });
        }
      } catch (err) {
        console.error('Error fetching dynamic filters:', err);
      }
    };
    fetchFilters();
  }, [filters, asignadoAMi, triggerRefreshToggle]);

  // 2. Fetch paginated prospects
  const fetchProspects = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit,
        offset,
        sortBy,
        sortOrder,
        q: searchQuery
      });

      // Append active filters
      Object.keys(filters).forEach(key => {
        if (key !== 'miembro_id' && key !== 'owner' && filters[key]) {
          params.append(key, filters[key]);
        }
      });

      if (filters.miembro_id) {
        params.append('miembro_id', filters.miembro_id);
      } else if (asignadoAMi && user && user.miembroId) {
        params.append('miembro_id', user.miembroId);
      } else if (filters.owner) {
        params.append('owner', filters.owner);
      }

      const res = await fetch(`/api/prospectos?${params.toString()}`);
      if (!res.ok) throw new Error('Error al obtener lista de leads.');
      const data = await res.json();
      
      setLeads(data.rows);
      setTotalCount(data.totalCount);
    } catch (err) {
      console.error(err);
      setError('Error al consultar datos en PostgreSQL. Por favor intente más tarde.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProspects();
  }, [offset, sortBy, sortOrder, searchQuery, filters, asignadoAMi, triggerRefreshToggle]);

  // Reset page to 1 when filters or search query changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setOffset(0);
  };

  // Toggle sorting column
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('DESC');
    }
    setOffset(0);
  };

  const handleNextPage = () => {
    if (offset + limit < totalCount) {
      setOffset(prev => prev + limit);
    }
  };

  const handlePrevPage = () => {
    if (offset > 0) {
      setOffset(prev => Math.max(0, prev - limit));
    }
  };

  const handleUpdateStatus = async (leadId, newStatus) => {
    try {
      const res = await fetch(`/api/prospectos/${leadId}/estatus`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus: newStatus })
      });
      if (!res.ok) throw new Error('Error al actualizar estatus');
      
      // Update local state instantly
      setLeads(prev => prev.map(lead => lead.id === leadId ? { ...lead, estatus: newStatus } : lead));
    } catch (err) {
      console.error(err);
      alert('No se pudo actualizar el estatus del prospecto.');
    }
  };

  const handleUpdatePriority = async (leadId, newPriority) => {
    try {
      const res = await fetch(`/api/prospectos/${leadId}/prioridad`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prioridad: newPriority })
      });
      if (!res.ok) throw new Error('Error al actualizar prioridad');
      
      // Update local state instantly
      setLeads(prev => prev.map(lead => lead.id === leadId ? { ...lead, prioridad: newPriority } : lead));
    } catch (err) {
      console.error(err);
      alert('No se pudo actualizar la prioridad del prospecto.');
    }
  };

  const handleRecalculateAIScore = async (lead) => {
    try {
      // Calculate AI Score locally
      const newScore = calculateAILeadScore(lead);
      
      const res = await fetch(`/api/prospectos/${lead.id}/score`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_score: newScore })
      });
      if (!res.ok) throw new Error('Error al actualizar score');
      
      // Update local state instantly
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, lead_score: newScore } : l));
    } catch (err) {
      console.error(err);
      alert('No se pudo recalcular el score de este prospecto.');
    }
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  if (loading && leads.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>
        <RefreshCw size={24} className="header-status-dot" style={{ animation: 'pulse-glow 1.5s infinite' }} />
        <p style={{ marginTop: '12px' }}>Cargando cartera de leads...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Mobile-only Search Bar */}
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

      {/* Search & Complex Filter panel */}
      <div className="table-card" style={{ padding: '20px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <SlidersHorizontal size={16} style={{ color: 'var(--color-primary)' }} />
          <h3 className="card-title" style={{ fontSize: '14px' }}>Filtros Avanzados de Búsqueda</h3>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
          gap: '12px' 
        }}>
          {/* Status Filter */}
          <div className="property-item">
            <label className="property-label">Estado del Pipeline</label>
            <select 
              value={filters.estatus} 
              onChange={(e) => handleFilterChange('estatus', e.target.value)}
              className="filter-select"
              style={{ width: '100%' }}
            >
              <option value="">Todos los Estados</option>
              {filterOptions.estatuses.map(e => (
                <option key={e} value={e}>{statusLabels[e] || e}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="property-item">
            <label className="property-label">Prioridad</label>
            <select 
              value={filters.prioridad} 
              onChange={(e) => handleFilterChange('prioridad', e.target.value)}
              className="filter-select"
              style={{ width: '100%' }}
            >
              <option value="">Cualquier Prioridad</option>
              {filterOptions.prioridades.map(p => (
                <option key={p} value={p}>{priorityLabels[p] || p}</option>
              ))}
            </select>
          </div>

          {/* Country Filter */}
          <div className="property-item">
            <label className="property-label">País</label>
            <select 
              value={filters.pais} 
              onChange={(e) => handleFilterChange('pais', e.target.value)}
              className="filter-select"
              style={{ width: '100%' }}
            >
              <option value="">Todos los Países</option>
              {filterOptions.paises.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Giro/Style Filter */}
          <div className="property-item">
            <label className="property-label">Giro Comercial</label>
            <select 
              value={filters.giro} 
              onChange={(e) => handleFilterChange('giro', e.target.value)}
              className="filter-select"
              style={{ width: '100%' }}
            >
              <option value="">Cualquier Giro</option>
              {filterOptions.giros.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Owner Filter */}
          <div className="property-item">
            <label className="property-label">Ejecutivo Asignado</label>
            <select 
              value={filters.miembro_id} 
              onChange={(e) => handleFilterChange('miembro_id', e.target.value)}
              className="filter-select"
              style={{ width: '100%' }}
              disabled={asignadoAMi}
            >
              <option value="">Cualquier Asesor</option>
              {filterOptions.miembros.map(m => (
                <option key={m.miembro_id} value={m.miembro_id}>{m.nombre_completo}</option>
              ))}
            </select>
          </div>

          {/* Asignado a Mí Checkbox Filter */}
          <div className="property-item" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              cursor: 'pointer', 
              fontSize: '13.5px', 
              color: 'var(--text-main)', 
              userSelect: 'none',
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: asignadoAMi ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-card)',
              borderColor: asignadoAMi ? 'var(--color-primary)' : 'var(--border-color)',
              transition: 'all var(--transition-fast)',
              height: '38px',
              boxSizing: 'border-box'
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
                      ciudad: '',
                      giro: '',
                      owner: '',
                      miembro_id: '',
                      prioridad: '',
                      estatus: ''
                    });
                  }
                  setOffset(0);
                }}
                style={{ width: '13px', height: '13px', accentColor: 'var(--color-primary)' }}
              />
              <span style={{ fontWeight: asignadoAMi ? 700 : 500, color: asignadoAMi ? 'var(--color-primary)' : 'var(--text-secondary)' }}>Asignado a mí</span>
            </label>
          </div>
        </div>
      </div>

      {/* Advanced lead list grid */}
      <div className="table-card">
        {/* Table header indicators */}
        <div className="table-controls">
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Mostrando registros del <strong>{offset + 1}</strong> al <strong>{Math.min(offset + limit, totalCount)}</strong> de un total de <strong>{totalCount}</strong> prospectos.
          </span>
          
          <button 
            className="btn btn-secondary btn-text" 
            onClick={() => {
              setFilters({ pais: '', ciudad: '', giro: '', owner: '', miembro_id: '', prioridad: '', estatus: '' });
              setAsignadoAMi(false);
              setOffset(0);
            }}
            style={{ fontSize: '12px' }}
          >
            Limpiar Filtros
          </button>
        </div>

        {/* Dynamic Data Grid */}
        <div className="table-wrapper">
          <table className="leads-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('nombre')} style={{ cursor: 'pointer' }}>
                  Nombre Comercial <ArrowUpDown size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                </th>
                <th onClick={() => handleSort('estatus')} style={{ cursor: 'pointer', width: '120px' }}>
                  Estatus <ArrowUpDown size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                </th>
                <th onClick={() => handleSort('prioridad')} style={{ cursor: 'pointer', width: '100px' }}>
                  Prioridad <ArrowUpDown size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                </th>
                <th>Giro Comercial</th>
                <th>Ubicación</th>
                <th>Datos Contacto</th>
                <th onClick={() => handleSort('lead_score')} style={{ cursor: 'pointer', width: '110px' }}>
                  Score (IA) <ArrowUpDown size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                </th>
                <th onClick={() => handleSort('updated_at')} style={{ cursor: 'pointer', width: '150px' }}>
                  Última Actividad <ArrowUpDown size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.length > 0 ? (
                leads.map((lead) => {
                  const mails = parseStringArray(lead.correo);
                  const phones = parseStringArray(lead.telefono);
                  const isEditable = !lead.miembro_id || lead.miembro_id === '' || (user && lead.miembro_id === user.miembroId);
                  
                  return (
                    <tr key={lead.id}>
                      {/* 1. Name Column */}
                      <td className="leads-table-name-col">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => onLeadClick(lead.id)}
                            style={{
                              background: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                              borderRadius: '6px',
                              padding: '4px 6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: 'var(--color-primary)',
                              transition: 'all 0.2s',
                              flexShrink: 0
                            }}
                            title="Ver Detalle del Lead"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            <Eye size={12} />
                          </button>
                          <span style={{ 
                            fontWeight: 600,
                            color: lead.asistente_ia_activo ? 'var(--color-ai, #a855f7)' : 'inherit',
                            textShadow: lead.asistente_ia_activo ? '0 0 8px rgba(168, 85, 247, 0.35)' : 'none'
                          }}>
                            {lead.nombre}
                          </span>
                        </div>
                        {lead.contacto_nombre && (
                          <span className="leads-table-contact-p" style={{ marginTop: '2px', display: 'block' }}>
                            {lead.contacto_nombre} {lead.contacto_puesto ? `(${lead.contacto_puesto})` : ''}
                          </span>
                        )}
                      </td>
                      
                      {/* 2. Estatus Badge Select */}
                      <td>
                        <select
                          value={lead.estatus}
                          disabled={!isEditable}
                          onClick={(e) => e.stopPropagation()}
                          onChange={async (e) => {
                            e.stopPropagation();
                            await handleUpdateStatus(lead.id, e.target.value);
                          }}
                          className="badge"
                          style={{
                            cursor: isEditable ? 'pointer' : 'not-allowed',
                            opacity: isEditable ? 1 : 0.6,
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            outline: 'none',
                            fontWeight: 600,
                            fontSize: '11px',
                            textTransform: 'capitalize',
                            padding: '4px 20px 4px 8px',
                            borderRadius: '6px',
                            appearance: 'none',
                            backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20opacity%3D%220.5%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 6px top 50%',
                            backgroundSize: '8px auto',
                            backgroundColor: 
                              lead.estatus === 'ganado' ? 'var(--status-ganado-bg)' :
                              lead.estatus === 'perdido' ? 'var(--status-perdido-bg)' :
                              lead.estatus === 'nuevo' ? 'var(--status-nuevo-bg)' :
                              lead.estatus === 'contactado' ? 'var(--status-contactado-bg)' :
                              lead.estatus === 'calificado' ? 'var(--status-calificado-bg)' :
                              'rgba(100, 116, 139, 0.1)',
                            color:
                              lead.estatus === 'ganado' ? 'var(--status-ganado-text)' :
                              lead.estatus === 'perdido' ? 'var(--status-perdido-text)' :
                              lead.estatus === 'nuevo' ? 'var(--status-nuevo-text)' :
                              lead.estatus === 'contactado' ? 'var(--status-contactado-text)' :
                              lead.estatus === 'calificado' ? 'var(--status-calificado-text)' :
                              'var(--text-secondary)'
                          }}
                        >
                          {Object.keys(statusLabels).map((key) => (
                            <option key={key} value={key} style={{ backgroundColor: '#0f172a', color: '#fff' }}>
                              {statusLabels[key]}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 3. Priority Badge Select */}
                      <td>
                        <select
                          value={lead.prioridad}
                          disabled={!isEditable}
                          onClick={(e) => e.stopPropagation()}
                          onChange={async (e) => {
                            e.stopPropagation();
                            await handleUpdatePriority(lead.id, e.target.value);
                          }}
                          className="badge"
                          style={{
                            cursor: isEditable ? 'pointer' : 'not-allowed',
                            opacity: isEditable ? 1 : 0.6,
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            outline: 'none',
                            fontWeight: 600,
                            fontSize: '11px',
                            textTransform: 'capitalize',
                            padding: '4px 20px 4px 8px',
                            borderRadius: '6px',
                            appearance: 'none',
                            backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20opacity%3D%220.5%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 6px top 50%',
                            backgroundSize: '8px auto',
                            backgroundColor: 
                              lead.prioridad === 'alta' ? 'var(--priority-alta-bg)' :
                              lead.prioridad === 'media' ? 'var(--priority-media-bg)' :
                              'var(--priority-baja-bg)',
                            color:
                              lead.prioridad === 'alta' ? 'var(--priority-alta-text)' :
                              lead.prioridad === 'media' ? 'var(--priority-media-text)' :
                              'var(--priority-baja-text)'
                          }}
                        >
                          {Object.keys(priorityLabels).map((key) => (
                            <option key={key} value={key} style={{ backgroundColor: '#0f172a', color: '#fff' }}>
                              {priorityLabels[key]}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 4. Giro (Style) */}
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {lead.giro_nombre || lead.estilo || '-'}
                      </td>

                      {/* 5. Geolocation */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                          <MapPin size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lead.ciudad ? `${lead.ciudad}, ` : ''}{lead.pais || '-'}
                          </span>
                        </div>
                      </td>

                      {/* 6. Contacts details info */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                          {mails.length > 0 && mails[0] !== '' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                              <Mail size={12} style={{ color: 'var(--text-muted)' }} />
                              <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mails[0]}</span>
                            </div>
                          )}
                          {phones.length > 0 && phones[0] !== '' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                              <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                              <span>{phones[0]}</span>
                            </div>
                          )}
                          {mails.length === 0 && phones.length === 0 && (
                            <span style={{ color: 'var(--text-muted)' }}>Sin datos</span>
                          )}
                        </div>
                      </td>

                      {/* 7. Lead Score Dynamic with Magic Wand */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-ai)', fontWeight: 700 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Sparkles size={14} />
                            <span>{lead.lead_score}</span>
                          </span>
                          
                          {isEditable && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleRecalculateAIScore(lead);
                              }}
                              style={{
                                background: 'rgba(168, 85, 247, 0.1)',
                                border: '1px solid rgba(168, 85, 247, 0.2)',
                                borderRadius: '4px',
                                padding: '4px 6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--color-ai)',
                                transition: 'all 0.2s',
                                marginLeft: 'auto'
                              }}
                              title="Recalcular Score con IA"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.2)';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.1)';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              <Wand2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 8. Updated Time */}
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {formatDate(lead.updated_at)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No se encontraron prospectos que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Page Pagination Footer */}
        <div className="pagination-controls">
          <span>
            Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> (<strong>{leads.length}</strong> items cargados)
          </span>

          <div className="pagination-btn-group">
            <button 
              className="btn btn-secondary" 
              onClick={handlePrevPage}
              disabled={offset === 0}
              style={{ padding: '6px 12px' }}
            >
              <ChevronLeft size={16} />
              <span>Anterior</span>
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={handleNextPage}
              disabled={offset + limit >= totalCount}
              style={{ padding: '6px 12px' }}
            >
              <span>Siguiente</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadList;
