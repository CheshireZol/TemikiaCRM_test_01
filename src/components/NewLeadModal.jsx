import React, { useState, useEffect } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';

const NewLeadModal = ({ onClose, onSaveSuccess }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [girosList, setGirosList] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    estilo: '',
    giro_id: '', // Lookup FK
    prioridad: 'baja',
    owner: '',
    miembro_id: '', // Lookup FK for team members
    contacto_nombre: '',
    contacto_puesto: '',
    sitio_web: '',
    correo: '',
    telefono: '',
    whatsapp: '',
    direccion1: '',
    ciudad: '',
    estado: '',
    pais: '',
    notas: '',
    canal_preferido: 'whatsapp'
  });

  // Fetch Lookup Tables from PostgreSQL on mount
  useEffect(() => {
    const fetchGiros = async () => {
      try {
        const res = await fetch('/api/giros');
        if (res.ok) {
          const data = await res.json();
          setGirosList(data);
        }
      } catch (err) {
        console.error('Error loading giros lookup list:', err);
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
        console.error('Error loading team members list:', err);
      }
    };
    fetchGiros();
    fetchMiembros();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    const isNombreEmpty = !form.nombre.trim();
    const isGiroEmpty = !form.giro_id;
    const isDireccionEmpty = !form.direccion1.trim();
    const isCiudadEmpty = !form.ciudad.trim();
    const isEstadoEmpty = !form.estado.trim();
    const isPaisEmpty = !form.pais.trim();

    if (isNombreEmpty || isGiroEmpty || isDireccionEmpty || isCiudadEmpty || isEstadoEmpty || isPaisEmpty) {
      alert('Por favor complete todos los campos obligatorios marcados en rojo.');
      return;
    }

    try {
      setIsSaving(true);
      
      // Calculate a provisional base score before saving
      let baseScore = 15;
      if (form.sitio_web) baseScore += 25;
      if (form.correo) baseScore += 10;
      if (form.whatsapp) baseScore += 15;
      if (form.notas) baseScore += 10;

      const payload = {
        ...form,
        miembro_id: form.miembro_id || null,
        lead_score: baseScore
      };

      const res = await fetch('/api/prospectos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Error al registrar prospecto.');
      
      onSaveSuccess();
      alert('¡Felicidades! Nuevo prospecto registrado con éxito en PostgreSQL.');
      onClose();
    } catch (err) {
      console.error(err);
      alert('No se pudo registrar el prospecto en la base de datos.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} style={{ width: '640px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 className="modal-title">Registrar</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
            {/* 1. GENERAL INFO */}
            <div className="property-item">
              <label 
                className="property-label" 
                style={{ 
                  fontWeight: 600, 
                  color: (attemptedSubmit && !form.nombre.trim()) ? 'var(--color-danger, #ef4444)' : 'var(--text-secondary)' 
                }}
              >
                Nombre Comercial del Negocio *
              </label>
              <input 
                type="text" 
                name="nombre" 
                value={form.nombre} 
                onChange={handleChange} 
                className="property-input" 
                placeholder="Ej. Restaurante Bella Italia"
                required
              />
            </div>

            <div className="properties-grid">
              <div className="property-item">
                <label 
                  className="property-label"
                  style={{ 
                    color: (attemptedSubmit && !form.giro_id) ? 'var(--color-danger, #ef4444)' : 'var(--text-secondary)' 
                  }}
                >
                  Giro Comercial *
                </label>
                <select 
                  name="giro_id" 
                  value={form.giro_id} 
                  onChange={handleChange} 
                  className="property-input"
                  required
                >
                  <option value="">Seleccione un Giro...</option>
                  {girosList.map(g => (
                    <option key={g.id} value={g.id}>{g.giro}</option>
                  ))}
                </select>
              </div>

              <div className="property-item">
                <label className="property-label">Prioridad de Cierre</label>
                <select name="prioridad" value={form.prioridad} onChange={handleChange} className="property-input">
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>

              <div className="property-item">
                <label className="property-label">Ejecutivo Asignado (Owner)</label>
                <select 
                  name="miembro_id" 
                  value={form.miembro_id} 
                  onChange={handleChange} 
                  className="property-input"
                >
                  <option value="">Seleccione un Ejecutivo...</option>
                  {miembros.map(m => (
                    <option key={m.miembro_id} value={m.miembro_id}>{m.nombre_completo}</option>
                  ))}
                </select>
              </div>

              <div className="property-item">
                <label className="property-label">Canal de Contacto Preferido</label>
                <select name="canal_preferido" value={form.canal_preferido} onChange={handleChange} className="property-input">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="correo">Correo Electrónico</option>
                  <option value="telefono">Llamada</option>
                </select>
              </div>
            </div>

            {/* 2. CONTACT DETAILS */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '6px' }}>
              <span className="card-subtitle" style={{ fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
                Datos de Contacto Directo
              </span>
              <div className="properties-grid">
                <div className="property-item">
                  <label className="property-label">Contacto (Persona)</label>
                  <input type="text" name="contacto_nombre" value={form.contacto_nombre} onChange={handleChange} className="property-input" placeholder="Ej. Carlos Slim" />
                </div>
                <div className="property-item">
                  <label className="property-label">Puesto en la Empresa</label>
                  <input type="text" name="contacto_puesto" value={form.contacto_puesto} onChange={handleChange} className="property-input" placeholder="Ej. Gerente General" />
                </div>
              </div>

              <div className="property-item" style={{ marginTop: '8px' }}>
                <label className="property-label">Correos Electrónicos (Separados por coma)</label>
                <input type="text" name="correo" value={form.correo} onChange={handleChange} className="property-input" placeholder="correo1@negocio.com, correo2@negocio.com" />
              </div>

              <div className="properties-grid" style={{ marginTop: '8px' }}>
                <div className="property-item">
                  <label className="property-label">Teléfono Directo</label>
                  <input type="text" name="telefono" value={form.telefono} onChange={handleChange} className="property-input" placeholder="+525512345678" />
                </div>
                <div className="property-item">
                  <label className="property-label">Línea de WhatsApp</label>
                  <input type="text" name="whatsapp" value={form.whatsapp} onChange={handleChange} className="property-input" placeholder="+525512345678" />
                </div>
              </div>

              <div className="property-item" style={{ marginTop: '8px' }}>
                <label className="property-label">Sitio Web</label>
                <input type="text" name="sitio_web" value={form.sitio_web} onChange={handleChange} className="property-input" placeholder="www.negocio.com" />
              </div>
            </div>

            {/* 3. ADDRESS */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '6px' }}>
              <span className="card-subtitle" style={{ fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
                Ubicación Geográfica
              </span>
              <div className="property-item">
                <label 
                  className="property-label"
                  style={{ 
                    color: (attemptedSubmit && !form.direccion1.trim()) ? 'var(--color-danger, #ef4444)' : 'var(--text-secondary)' 
                  }}
                >
                  Dirección Completa *
                </label>
                <input 
                  type="text" 
                  name="direccion1" 
                  value={form.direccion1} 
                  onChange={handleChange} 
                  className="property-input" 
                  placeholder="Calle, Número, Colonia" 
                  required
                />
              </div>
              <div className="properties-grid" style={{ marginTop: '8px' }}>
                <div className="property-item">
                  <label 
                    className="property-label"
                    style={{ 
                      color: (attemptedSubmit && !form.ciudad.trim()) ? 'var(--color-danger, #ef4444)' : 'var(--text-secondary)' 
                    }}
                  >
                    Ciudad *
                  </label>
                  <input 
                    type="text" 
                    name="ciudad" 
                    value={form.ciudad} 
                    onChange={handleChange} 
                    className="property-input" 
                    placeholder="Ej. CDMX" 
                    required
                  />
                </div>
                <div className="property-item">
                  <label 
                    className="property-label"
                    style={{ 
                      color: (attemptedSubmit && !form.estado.trim()) ? 'var(--color-danger, #ef4444)' : 'var(--text-secondary)' 
                    }}
                  >
                    Estado *
                  </label>
                  <input 
                    type="text" 
                    name="estado" 
                    value={form.estado} 
                    onChange={handleChange} 
                    className="property-input" 
                    placeholder="Ej. CDMX" 
                    required
                  />
                </div>
                <div className="property-item">
                  <label 
                    className="property-label"
                    style={{ 
                      color: (attemptedSubmit && !form.pais.trim()) ? 'var(--color-danger, #ef4444)' : 'var(--text-secondary)' 
                    }}
                  >
                    País *
                  </label>
                  <input 
                    type="text" 
                    name="pais" 
                    value={form.pais} 
                    onChange={handleChange} 
                    className="property-input" 
                    placeholder="Ej. México" 
                    required
                  />
                </div>
              </div>
            </div>

            {/* 4. SALES NOTES */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '6px' }}>
              <label className="property-label">Comentarios / Bitácora Inicial de Seguimiento</label>
              <textarea 
                name="notas" 
                value={form.notas} 
                onChange={handleChange} 
                className="notes-textarea"
                placeholder="Describa el origen de este lead, acuerdos iniciales o inquietudes planteadas por el cliente..."
              ></textarea>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSaving}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Sparkles size={16} />
              <span>{isSaving ? 'Registrando...' : 'Registrar Lead'}</span>
            </button>
          </div>
        </form>
      </div>
  );
};

export default NewLeadModal;
