import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Dashboard from './components/Dashboard.jsx';
import Kanban from './components/Kanban.jsx';
import LeadList from './components/LeadList.jsx';
import AIAssistant from './components/AIAssistant.jsx';
import LeadDetails from './components/LeadDetails.jsx';
import NewLeadModal from './components/NewLeadModal.jsx';
import Login from './components/Login.jsx';
import Profile from './components/Profile.jsx';
import Equipo from './components/Equipo.jsx';
import { RefreshCw } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check localStorage for active session
  useEffect(() => {
    const storedUser = localStorage.getItem('temikia-crm-user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setCurrentTab('dashboard'); // Ensure dashboard tab is always loaded upon page access or reload
      } catch (e) {
        localStorage.removeItem('temikia-crm-user');
      }
    }
    setCheckingSession(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('temikia-crm-user', JSON.stringify(userData));
    setCurrentTab('dashboard'); // Always default to the Dashboard tab upon login
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('temikia-crm-user');
  };

  
  // Theme State (Light vs Dark)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('temikia-crm-theme') || 'light';
  });

  // Modals & Overlay Drawer States
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);

  // Synchronization trigger: toggled when a save/edit occurs to refresh DB lists
  const [triggerRefreshToggle, setTriggerRefreshToggle] = useState(false);

  // Initialize and persist theme in DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('temikia-crm-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLeadClick = (id) => {
    setSelectedLeadId(id);
  };

  const handleCloseDetails = () => {
    setSelectedLeadId(null);
  };

  const handleSaveSuccess = () => {
    setTriggerRefreshToggle(prev => !prev);
  };

  // Render the selected tab component
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard user={user} onLeadClick={handleLeadClick} />;
      case 'kanban':
        return (
          <Kanban 
            user={user}
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
            onLeadClick={handleLeadClick} 
            triggerRefreshToggle={triggerRefreshToggle} 
          />
        );
      case 'list':
        return (
          <LeadList 
            user={user}
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
            onLeadClick={handleLeadClick} 
            triggerRefreshToggle={triggerRefreshToggle} 
          />
        );
      case 'ai':
        return (
          <AIAssistant 
            user={user}
            triggerRefresh={triggerRefreshToggle} 
            onLeadClick={handleLeadClick} 
          />
        );
      case 'equipo':
        return <Equipo user={user} onLeadClick={handleLeadClick} />;
      case 'profile':
        return <Profile user={user} onUserUpdate={handleLoginSuccess} onLogout={handleLogout} />;
      default:
        return <Dashboard onLeadClick={handleLeadClick} />;
    }
  };

  if (checkingSession) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#020617', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        gap: '16px',
        color: 'var(--text-secondary)'
      }}>
        <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        <p>Cargando sesión segura Temikia...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Mobile Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* 1. Left Navigation Sidebar */}
      <Sidebar 
        user={user}
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        theme={theme}
        toggleTheme={toggleTheme}
        onLogout={handleLogout}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* 2. Main Content Area */}
      <div className="main-content">
        {/* Top Header */}
        <Header 
          currentTab={currentTab} 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          onNewLeadClick={() => setShowNewLeadModal(true)}
          setIsSidebarOpen={setIsSidebarOpen}
        />

        {/* Dynamic Page Body */}
        <main className="page-body">
          {renderTabContent()}
        </main>
      </div>

      {/* 3. Detailed Side Drawer Modal */}
      {selectedLeadId && (
        <LeadDetails 
          leadId={selectedLeadId} 
          onClose={handleCloseDetails} 
          onSaveSuccess={handleSaveSuccess} 
        />
      )}

      {/* 4. Manual Creation Pop-up Modal */}
      {showNewLeadModal && (
        <NewLeadModal 
          onClose={() => setShowNewLeadModal(false)} 
          onSaveSuccess={handleSaveSuccess} 
        />
      )}
    </div>
  );
}

export default App;
