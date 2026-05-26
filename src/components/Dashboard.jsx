import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Cpu, 
  TrendingUp, 
  Activity, 
  ArrowRight,
  RefreshCw,
  FolderDot,
  MapPin,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import StatCard from './StatCard.jsx';
import { formatDate } from '../utils.js';

const Dashboard = ({ user, onLeadClick }) => {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refinement Filters State
  const [filters, setFilters] = useState({
    pais: '',
    giro: '',
    owner: '',
    miembro_id: ''
  });

  const [miembros, setMiembros] = useState([]);
  const [asignadoAMi, setAsignadoAMi] = useState(false);

  // Dynamic filter options retrieved from DB
  const [filterOptions, setFilterOptions] = useState({
    paises: [],
    giros: [],
    miembros: [],
    prioridades: []
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
        console.error('Error fetching dashboard team members:', err);
      }
    };
    fetchMiembros();
  }, []);

  // 1.5 Fetch distinct dynamic filters in real time (Faceted Search)
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const params = new URLSearchParams();
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
            paises: data.paises || [],
            giros: data.giros || [],
            miembros: data.miembros || [],
            prioridades: data.prioridades || []
          });
        }
      } catch (err) {
        console.error('Error fetching dashboard dynamic filters:', err);
      }
    };
    fetchFilters();
  }, [filters, asignadoAMi]);

  // 2. Fetch KPIs using refinement parameters
  const fetchKPIs = async () => {
    try {
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (filters.pais) queryParams.append('pais', filters.pais);
      if (filters.giro) queryParams.append('giro', filters.giro);
      
      if (filters.miembro_id) {
        queryParams.append('miembro_id', filters.miembro_id);
      } else if (asignadoAMi && user && user.miembroId) {
        queryParams.append('miembro_id', user.miembroId);
      } else if (filters.owner) {
        queryParams.append('owner', filters.owner);
      }

      const res = await fetch(`/api/kpis?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Error al obtener métricas');
      const data = await res.json();
      setKpis(data);
    } catch (err) {
      console.error(err);
      setError('No se pudo conectar a la base de datos de producción.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
  }, [filters, asignadoAMi]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchKPIs();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading && !kpis) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '400px', gap: '16px', color: 'var(--text-secondary)' }}>
        <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        <p style={{ fontSize: '13.5px', fontWeight: 500 }}>Cargando analíticas comerciales en tiempo real...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ border: '1px solid var(--color-danger)', padding: '32px', textAlign: 'center', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
        <h3 style={{ color: 'var(--color-danger)', fontWeight: 700 }}>Error de Conexión</h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '450px' }}>{error} Verifica las credenciales en supabase.info y levanta el servidor backend.</p>
        <button className="btn btn-primary" onClick={fetchKPIs}>Reintentar Conexión</button>
      </div>
    );
  }

  // Pre-process Bar Chart (Giro counts)
  const barChartData = kpis.giroCounts.map(row => ({
    name: row.giro ? (row.giro.length > 22 ? row.giro.substring(0, 20) + '...' : row.giro) : 'Sin Giro',
    cantidad: parseInt(row.count, 10),
    giroCompleto: row.giro || 'Sin Giro'
  }));

  // Pre-process Pie Chart (Status counts)
  const pieChartData = kpis.statusCounts.map(row => ({
    name: row.estatus ? (row.estatus.charAt(0).toUpperCase() + row.estatus.slice(1)) : 'Sin Estatus',
    value: parseInt(row.count, 10)
  }));

  // Curated color palettes matching brandingTemikia.md
  const BAR_COLORS = ['#2563EB', '#3B82F6', '#06B6D4', '#0891B2', '#10B981', '#F59E0B'];
  const PIE_COLORS = ['#2563EB', '#06B6D4', '#10B981', '#F59E0B', '#6366F1', '#EC4899'];

  return (
    <div className="dashboard-grid">
      
      {/* 2. REFINEMENT FILTERS BAR */}
      <div className="table-card" style={{ padding: '16px 20px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={15} style={{ color: 'var(--color-ai)' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Refinar Analíticas</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select 
              value={filters.pais} 
              onChange={(e) => handleFilterChange('pais', e.target.value)}
              className="filter-select"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              <option value="">Todos los Países</option>
              {filterOptions.paises.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select 
              value={filters.giro} 
              onChange={(e) => handleFilterChange('giro', e.target.value)}
              className="filter-select"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              <option value="">Todos los Giros</option>
              {filterOptions.giros.map(g => <option key={g} value={g}>{g}</option>)}
            </select>

            <select 
              value={filters.miembro_id} 
              onChange={(e) => handleFilterChange('miembro_id', e.target.value)}
              className="filter-select"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              disabled={asignadoAMi}
            >
              <option value="">Todos los Asesores</option>
              {filterOptions.miembros.map(m => (
                <option key={m.miembro_id} value={m.miembro_id}>{m.nombre_completo}</option>
              ))}
            </select>

            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              cursor: 'pointer', 
              fontSize: '12px', 
              color: 'var(--text-main)', 
              userSelect: 'none',
              marginLeft: '6px',
              padding: '6px 12px',
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
                      owner: '',
                      miembro_id: ''
                    });
                  }
                }}
                style={{ width: '13px', height: '13px', accentColor: 'var(--color-primary)' }}
              />
              <span style={{ fontWeight: asignadoAMi ? 700 : 500, color: asignadoAMi ? 'var(--color-primary)' : 'var(--text-secondary)' }}>Asignado a mí</span>
            </label>

            {(filters.pais || filters.giro || filters.miembro_id || filters.owner || asignadoAMi) && (
              <button 
                className="btn btn-secondary btn-text" 
                onClick={() => {
                  setFilters({ pais: '', giro: '', owner: '', miembro_id: '' });
                  setAsignadoAMi(false);
                }}
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                Limpiar
              </button>
            )}
          </div>

          <button 
            className="btn btn-secondary" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px', marginLeft: 'auto' }}
          >
            <RefreshCw size={12} className={isRefreshing ? 'header-status-dot' : ''} />
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* 3. METRICS COUNTERS (KPI ROW) */}
      <div className="kpi-row">
        <StatCard
          label="Prospectos Filtrados"
          value={kpis.totalLeads.toLocaleString()}
          icon={Users}
          trend={filters.pais || filters.giro || filters.owner ? "Filtrado" : "+8.2%"}
          trendLabel={filters.pais || filters.giro || filters.owner ? "según refinamiento" : "leads nuevos esta semana"}
        />
        <StatCard
          label="Calificación Promedio"
          value={`${kpis.averageScore}/100`}
          icon={Cpu}
          trend="Excelente"
          trendLabel="calidad de leads calificados"
          aiTheme={true}
        />
        <StatCard
          label="Leads Activos en Pipeline"
          value={kpis.activeLeads.toLocaleString()}
          icon={Activity}
          trend="Activos"
          trendLabel="excluye ganados y perdidos"
        />
        <StatCard
          label="Tasa de Cierre Comercial"
          value={`${kpis.conversionRate}%`}
          icon={TrendingUp}
          trend="+2.4%"
          trendLabel="de efectividad de ventas"
          successTheme={true}
        />
      </div>

      {/* 4. ANALYTICAL GRAPH CHARTS ROW (BAR & PIE) */}
      <div className="charts-row">
        
        {/* Left: Bar Chart (Giro commercial distribution) */}
        <div className="card" style={{ flex: 1.2 }}>
          <div>
            <h3 className="card-title">Distribución por Giro de Negocio</h3>
            <p className="card-subtitle">Principales categorías de leads clasificadas en base de datos</p>
          </div>
          
          <div style={{ width: '100%', height: '280px', marginTop: '12px' }}>
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                >
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'var(--text-secondary)', fontSize: 9.5 }}
                    interval={0}
                    height={45}
                    angle={-15}
                    textAnchor="end"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-card)', 
                      borderColor: 'var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      fontFamily: 'var(--font-main)'
                    }}
                    cursor={{ fill: 'rgba(226, 232, 240, 0.2)' }}
                    formatter={(value) => [value, 'Prospectos']}
                    labelFormatter={(label, items) => items[0] ? items[0].payload.giroCompleto : label}
                  />
                  <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                <FolderDot size={36} />
                <p style={{ marginTop: '10px', fontSize: '13px' }}>Sin datos de giros comerciales.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Pie Chart (Doughnut Status distribution) */}
        <div className="card" style={{ flex: 0.8 }}>
          <div>
            <h3 className="card-title">Estatus del Pipeline Comercial</h3>
            <p className="card-subtitle">Proporción de prospectos en cada etapa de ventas</p>
          </div>

          <div style={{ width: '100%', height: '240px', marginTop: '12px', position: 'relative' }}>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-card)', 
                      borderColor: 'var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      fontFamily: 'var(--font-main)'
                    }}
                    formatter={(value) => [value, 'Leads']}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', fill: 'var(--text-secondary)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                <MapPin size={36} />
                <p style={{ marginTop: '10px', fontSize: '13px' }}>Sin estados registrados.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. RECENT PIPELINE MOVEMENTS (ROW 3 FULL-WIDTH) */}
      <div className="card" style={{ minHeight: 'auto' }}>
        <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={16} style={{ color: 'var(--color-primary)' }} />
              <span>Bitácora de Movimientos del Pipeline Recientes</span>
            </h3>
            <p className="card-subtitle">Seguimiento en vivo de las últimas modificaciones realizadas por el equipo de ventas</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '8px' }}>
          {kpis.recentActivity.length > 0 ? (
            kpis.recentActivity.map((activity) => (
              <div 
                key={activity.id} 
                className="activity-item"
                onClick={() => onLeadClick(activity.id)}
                style={{ 
                  cursor: 'pointer',
                  borderLeftColor: 
                    activity.estatus === 'ganado' ? 'var(--color-success)' :
                    activity.estatus === 'perdido' ? 'var(--color-danger)' :
                    activity.estatus === 'calificado' ? 'var(--color-ai)' :
                    'var(--border-color)'
                }}
              >
                <div className="activity-info" style={{ maxWidth: '75%' }}>
                  <span className="activity-name" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }}>{activity.nombre}</span>
                  <div className="activity-meta" style={{ marginTop: '3px' }}>
                    <span className={`badge`} style={{ 
                      fontSize: '9px',
                      padding: '1px 5px',
                      backgroundColor: 
                        activity.estatus === 'ganado' ? 'var(--status-ganado-bg)' :
                        activity.estatus === 'perdido' ? 'var(--status-perdido-bg)' :
                        activity.estatus === 'nuevo' ? 'var(--status-nuevo-bg)' :
                        activity.estatus === 'contactado' ? 'var(--status-contactado-bg)' :
                        activity.estatus === 'calificado' ? 'var(--status-calificado-bg)' :
                        'rgba(100, 116, 139, 0.1)',
                      color:
                        activity.estatus === 'ganado' ? 'var(--status-ganado-text)' :
                        activity.estatus === 'perdido' ? 'var(--status-perdido-text)' :
                        activity.estatus === 'nuevo' ? 'var(--status-nuevo-text)' :
                        activity.estatus === 'contactado' ? 'var(--status-contactado-text)' :
                        activity.estatus === 'calificado' ? 'var(--status-calificado-text)' :
                        'var(--text-secondary)'
                    }}>
                      {activity.estatus}
                    </span>
                    <span style={{ fontSize: '10px' }}>{activity.giro}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '11px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Score</span>
                    <strong style={{ color: 'var(--color-ai)', fontWeight: 800 }}>{activity.lead_score}</strong>
                  </div>
                  <ArrowRight size={13} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            ))
          ) : (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
              No hay movimientos de pipeline recientes con los filtros aplicados.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
