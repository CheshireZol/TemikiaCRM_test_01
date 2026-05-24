import React, { useState, useEffect } from 'react';
import { User, Shield, Phone, MapPin, Mail, Sparkles, Pencil, Key, RefreshCw, CheckCircle, LogOut, ChevronDown, ChevronUp, Lock, FileText, X, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

const Profile = ({ user, onUserUpdate, onLogout }) => {
  const [profile, setProfile] = useState({
    nombre_completo: '',
    nombre_corto: '',
    telefono: '',
    email: '',
    pais: '',
    ciudad: '',
    cargo: '',
    foto_url: '',
    notas: ''
  });

  // Backup state to restore on Cancel
  const [backupProfile, setBackupProfile] = useState(null);

  // Inline editing state
  const [editingField, setEditingField] = useState(null); // 'nombre_corto' | 'telefono' | 'pais' | 'ciudad' | 'notas' | null
  const [tempValue, setTempValue] = useState('');

  // Password fields
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Collapsible toggle
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  // Statuses
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passError, setPassError] = useState('');

  // Fetch full team member profile details from DB
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !user.miembroId) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/auth/profile/${user.miembroId}`);
        if (!res.ok) throw new Error('Error al cargar perfil de miembro.');
        const data = await res.json();
        
        const loadedProfile = {
          nombre_completo: data.nombre_completo || '',
          nombre_corto: data.nombre_corto || '',
          telefono: data.telefono || '',
          email: data.email || user.email || '',
          pais: data.pais || '',
          ciudad: data.ciudad || '',
          cargo: data.cargo || '',
          foto_url: data.foto_url || '',
          notas: data.notas || ''
        };

        setProfile(loadedProfile);
        setBackupProfile(loadedProfile);
      } catch (err) {
        console.error(err);
        setError('No se pudo conectar a la base de datos para cargar su perfil.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handlePassChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
  };

  // Convert uploaded image file to client-side base64 string
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, suba únicamente archivos de imagen.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen es demasiado grande. El límite de subida es de 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      const base64Data = uploadEvent.target.result;
      
      // Update local state instantly for premium visual feedback
      setProfile(prev => ({ ...prev, foto_url: base64Data }));

      // Save directly to the DB so the photo is updated even if they don't click edit!
      try {
        setLoading(true);
        const res = await fetch(`/api/auth/profile/${user.miembroId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...profile,
            foto_url: base64Data
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al actualizar foto.');

        setSaveSuccess(true);
        // Sync context
        if (onUserUpdate) {
          onUserUpdate({
            ...user,
            fotoUrl: base64Data
          });
        }
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (err) {
        console.error(err);
        setError('Error al actualizar la foto de perfil en base de datos.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save specific field directly to PostgreSQL
  const handleSaveField = async (fieldKey, newValue) => {
    setError('');
    setSaveSuccess(false);

    try {
      setLoading(true);
      const updatedProfile = {
        ...profile,
        [fieldKey]: newValue
      };

      const res = await fetch(`/api/auth/profile/${user.miembroId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfile)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al actualizar perfil.');

      // Update local state and backups
      setProfile(updatedProfile);
      setBackupProfile(updatedProfile);
      setEditingField(null);
      setSaveSuccess(true);

      // Trigger sparkles
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { x: 0.8, y: 0.2 },
        colors: ['#06B6D4', '#2563EB']
      });

      // Sync user sidebar/header context
      if (onUserUpdate) {
        onUserUpdate({
          ...user,
          nombreCompleto: data.profile.nombre_completo || data.profile.nombre_corto || 'Miembro',
          nombreCorto: data.profile.nombre_corto || 'Miembro',
          fotoUrl: data.profile.foto_url || ''
        });
      }

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit voluntary password change with strict security rules
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError('');
    setPasswordSuccess(false);

    if (!passwords.oldPassword || !passwords.newPassword || !passwords.confirmPassword) {
      setPassError('Todos los campos de contraseña son obligatorios.');
      return;
    }

    // Strict validation: min 8 chars, numbers, symbols, uppercase, lowercase
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};\':",\\|.<>\/?]).{8,}$/;
    if (!passwords.newPassword.match(passwordRegex)) {
      setPassError('Contraseña débil: Debe tener al menos 8 caracteres, e incluir letras mayúsculas, minúsculas, números y símbolos especiales.');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPassError('La confirmación de la contraseña no coincide.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: profile.email || user.email,
          oldPassword: passwords.oldPassword,
          newPassword: passwords.newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al cambiar contraseña.');

      setPasswordSuccess(true);
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordChange(false); // Collapse form upon success
      
      confetti({
        particleCount: 60,
        spread: 80,
        colors: ['#10B981', '#06B6D4']
      });

      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setPassError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Compute initials for profile placeholder
  const getInitials = () => {
    const name = profile.nombre_completo || profile.nombre_corto || user.nombreCompleto || '';
    if (!name) return 'TM';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* HEADER SECTION WITH TITLE & LOGOUT BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '16px 24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <User size={20} style={{ color: 'var(--color-primary)' }} />
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Configuración de Perfil</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Gestione sus credenciales y datos de equipo corporativo</p>
          </div>
        </div>

        <button 
          type="button" 
          onClick={onLogout}
          className="btn"
          style={{ 
            padding: '8px 16px', 
            fontSize: '12.5px', 
            fontWeight: 600,
            color: '#EF4444', 
            borderColor: 'rgba(239, 68, 68, 0.2)',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            borderRadius: 'var(--radius-sm)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
          }}
        >
          <LogOut size={14} />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      {/* CORE PROFILE CARD */}
      <div className="card" style={{ minHeight: 'auto', padding: '32px' }}>
        
        {/* Save success notifications */}
        {saveSuccess && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)', fontSize: '13px', fontWeight: 600, backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '20px' }}>
            <CheckCircle size={16} />
            <span>¡Datos de perfil actualizados exitosamente en PostgreSQL!</span>
          </div>
        )}

        {passwordSuccess && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)', fontSize: '13px', fontWeight: 600, backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '20px' }}>
            <CheckCircle size={16} />
            <span>¡Su contraseña se ha actualizado con éxito!</span>
          </div>
        )}

        {error && (
          <div className="login-alert error" style={{ marginBottom: '20px' }}>
            <span>{error}</span>
          </div>
        )}

        {/* PROFILE GENERAL FIELDS FORM */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Avatar Area with circular hover edit pencil icon overlay */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px' }}>
            <div style={{ position: 'relative', width: '96px', height: '96px' }}>
              
              {/* Profile Image Circle */}
              <div style={{ 
                width: '96px', 
                height: '96px', 
                borderRadius: '50%', 
                overflow: 'hidden', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'rgba(6, 182, 212, 0.08)',
                border: '2px solid rgba(6, 182, 212, 0.25)',
                color: 'var(--color-ai)',
                fontSize: '30px',
                fontWeight: 800,
                boxShadow: 'var(--shadow-sm)',
                transition: 'opacity 0.2s ease'
              }}>
                {profile.foto_url ? (
                  <img 
                    src={profile.foto_url} 
                    alt="Profile Avatar" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              {/* Svelte Pencil Overlay for Upload */}
              <label 
                style={{
                  position: 'absolute',
                  bottom: '0px',
                  right: '0px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  border: '2px solid var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'all 0.2s ease',
                  color: '#FFFFFF'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Actualizar foto de perfil"
              >
                <Pencil size={13} />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <span className="badge" style={{ backgroundColor: 'rgba(6, 182, 212, 0.08)', color: 'var(--color-ai)', fontSize: '10px', alignSelf: 'flex-start', border: '1px solid rgba(6, 182, 212, 0.15)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {profile.cargo || 'Colaborador'}
              </span>
              
              {/* STICKY READONLY FULL NAME (NEVER EDITABLE) */}
              <h4 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
                {profile.nombre_completo || 'Miembro de Equipo'}
              </h4>
              
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                {profile.email}
              </p>
            </div>
          </div>

          {/* Form Properties Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* 1. Nombre Corto (Apodo) - EDITABLE contextually */}
            <div className="property-item" style={{ position: 'relative' }}>
              <label className="property-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>Nombre Corto (Apodo)</span>
                {editingField !== 'nombre_corto' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingField('nombre_corto');
                      setTempValue(profile.nombre_corto);
                    }}
                    style={{ background: 'none', border: 'none', padding: '2px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontSize: '11.5px', fontWeight: 600, fontFamily: 'inherit' }}
                  >
                    <Pencil size={11} />
                    <span>Modificar</span>
                  </button>
                )}
              </label>

              {editingField === 'nombre_corto' ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                  <input 
                    type="text" 
                    value={tempValue} 
                    onChange={(e) => setTempValue(e.target.value)} 
                    className="property-input"
                    style={{ flex: 1 }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveField('nombre_corto', tempValue);
                      if (e.key === 'Escape') setEditingField(null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveField('nombre_corto', tempValue)}
                    disabled={loading}
                    style={{ padding: '8px', backgroundColor: 'var(--color-success)', color: '#FFF', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '36px', width: '36px' }}
                    title="Guardar"
                  >
                    {loading ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingField(null)}
                    disabled={loading}
                    style={{ padding: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '36px', width: '36px' }}
                    title="Cancelar"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '14px', color: 'var(--text-main)', minHeight: '40px', backgroundColor: 'var(--bg-main)' }}>
                  {profile.nombre_corto || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No especificado</span>}
                </div>
              )}
            </div>

            {/* 2. Teléfono - EDITABLE contextually */}
            <div className="property-item">
              <label className="property-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>Teléfono de Contacto</span>
                {editingField !== 'telefono' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingField('telefono');
                      setTempValue(profile.telefono);
                    }}
                    style={{ background: 'none', border: 'none', padding: '2px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontSize: '11.5px', fontWeight: 600, fontFamily: 'inherit' }}
                  >
                    <Pencil size={11} />
                    <span>Modificar</span>
                  </button>
                )}
              </label>

              {editingField === 'telefono' ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Phone size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      value={tempValue} 
                      onChange={(e) => setTempValue(e.target.value)} 
                      className="property-input"
                      style={{ paddingLeft: '34px' }}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveField('telefono', tempValue);
                        if (e.key === 'Escape') setEditingField(null);
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveField('telefono', tempValue)}
                    disabled={loading}
                    style={{ padding: '8px', backgroundColor: 'var(--color-success)', color: '#FFF', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '36px', width: '36px' }}
                    title="Guardar"
                  >
                    {loading ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingField(null)}
                    disabled={loading}
                    style={{ padding: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '36px', width: '36px' }}
                    title="Cancelar"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', minHeight: '40px', backgroundColor: 'var(--bg-main)' }}>
                  <Phone size={14} style={{ color: 'var(--text-secondary)' }} />
                  <span>{profile.telefono || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin número</span>}</span>
                </div>
              )}
            </div>

            {/* 3. País - EDITABLE contextually */}
            <div className="property-item">
              <label className="property-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>País de Residencia</span>
                {editingField !== 'pais' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingField('pais');
                      setTempValue(profile.pais);
                    }}
                    style={{ background: 'none', border: 'none', padding: '2px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontSize: '11.5px', fontWeight: 600, fontFamily: 'inherit' }}
                  >
                    <Pencil size={11} />
                    <span>Modificar</span>
                  </button>
                )}
              </label>

              {editingField === 'pais' ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <MapPin size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      value={tempValue} 
                      onChange={(e) => setTempValue(e.target.value)} 
                      className="property-input"
                      style={{ paddingLeft: '34px' }}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveField('pais', tempValue);
                        if (e.key === 'Escape') setEditingField(null);
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveField('pais', tempValue)}
                    disabled={loading}
                    style={{ padding: '8px', backgroundColor: 'var(--color-success)', color: '#FFF', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '36px', width: '36px' }}
                    title="Guardar"
                  >
                    {loading ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingField(null)}
                    disabled={loading}
                    style={{ padding: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '36px', width: '36px' }}
                    title="Cancelar"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', minHeight: '40px', backgroundColor: 'var(--bg-main)' }}>
                  <MapPin size={14} style={{ color: 'var(--text-secondary)' }} />
                  <span>{profile.pais || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin definir</span>}</span>
                </div>
              )}
            </div>

            {/* 4. Ciudad - EDITABLE contextually */}
            <div className="property-item">
              <label className="property-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>Ciudad</span>
                {editingField !== 'ciudad' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingField('ciudad');
                      setTempValue(profile.ciudad);
                    }}
                    style={{ background: 'none', border: 'none', padding: '2px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontSize: '11.5px', fontWeight: 600, fontFamily: 'inherit' }}
                  >
                    <Pencil size={11} />
                    <span>Modificar</span>
                  </button>
                )}
              </label>

              {editingField === 'ciudad' ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                  <input 
                    type="text" 
                    value={tempValue} 
                    onChange={(e) => setTempValue(e.target.value)} 
                    className="property-input"
                    style={{ flex: 1 }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveField('ciudad', tempValue);
                      if (e.key === 'Escape') setEditingField(null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveField('ciudad', tempValue)}
                    disabled={loading}
                    style={{ padding: '8px', backgroundColor: 'var(--color-success)', color: '#FFF', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '36px', width: '36px' }}
                    title="Guardar"
                  >
                    {loading ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingField(null)}
                    disabled={loading}
                    style={{ padding: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '36px', width: '36px' }}
                    title="Cancelar"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '14px', color: 'var(--text-main)', minHeight: '40px', backgroundColor: 'var(--bg-main)' }}>
                  {profile.ciudad || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin definir</span>}
                </div>
              )}
            </div>
          </div>

          {/* 5. NOTAS DEL COLABORADOR (INTERESES, HOBIES, ETC) - EDITABLE contextually */}
          <div className="property-item" style={{ marginTop: '10px' }}>
            <label className="property-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} style={{ color: 'var(--color-ai)' }} />
                <strong>Notas de Colaborador (Intereses, Pasatiempos, Notas B2B)</strong>
              </span>
              {editingField !== 'notas' && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingField('notas');
                    setTempValue(profile.notas);
                  }}
                  style={{ background: 'none', border: 'none', padding: '2px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontSize: '11.5px', fontWeight: 600, fontFamily: 'inherit' }}
                >
                  <Pencil size={11} />
                  <span>Modificar Notas</span>
                </button>
              )}
            </label>
            
            {editingField === 'notas' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                <textarea 
                  value={tempValue} 
                  onChange={(e) => setTempValue(e.target.value)} 
                  className="notes-textarea"
                  style={{ minHeight: '120px', width: '100%' }}
                  placeholder="Escribe aquí tus pasatiempos, intereses, tecnologías favoritas o notas profesionales adicionales..."
                  autoFocus
                ></textarea>
                <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setEditingField(null)}
                    disabled={loading}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <X size={12} />
                    <span>Cancelar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveField('notas', tempValue)}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                  >
                    {loading ? <RefreshCw className="animate-spin" size={12} /> : <Check size={12} />}
                    <span>Guardar Notas</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ 
                padding: '16px 20px', 
                backgroundColor: 'rgba(6, 182, 212, 0.02)', 
                border: '1px solid var(--border-color)', 
                borderColor: 'rgba(6, 182, 212, 0.12)',
                borderRadius: 'var(--radius-md)', 
                fontSize: '13.5px', 
                color: 'var(--text-main)', 
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                minHeight: '100px',
                boxShadow: 'inset 0 1px 2px rgba(6, 182, 212, 0.01)'
              }}>
                {profile.notas || (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Sin notas añadidas. Haz clic en "Modificar Notas" en la parte superior derecha para agregar tus intereses y pasatiempos.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* COLLAPSIBLE CHANGE PASSWORD TRIGGER LINK */}
        <div style={{ marginTop: '28px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <button
            type="button"
            onClick={() => {
              setShowPasswordChange(!showPasswordChange);
              setPassError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 0',
              fontFamily: 'inherit'
            }}
          >
            <Key size={15} />
            <span>{showPasswordChange ? 'Ocultar sección de seguridad' : '¿Deseas cambiar tu contraseña de acceso?'}</span>
            {showPasswordChange ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* COLLAPSIBLE FORM CONTAINER */}
        {showPasswordChange && (
          <form 
            onSubmit={handlePasswordSubmit} 
            style={{ 
              marginTop: '16px', 
              backgroundColor: 'var(--bg-main)', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-md)', 
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '10px', marginBottom: '4px' }}>
              <Lock size={15} style={{ color: 'var(--color-warning)' }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Actualizar Clave de Acceso</span>
            </div>

            {passError && (
              <div className="login-alert error" style={{ padding: '8px 12px', fontSize: '12px' }}>
                <span>{passError}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="property-item">
                <label className="property-label">Contraseña Actual</label>
                <input 
                  type="password" 
                  name="oldPassword" 
                  placeholder="Clave actual"
                  value={passwords.oldPassword} 
                  onChange={handlePassChange} 
                  className="property-input"
                  required
                />
              </div>

              <div className="property-item">
                <label className="property-label">Nueva Contraseña</label>
                <input 
                  type="password" 
                  name="newPassword" 
                  placeholder="Min 8 chars"
                  value={passwords.newPassword} 
                  onChange={handlePassChange} 
                  className="property-input"
                  required
                />
              </div>

              <div className="property-item">
                <label className="property-label">Confirmar Contraseña</label>
                <input 
                  type="password" 
                  name="confirmPassword" 
                  placeholder="Repita nueva clave"
                  value={passwords.confirmPassword} 
                  onChange={handlePassChange} 
                  className="property-input"
                  required
                />
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px', backgroundColor: 'rgba(6, 182, 212, 0.04)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-ai)' }}>Directriz de Seguridad TemikIA:</span>
              <span>• La contraseña debe constar de al menos 8 caracteres.</span>
              <span>• Debe contener letras mayúsculas, minúsculas, números y símbolos especiales.</span>
            </div>

            <button 
              type="submit" 
              className="btn btn-secondary" 
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}
            >
              {loading ? <RefreshCw className="animate-spin" size={14} /> : <Key size={14} />}
              <span>{loading ? 'Procesando cambio...' : 'Guardar Nueva Contraseña'}</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default Profile;
