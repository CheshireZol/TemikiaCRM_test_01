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
  RefreshCw
} from 'lucide-react';
import { parseStringArray, formatDate } from '../utils.js';

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
  const [asignadoAMi, setAsignadoAMi] = useState(false);

  // Dynamic filter lists fetched from DB
  const [filterOptions, setFilterOptions] = useState({
    paises: [],
    ciudades: [],
    giros: [],
    owners: []
  });

  // 1. Fetch distinct filters and members
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch('/api/filtros');
        if (res.ok) {
          const data = await res.json();
          setFilterOptions({
            paises: data.paises,
            ciudades: data.ciudades,
            giros: data.giros,
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
              <option value="nuevo">Nuevo Lead</option>
              <option value="contactado">Contactado</option>
              <option value="calificado">Calificado (IA)</option>
              <option value="propuesta">Propuesta</option>
              <option value="ganado">Ganado</option>
              <option value="perdido">Perdido</option>
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
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
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
              {miembros.map(m => <option key={m.miembro_id} value={m.miembro_id}>{m.nombre_completo}</option>)}
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
                  setAsignadoAMi(e.target.checked);
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
                  
                  return (
                    <tr key={lead.id} onClick={() => onLeadClick(lead.id)}>
                      {/* 1. Name Column */}
                      <td className="leads-table-name-col">
                        <div>{lead.nombre}</div>
                        {lead.contacto_nombre && (
                          <span className="leads-table-contact-p">
                            {lead.contacto_nombre} {lead.contacto_puesto ? `(${lead.contacto_puesto})` : ''}
                          </span>
                        )}
                      </td>
                      
                      {/* 2. Estatus Badge */}
                      <td>
                        <span className="badge" style={{
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
                        }}>
                          {lead.estatus}
                        </span>
                      </td>

                      {/* 3. Priority Badge */}
                      <td>
                        <span className="badge" style={{
                          backgroundColor: 
                            lead.prioridad === 'alta' ? 'var(--priority-alta-bg)' :
                            lead.prioridad === 'media' ? 'var(--priority-media-bg)' :
                            'var(--priority-baja-bg)',
                          color:
                            lead.prioridad === 'alta' ? 'var(--priority-alta-text)' :
                            lead.prioridad === 'media' ? 'var(--priority-media-text)' :
                            'var(--priority-baja-text)'
                        }}>
                          {lead.prioridad}
                        </span>
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

                      {/* 7. Lead Score Dynamic */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-ai)', fontWeight: 700 }}>
                          <Sparkles size={14} />
                          <span>{lead.lead_score}</span>
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
