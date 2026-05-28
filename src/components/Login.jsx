import React, { useState, useEffect } from 'react';
import { Mail, Lock, ShieldAlert, Key, Sparkles, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // First-time password change wizard
  const [requiresChange, setRequiresChange] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userNombreCorto, setUserNombreCorto] = useState('');
  
  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [timer, setTimer] = useState(180);
  const [canResend, setCanResend] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Domain checker helper
  const isTemikiaEmail = (val) => {
    const trimmed = val.trim().toLowerCase();
    return trimmed.endsWith('@temikia.com');
  };

  // 2FA countdown timer effect hook
  useEffect(() => {
    let interval = null;
    if (requires2FA && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [requires2FA, timer]);

  // Format timer in MM:SS format
  const formatTimer = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handler for resending the 2FA code
  const handleResendCode = async () => {
    setError('');
    setSuccessMessage('');
    setVerificationCode('');

    const trimmedEmail = email.trim().toLowerCase();

    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password })
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error('No se pudo establecer comunicación con el servidor. Intente de nuevo.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al intentar reenviar el código.');
      }

      setSuccessMessage(`Se ha enviado un nuevo código de verificación de 6 dígitos a su correo corporativo ${trimmedEmail}.`);
      setTimer(180); // Reset countdown back to 3 minutes
      setCanResend(false); // Disable resend option
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Domain Check in frontend
    if (!trimmedEmail) {
      setError('Por favor, ingrese su correo electrónico.');
      return;
    }
    if (!isTemikiaEmail(trimmedEmail)) {
      setError('Acceso denegado: Solo se permiten correos del dominio corporativo @temikia.com.');
      return;
    }
    if (!password) {
      setError('Por favor, ingrese su contraseña.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password })
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error('No se pudo establecer comunicación con el servidor de autenticación. Verifique que el servicio backend esté activo y reinicie.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al intentar iniciar sesión.');
      }

      // Check if first-time password change is required
      if (data.requiresPasswordChange) {
        setRequiresChange(true);
        setOldPassword(password); // Pre-populate old password
        setUserNombreCorto(data.nombreCorto || '');
        setSuccessMessage(data.message || 'Primer inicio de sesión exitoso. Por seguridad, debe cambiar su contraseña.');
      } else if (data.requires2FA) {
        setRequires2FA(true);
        setTimer(180);
        setCanResend(false);
        setSuccessMessage(`Se ha enviado un código de verificación de 6 dígitos a su correo corporativo ${data.email}.`);
      } else {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerifySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!verificationCode) {
      setError('Por favor, ingrese el código de verificación.');
      return;
    }

    if (verificationCode.trim().length !== 6) {
      setError('El código de verificación debe ser de 6 dígitos.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: verificationCode.trim() })
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error('No se pudo establecer comunicación con el servidor de verificación. Verifique que el servicio backend esté activo.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Código incorrecto o expirado.');
      }

      setSuccessMessage('¡Código verificado con éxito! Iniciando sesión...');
      onLoginSuccess(data.user);

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!newPassword || !confirmPassword) {
      setError('Por favor, llene todos los campos de contraseña.');
      return;
    }

    // Validate password strength: min 8 chars, numbers, symbols, uppercase, lowercase
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};\':",\\|.<>\/?]).{8,}$/;
    if (!newPassword.match(passwordRegex)) {
      setError('Contraseña insegura: Debe tener al menos 8 caracteres, e incluir letras mayúsculas, minúsculas, números y símbolos especiales.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          oldPassword: oldPassword, 
          newPassword: newPassword 
        })
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error('No se pudo establecer comunicación con el servidor de actualización. Verifique que el servicio backend esté activo.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo actualizar la contraseña.');
      }

      setSuccessMessage('¡Excelente! Contraseña actualizada con éxito.');
      
      if (data.user) {
        onLoginSuccess(data.user);
      } else {
        // Fallback: Return to login form
        setRequiresChange(false);
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSuccessMessage('Inicie sesión con su nueva contraseña.');
      }

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-backdrop">
      <div className="login-container">
        
        {/* Background glow animations matching premium Vercel/Linear look */}
        <div className="login-glow login-glow-1"></div>
        <div className="login-glow login-glow-2"></div>

        <div className="login-card">
          {/* Card Header Logo */}
          <div className="login-logo-header">
            <div className="login-logo-ring">
              <img 
                src="/logo.png" 
                alt="Temikia Logo" 
                className="login-logo-img"
              />
            </div>
            <h2 className="login-title">Temikia CRM</h2>
            <p className="login-subtitle">Hub Comercial Inteligente • Portal de Acceso</p>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="login-alert error">
              <ShieldAlert size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="login-alert success">
              <ShieldCheck size={18} className="flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {requiresChange ? (
            /* ========================================================
               PASSWORD CHANGE WIZARD (FIRST-TIME LOGIN)
               ======================================================== */
            <form onSubmit={handleChangePasswordSubmit} className="login-form">
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <Key size={36} style={{ color: 'var(--color-warning)', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Hola, <strong>{userNombreCorto || email}</strong>. Detectamos que esta es tu primera sesión o requieres actualizar tu clave de acceso.
                </p>
              </div>

              <div className="login-form-group">
                <label className="login-form-label">Nueva Contraseña</label>
                <div className="login-input-wrapper">
                  <Lock className="login-input-icon" size={16} />
                  <input 
                    type="password" 
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    className="login-input"
                    required
                  />
                </div>
              </div>

              <div className="login-form-group">
                <label className="login-form-label">Confirmar Contraseña</label>
                <div className="login-input-wrapper">
                  <Lock className="login-input-icon" size={16} />
                  <input 
                    type="password" 
                    placeholder="Repita la nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="login-input"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn login-btn btn-ai"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>Guardando Contraseña...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Actualizar y Entrar</span>
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setRequiresChange(false);
                    setPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setError('');
                    setSuccessMessage('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FCA5A5', // Soft light red matching premium glassmorphism dark theme
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    opacity: 0.8,
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = 1;
                    e.currentTarget.style.color = '#EF4444'; // Bright red hover alert
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = 0.8;
                    e.currentTarget.style.color = '#FCA5A5';
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : requires2FA ? (
            /* ========================================================
               2FA VERIFICATION FORM
               ======================================================== */
            <form onSubmit={handle2FAVerifySubmit} className="login-form">
              <div className="login-form-group">
                <label className="login-form-label">Código de Verificación</label>
                <div className="login-input-wrapper">
                  <Key className="login-input-icon" size={16} />
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    disabled={loading}
                    className="login-input"
                    required
                    style={{ letterSpacing: '6px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}
                  />
                </div>
                <span className="login-field-hint">Código de seguridad de un solo uso</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '4px', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', color: timer > 0 ? 'var(--text-secondary)' : 'var(--color-danger)', fontWeight: 600 }}>
                  {timer > 0 ? `El código expira en: ${formatTimer(timer)}` : 'El código ha expirado'}
                </span>
                
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading || !canResend}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: canResend ? 'var(--color-primary)' : 'var(--text-muted)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: canResend ? 'pointer' : 'not-allowed',
                    textDecoration: canResend ? 'underline' : 'none',
                    opacity: canResend ? 1 : 0.6,
                    transition: 'all var(--transition-fast)',
                    fontFamily: 'inherit'
                  }}
                >
                  Reenviar código
                </button>
              </div>

              <button 
                type="submit" 
                className="btn login-btn btn-ai"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Verificar y Acceder</span>
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setRequires2FA(false);
                    setVerificationCode('');
                    setError('');
                    setSuccessMessage('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#EF4444', // Red button
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                    e.currentTarget.style.color = '#DC2626'; // Darker red on hover
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                    e.currentTarget.style.color = '#EF4444';
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            /* ========================================================
               NORMAL CREDENTIALS FORM
               ======================================================== */
            <form onSubmit={handleLoginSubmit} className="login-form">
              <div className="login-form-group">
                <label className="login-form-label">Correo Corporativo</label>
                <div className="login-input-wrapper">
                  <Mail className="login-input-icon" size={16} />
                  <input 
                    type="email" 
                    placeholder="usuario@temikia.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="login-input"
                    required
                  />
                </div>
                <span className="login-field-hint">Solo acceso para colaboradores @temikia.com</span>
              </div>

              <div className="login-form-group">
                <label className="login-form-label">Contraseña</label>
                <div className="login-input-wrapper">
                  <Lock className="login-input-icon" size={16} />
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="login-input"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn login-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <span>Iniciar Sesión</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="login-footer">
            <span>© 2026 Temikia Agency. Todos los derechos reservados.</span>
            <span>Sistema de Seguridad de Datos del CRM.</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
