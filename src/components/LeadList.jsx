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
  Eye,
  XCircle,
  Check
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
  const [limit, setLimit] = useState(() => {
    const saved = localStorage.getItem('temikia_lead_list_limit');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if ([25, 50, 100, 200].includes(parsed)) {
        return parsed;
      }
    }
    return 25; // Default limit
  });
  const [offset, setOffset] = useState(0);

  // Sorting State
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [isBatchQualifying, setIsBatchQualifying] = useState(false);
  const [isBatchSuccess, setIsBatchSuccess] = useState(false);
  const [modalError, setModalError] = useState(null);
  
  // Resizable column widths (persistent across pages & views!)
  const [colWidths, setColWidths] = useState(() => {
    const saved = localStorage.getItem('temikia_lead_list_col_widths');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved column widths:', e);
      }
    }
    return {
      nombre: 220,
      estatus: 120,
      prioridad: 110,
      giro: 150,
      ubicacion: 160,
      contacto: 200,
      lead_score: 110,
      updated_at: 150
    };
  });

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
  }, [offset, limit, sortBy, sortOrder, searchQuery, filters, asignadoAMi, triggerRefreshToggle]);

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
      setModalError('No se pudo actualizar el estatus del prospecto.');
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
      setModalError('No se pudo actualizar la prioridad del prospecto.');
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
      setModalError('No se pudo recalcular el score de este prospecto.');
    }
  };

  const handleBatchQualifyIA = async () => {
    if (!user || !user.miembroId) return;

    // Filter leads displayed on the current page that are assigned to the current user
    const myLeadsOnPage = leads.filter(lead => lead.miembro_id === user.miembroId);
    if (myLeadsOnPage.length === 0) return;

    try {
      setIsBatchQualifying(true);
      
      const promises = myLeadsOnPage.map(async (lead) => {
        const newScore = calculateAILeadScore(lead);
        const res = await fetch(`/api/prospectos/${lead.id}/score`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead_score: newScore })
        });
        if (!res.ok) throw new Error(`Error actualizando lead ${lead.id}`);
        return { id: lead.id, lead_score: newScore };
      });

      const updatedScores = await Promise.all(promises);

      // Update local state instantly
      setLeads(prev => prev.map(lead => {
        const match = updatedScores.find(item => item.id === lead.id);
        return match ? { ...lead, lead_score: match.lead_score } : lead;
      }));

      // Show temporary green success state for 1 second
      setIsBatchSuccess(true);
      setTimeout(() => {
        setIsBatchSuccess(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      setModalError('Ocurrió un error al calificar algunos leads. Se recargará la lista.');
      fetchProspects();
    } finally {
      setIsBatchQualifying(false);
    }
  };

  const handleResizeStart = (e, colKey) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[colKey] || 150;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(80, startWidth + deltaX); // Min width is 80px
      setColWidths(prev => {
        const nextWidths = {
          ...prev,
          [colKey]: newWidth
        };
        localStorage.setItem('temikia_lead_list_col_widths', JSON.stringify(nextWidths));
        return nextWidths;
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const renderEmptyRows = (count) => {
    const emptyRows = [];
    for (let i = 0; i < count; i++) {
      emptyRows.push(
        <tr 
          key={`empty-${i}`} 
          style={{ 
            height: '62px', 
            pointerEvents: 'none',
            backgroundColor: 'transparent'
          }}
        >
          <td style={{ height: '62px', padding: '8px 16px', boxSizing: 'border-box', borderBottom: '1px solid var(--border-color)' }}>&nbsp;</td>
          <td style={{ height: '62px', padding: '8px 16px', boxSizing: 'border-box', borderBottom: '1px solid var(--border-color)' }}>&nbsp;</td>
          <td style={{ height: '62px', padding: '8px 16px', boxSizing: 'border-box', borderBottom: '1px solid var(--border-color)' }}>&nbsp;</td>
          <td style={{ height: '62px', padding: '8px 16px', boxSizing: 'border-box', borderBottom: '1px solid var(--border-color)' }}>&nbsp;</td>
          <td style={{ height: '62px', padding: '8px 16px', boxSizing: 'border-box', borderBottom: '1px solid var(--border-color)' }}>&nbsp;</td>
          <td style={{ height: '62px', padding: '8px 16px', boxSizing: 'border-box', borderBottom: '1px solid var(--border-color)' }}>&nbsp;</td>
          <td style={{ height: '62px', padding: '8px 16px', boxSizing: 'border-box', borderBottom: '1px solid var(--border-color)' }}>&nbsp;</td>
          <td style={{ height: '62px', padding: '8px 16px', boxSizing: 'border-box', borderBottom: '1px solid var(--border-color)' }}>&nbsp;</td>
        </tr>
      );
    }
    return emptyRows;
  };

  const stickyHeaderStyle = (isSortable = true) => ({
    position: 'sticky',
    top: 0,
    zIndex: 15,
    backgroundColor: 'var(--bg-table-header)', // Tone slightly darker/cooler than card background, opaque
    boxShadow: 'inset 0 -1px 0 var(--border-color)', // Preserves crisp bottom border under sticky scroll
    cursor: isSortable ? 'pointer' : 'default',
    userSelect: 'none',
    paddingRight: '12px',
    verticalAlign: 'middle'
  });

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  const myLeadsOnPage = user && user.miembroId 
    ? leads.filter(lead => lead.miembro_id === user.miembroId) 
    : [];
  const hasMyLeads = myLeadsOnPage.length > 0;

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
            style={{ width: '100%', padding: searchQuery ? '10px 36px 10px 38px' : '10px 12px 10px 38px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <XCircle 
              className="header-clear-icon" 
              size={16} 
              onClick={() => setSearchQuery('')}
              title="Limpiar búsqueda"
            />
          )}
        </div>
      </div>

      {/* Search & Complex Filter panel */}
      <div className="table-card" style={{ padding: '20px', border: '1px solid var(--border-color)', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={16} style={{ color: 'var(--color-primary)' }} />
            <h3 className="card-title" style={{ fontSize: '14px', margin: 0 }}>Filtros Avanzados de Búsqueda</h3>
          </div>
          
          <button 
            type="button"
            className="btn btn-secondary btn-text" 
            onClick={() => {
              setFilters({ pais: '', ciudad: '', giro: '', owner: '', miembro_id: '', prioridad: '', estatus: '' });
              setAsignadoAMi(false);
              setOffset(0);
            }}
            style={{ 
              fontSize: '12px',
              padding: '6px 12px',
              cursor: 'pointer'
            }}
          >
            Limpiar Filtros
          </button>
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
        <div className="table-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Lista de Leads</h3>
          
          {/* Calificar IA button (relocated to where Limpiar Filtros used to be) */}
          <button
            className="btn btn-primary"
            onClick={handleBatchQualifyIA}
            disabled={isBatchQualifying || loading || !user || !user.miembroId || !hasMyLeads || myLeadsOnPage.length > 50}
            style={{ 
              padding: '6px 14px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '135px',
              gap: '6px',
              background: isBatchSuccess 
                ? 'linear-gradient(135deg, var(--color-ai) 0%, var(--color-brand-dark) 100%)' 
                : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-brand-dark) 100%)',
              color: '#FFFFFF',
              borderColor: isBatchSuccess ? 'var(--color-ai)' : 'var(--color-primary)',
              cursor: (isBatchQualifying || loading || !user || !user.miembroId || !hasMyLeads || myLeadsOnPage.length > 50) ? 'not-allowed' : 'pointer',
              opacity: (isBatchQualifying || loading || !user || !user.miembroId || !hasMyLeads || myLeadsOnPage.length > 50) ? 0.5 : 1,
              transition: 'background 0.5s ease, border-color 0.5s ease, opacity 0.3s ease',
              fontSize: '12px'
            }}
            title={
              myLeadsOnPage.length > 50
                ? `No se permite calificar más de 50 leads en lote a la vez (tienes ${myLeadsOnPage.length} asignados en esta vista)`
                : !hasMyLeads 
                  ? "No hay leads asignados a ti en esta página" 
                  : "Calificar todos los leads asignados a mí en esta página"
            }
          >
            {isBatchQualifying ? (
              <div key="loading" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', animation: 'fadeIn 0.3s ease-out' }}>
                <RefreshCw className="animate-spin" size={14} />
                <span>Calificando...</span>
              </div>
            ) : isBatchSuccess ? (
              <div key="success" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', animation: 'fadeIn 0.5s ease-in-out' }}>
                <Check size={14} />
                <span>Realizado</span>
              </div>
            ) : (
              <div key="idle" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', animation: 'fadeIn 0.3s ease-out' }}>
                <Sparkles size={14} />
                <span>Calificar IA</span>
              </div>
            )}
          </button>
        </div>

        {/* Dynamic Data Grid */}
        <div className="table-wrapper" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 340px)' }}>
          <table className="leads-table" style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: `${colWidths.nombre}px` }} />
              <col style={{ width: `${colWidths.estatus}px` }} />
              <col style={{ width: `${colWidths.prioridad}px` }} />
              <col style={{ width: `${colWidths.giro}px` }} />
              <col style={{ width: `${colWidths.ubicacion}px` }} />
              <col style={{ width: `${colWidths.contacto}px` }} />
              <col style={{ width: `${colWidths.lead_score}px` }} />
              <col style={{ width: `${colWidths.updated_at}px` }} />
            </colgroup>
            <thead>
              <tr>
                <th 
                  onClick={() => handleSort('nombre')} 
                  style={stickyHeaderStyle(true)}
                >
                  Nombre Comercial <ArrowUpDown size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                  <div 
                    onMouseDown={(e) => handleResizeStart(e, 'nombre')} 
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '100%', cursor: 'col-resize', zIndex: 20, backgroundColor: 'transparent' }}
                  />
                </th>
                <th 
                  onClick={() => handleSort('estatus')} 
                  style={stickyHeaderStyle(true)}
                >
                  Estatus <ArrowUpDown size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                  <div 
                    onMouseDown={(e) => handleResizeStart(e, 'estatus')} 
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '100%', cursor: 'col-resize', zIndex: 20, backgroundColor: 'transparent' }}
                  />
                </th>
                <th 
                  onClick={() => handleSort('prioridad')} 
                  style={stickyHeaderStyle(true)}
                >
                  Prioridad <ArrowUpDown size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                  <div 
                    onMouseDown={(e) => handleResizeStart(e, 'prioridad')} 
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '100%', cursor: 'col-resize', zIndex: 20, backgroundColor: 'transparent' }}
                  />
                </th>
                <th 
                  style={stickyHeaderStyle(false)}
                >
                  Giro Comercial
                  <div 
                    onMouseDown={(e) => handleResizeStart(e, 'giro')} 
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '100%', cursor: 'col-resize', zIndex: 20, backgroundColor: 'transparent' }}
                  />
                </th>
                <th 
                  style={stickyHeaderStyle(false)}
                >
                  Ubicación
                  <div 
                    onMouseDown={(e) => handleResizeStart(e, 'ubicacion')} 
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '100%', cursor: 'col-resize', zIndex: 20, backgroundColor: 'transparent' }}
                  />
                </th>
                <th 
                  style={stickyHeaderStyle(false)}
                >
                  Datos Contacto
                  <div 
                    onMouseDown={(e) => handleResizeStart(e, 'contacto')} 
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '100%', cursor: 'col-resize', zIndex: 20, backgroundColor: 'transparent' }}
                  />
                </th>
                <th 
                  onClick={() => handleSort('lead_score')} 
                  style={stickyHeaderStyle(true)}
                >
                  Score (IA) <ArrowUpDown size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                  <div 
                    onMouseDown={(e) => handleResizeStart(e, 'lead_score')} 
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '100%', cursor: 'col-resize', zIndex: 20, backgroundColor: 'transparent' }}
                  />
                </th>
                <th 
                  onClick={() => handleSort('updated_at')} 
                  style={stickyHeaderStyle(true)}
                >
                  Última Actividad <ArrowUpDown size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                  <div 
                    onMouseDown={(e) => handleResizeStart(e, 'updated_at')} 
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '100%', cursor: 'col-resize', zIndex: 20, backgroundColor: 'transparent' }}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.length > 0 ? (
                <>
                  {leads.map((lead) => {
                    const mails = parseStringArray(lead.correo);
                    const phones = parseStringArray(lead.telefono);
                    const isEditable = !lead.miembro_id || lead.miembro_id === '' || (user && lead.miembro_id === user.miembroId);
                    
                    return (
                      <tr key={lead.id} style={{ height: '62px' }}>
                        {/* 1. Name Column */}
                        <td className="leads-table-name-col" style={{ height: '62px', padding: '8px 16px', boxSizing: 'border-box', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', height: '100%' }}>
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
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden', minWidth: 0 }}>
                              <span style={{ 
                                fontWeight: 600,
                                color: lead.asistente_ia_activo ? 'var(--color-ai, #a855f7)' : 'inherit',
                                textShadow: lead.asistente_ia_activo ? '0 0 8px rgba(168, 85, 247, 0.35)' : 'none',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {lead.nombre}
                              </span>
                              {lead.contacto_nombre && (
                                <span className="leads-table-contact-p" style={{ marginTop: '2px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {lead.contacto_nombre} {lead.contacto_puesto ? `(${lead.contacto_puesto})` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        {/* 2. Estatus Badge Select */}
                        <td style={{ height: '62px', padding: '8px 16px', boxSizing: 'border-box', overflow: 'hidden' }}>
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
                                'var(--text-secondary)',
                              width: '100%',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden'
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
                        <td style={{ height: '62px', padding: '8px 16px', boxSizing: 'border-box', overflow: 'hidden' }}>
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
                                'var(--priority-baja-text)',
                              width: '100%',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden'
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
                        <td style={{ height: '62px', padding: '8px 16px', boxSizing: 'border-box', color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {lead.giro_nombre || lead.estilo || '-'}
                        </td>

                        {/* 5. Geolocation */}
                        <td style={{ height: '62px', padding: '8px 16px', boxSizing: 'border-box', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', overflow: 'hidden', height: '100%' }}>
                            <MapPin size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {lead.ciudad ? `${lead.ciudad}, ` : ''}{lead.pais || '-'}
                            </span>
                          </div>
                        </td>

                        {/* 6. Contacts details info */}
                        <td style={{ height: '62px', padding: '8px 16px', boxSizing: 'border-box', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px', fontSize: '12px', height: '100%', overflow: 'hidden' }}>
                            {mails.length > 0 && mails[0] !== '' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <Mail size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mails[0]}</span>
                              </div>
                            )}
                            {phones.length > 0 && phones[0] !== '' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <Phone size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{phones[0]}</span>
                              </div>
                            )}
                            {mails.length === 0 && phones.length === 0 && (
                              <span style={{ color: 'var(--text-muted)' }}>Sin datos</span>
                            )}
                          </div>
                        </td>

                        {/* 7. Lead Score Dynamic with Magic Wand */}
                        <td style={{ height: '62px', padding: '8px 16px', boxSizing: 'border-box', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-ai)', fontWeight: 700, overflow: 'hidden', height: '100%' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                                  marginLeft: 'auto',
                                  flexShrink: 0
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
                        <td style={{ height: '62px', padding: '8px 16px', boxSizing: 'border-box', color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {formatDate(lead.updated_at)}
                        </td>
                      </tr>
                    );
                  })}
                  {currentPage === totalPages ? null : renderEmptyRows(limit - leads.length)}
                </>
              ) : (
                <>
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', height: '62px', padding: '8px 16px', boxSizing: 'border-box', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                      No se encontraron prospectos que coincidan con la búsqueda.
                    </td>
                  </tr>
                  {currentPage === totalPages ? null : renderEmptyRows(limit - 1)}
                </>
              )}
            </tbody>
          </table>
        </div>
        {/* Table Page Pagination Footer */}
        <div className="pagination-controls" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px', flexWrap: 'wrap', boxSizing: 'border-box' }}>
          {/* Column 1: Total Leads Count (Left aligned) */}
          <div style={{ flex: '1 1 0%', minWidth: '160px', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
            <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Total: <strong style={{ color: 'var(--color-primary)' }}>{totalCount}</strong> {totalCount === 1 ? 'Prospecto' : 'Prospectos'}
            </span>
          </div>

          {/* Column 2: Navigation Panel (Centered) */}
          <div style={{ flex: '1 1 0%', display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: '280px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={handlePrevPage}
              disabled={offset === 0}
              style={{ 
                padding: '6px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: offset === 0 ? 0.4 : 1,
                cursor: offset === 0 ? 'not-allowed' : 'pointer',
                pointerEvents: offset === 0 ? 'none' : 'auto'
              }}
            >
              <ChevronLeft size={16} />
              <span></span>
            </button>
            
            <span style={{ minWidth: '100px', textAlign: 'center', fontWeight: 600, margin: '0 16px', color: 'var(--text-main)', fontSize: '13px', whiteSpace: 'nowrap' }}>
              Pág. {currentPage} de {totalPages}
            </span>

            <button 
              className="btn btn-secondary" 
              onClick={handleNextPage}
              disabled={offset + limit >= totalCount}
              style={{ 
                padding: '6px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: offset + limit >= totalCount ? 0.4 : 1,
                cursor: offset + limit >= totalCount ? 'not-allowed' : 'pointer',
                pointerEvents: offset + limit >= totalCount ? 'none' : 'auto'
              }}
            >
              <span></span>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Column 3: Page Size Dropdown (Right aligned) */}
          <div style={{ flex: '1 1 0%', minWidth: '160px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            <span>Mostrar</span>
            <select
              value={limit}
              onChange={(e) => {
                const newLimit = parseInt(e.target.value, 10);
                setLimit(newLimit);
                localStorage.setItem('temikia_lead_list_limit', newLimit.toString());
                setOffset(0); // Reset to first page
              }}
              className="filter-select"
              style={{
                padding: '2px 24px 2px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '12px',
                cursor: 'pointer',
                outline: 'none',
                height: '26px',
                boxSizing: 'border-box',
                appearance: 'none',
                backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px top 50%',
                backgroundSize: '8px auto'
              }}
            >
              <option value={25} style={{ backgroundColor: '#0f172a', color: '#fff' }}>25</option>
              <option value={50} style={{ backgroundColor: '#0f172a', color: '#fff' }}>50</option>
              <option value={100} style={{ backgroundColor: '#0f172a', color: '#fff' }}>100</option>
              <option value={200} style={{ backgroundColor: '#0f172a', color: '#fff' }}>200</option>
            </select>
            <span>por pág.</span>
          </div>
        </div>
      </div>

      {/* Premium Blurred Modal Dialog for Error Alerts */}
      {modalError && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setModalError(null)}
        >
          <div 
            style={{
              width: '420px',
              maxWidth: '90vw',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
              padding: '24px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button in top-right corner */}
            <button
              type="button"
              onClick={() => setModalError(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <XCircle size={18} />
            </button>

            {/* Header with error icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                flexShrink: 0
              }}>
                <XCircle size={22} />
              </div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                Atención
              </h4>
            </div>

            {/* Content Message */}
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {modalError}
            </p>

            {/* Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setModalError(null)}
                style={{ padding: '6px 16px', fontSize: '13px', cursor: 'pointer' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadList;
