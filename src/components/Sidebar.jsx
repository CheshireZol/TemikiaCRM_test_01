import React from 'react';
import { 
  LayoutDashboard, 
  KanbanSquare, 
  TableProperties, 
  Cpu, 
  ChevronLeft, 
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  User
} from 'lucide-react';

const Sidebar = ({ 
  user,
  currentTab, 
  setCurrentTab, 
  isCollapsed, 
  setIsCollapsed, 
  theme, 
  toggleTheme,
  onLogout,
  isSidebarOpen,
  setIsSidebarOpen
}) => {
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kanban', label: 'Pipeline Kanban', icon: KanbanSquare },
    { id: 'list', label: 'Lista de Leads', icon: TableProperties },
    { id: 'ai', label: 'Asistente IA', icon: Cpu },
    { id: 'profile', label: 'Mi Perfil', icon: User }
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  const initials = getInitials(user ? user.nombreCompleto : '');

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isSidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-header" style={{ padding: isCollapsed ? '16px 10px' : '20px 20px', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '10px' }}>
        <img 
          src="/logo.png" 
          alt="TemikIA Logo" 
          style={{ 
            width: '40px', 
            height: '40px', 
            objectFit: 'contain',
            flexShrink: 0
          }} 
        />
        {!isCollapsed && (
          <span className="sidebar-brand-name" style={{ fontSize: '17px', color: 'var(--text-white)' }}>
            TemikIA
          </span>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => {
                setCurrentTab(item.id);
                if (setIsSidebarOpen) setIsSidebarOpen(false);
              }}
              className={`sidebar-link ${currentTab === item.id ? 'active' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <IconComponent size={20} />
              {!isCollapsed && <span>{item.label}</span>}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div 
          className="sidebar-user" 
          onClick={() => {
            setCurrentTab('profile');
            if (setIsSidebarOpen) setIsSidebarOpen(false);
          }}
          style={{ 
            cursor: 'pointer', 
            transition: 'opacity var(--transition-fast)' 
          }}
          title="Ver mi perfil"
          onMouseEnter={(e) => e.currentTarget.style.opacity = 0.8}
          onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
        >
          <div className="sidebar-avatar" style={{ padding: 0, overflow: 'hidden' }}>
            {user && user.fotoUrl ? (
              <img 
                src={user.fotoUrl} 
                alt="Avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          {!isCollapsed && (
            <div className="sidebar-username-group" style={{ maxWidth: '140px', overflow: 'hidden' }}>
              <p className="sidebar-username" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user ? user.nombreCompleto : 'TemikIA Agency'}
              </p>
              <p style={{ fontSize: '10px', color: '#64748B', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user && user.cargo ? user.cargo : 'Sales Executive'}
              </p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
          <button 
            onClick={toggleTheme} 
            className="sidebar-collapse-btn" 
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
            style={{ width: '32px', height: '32px' }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="sidebar-collapse-btn"
            title={isCollapsed ? 'Expandir Sidebar' : 'Colapsar Sidebar'}
            style={{ width: '32px', height: '32px' }}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
