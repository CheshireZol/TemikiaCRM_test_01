import React from 'react';
import { Search, Plus, Sparkles } from 'lucide-react';

const Header = ({ 
  currentTab, 
  searchQuery, 
  setSearchQuery, 
  onNewLeadClick 
}) => {
  
  const getTitle = () => {
    switch(currentTab) {
      case 'dashboard':
        return 'Panel Analítico';
      case 'kanban':
        return 'Pipeline Comercial';
      case 'list':
        return 'Cartera de Prospectos';
      case 'ai':
        return 'Centro de IA TemikIA';
      default:
        return 'CRM TemikIA';
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <h1 style={{ 
          fontFamily: 'var(--font-title)', 
          fontSize: '20px', 
          fontWeight: 800, 
          color: 'var(--text-main)',
          whiteSpace: 'nowrap'
        }}>
          {getTitle()}
        </h1>
      </div>

      {/* Show search only on Kanban and List tabs */}
      {(currentTab === 'kanban' || currentTab === 'list') && (
        <div style={{ flex: 1, maxLength: '380px', margin: '0 32px' }}>
          <div className="header-search-wrapper">
            <Search className="header-search-icon" size={16} />
            <input
              type="text"
              placeholder="Buscar por nombre, giro, ciudad..."
              className="header-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="header-right">
        {/* Pulsing AI Indicator */}
        <div className="header-status-ai">
          <span className="header-status-dot"></span>
          <Sparkles size={13} style={{ color: 'var(--color-ai)' }} />
          <span>Agente IA Activo</span>
        </div>

        <button className="btn btn-primary" onClick={onNewLeadClick}>
          <Plus size={16} />
          <span>Nuevo Lead</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
