import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import dns from 'dns';
import path from 'path';
import { fileURLToPath } from 'url';


dns.setDefaultResultOrder('ipv4first');


// Conditionally load .env if it exists physically on disk (for local development)
if (fs.existsSync(path.join(process.cwd(), '.env'))) {
  dotenv.config();
  console.log('INFO: Environment variables loaded from local .env file.');
} else {
  console.log('INFO: No local .env file found. Reading variables directly from OS / Host environment.');
}

const app = express();
const PORT = process.env.PORT || 4001;
const HOST = process.env.HOST || '127.0.0.1';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('trust proxy', 1);

// Middlewares
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com"
        ],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://maps.googleapis.com"
        ],

        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://maps.gstatic.com",
          "https://maps.googleapis.com",
          "https://*.googleapis.com",
          "https://*.gstatic.com",
          "https://*.googleusercontent.com"
        ],

        connectSrc: [
          "'self'",
          "https://maps.googleapis.com",
          "https://*.googleapis.com"
        ],

        fontSrc: [
          "'self'",
          "data:",
          "https://fonts.gstatic.com"
        ],

        frameSrc: [
          "'self'",
          "https://www.google.com",
          "https://maps.google.com",
          "https://www.google.com.mx"
        ],

        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: []
      }
    }
  })
);

// Strict Permissions-Policy to restrict browser features and reduce client-side attack surface
app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), bluetooth=(), payment=(), usb=()'
  );
  next();
});

// CORS Whitelisting based on FRONTEND_URL environment variable
const allowedOrigins = [
  'http://localhost:4000', // Local dev
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Acceso denegado por políticas de seguridad de origen cruzado (CORS).'));
    }
  },
  credentials: true
}));

// Global body parsers with strict 100kb limits to prevent DoS RAM exhaustion,
// bypassing the profile upload endpoint which requires a larger limit.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth/profile/')) {
    return next();
  }
  express.json({ limit: '100kb' })(req, res, next);
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth/profile/')) {
    return next();
  }
  express.urlencoded({ limit: '100kb', extended: true })(req, res, next);
});

// Helper: Recursively sanitize input strings to prevent Stored XSS
function sanitizeInput(val, keyName = '') {
  if (typeof val === 'string') {
    // Exclude image data strings, URLs, and known safe fields
    if (
      keyName.toLowerCase().includes('foto') || 
      keyName.toLowerCase().includes('url') || 
      keyName.toLowerCase().includes('web') || 
      val.startsWith('data:image/') ||
      val.startsWith('http://') ||
      val.startsWith('https://')
    ) {
      return val;
    }
    return val
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  if (Array.isArray(val)) {
    return val.map(item => sanitizeInput(item, keyName));
  }
  if (typeof val === 'object' && val !== null) {
    const clean = {};
    for (const key in val) {
      clean[key] = sanitizeInput(val[key], key);
    }
    return clean;
  }
  return val;
}

// Middleware: Sanitize all request body fields before route handling
function sanitizeRequestBody(req, res, next) {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  next();
}

app.use(sanitizeRequestBody);

// Rate limiter for authentication routes
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 requests per windowMs
  message: { error: 'Demasiadas solicitudes de autenticación desde esta IP. Intente de nuevo en 15 minutos.' }
});

app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/verify-2fa', authRateLimiter);

// General rate limiter for non-auth API endpoints to protect against scraping and DoS
const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // limit each IP to 200 requests per minute
  message: { error: 'Límite de peticiones de datos excedido. Intente nuevamente en 1 minuto.' }
});

// Apply rate limiter to all API endpoints, bypassing auth rate-limited endpoints
app.use('/api/', (req, res, next) => {
  const cleanPath = req.path.replace(/\/$/, '');
  if (cleanPath === '/auth/login' || cleanPath === '/auth/verify-2fa') {
    return next();
  }
  apiRateLimiter(req, res, next);
});

// Middleware: Authenticate requests using JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado: Token de sesión ausente.' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'temikia-secret-key-super-secure', async (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Sesión expirada o inválida. Por favor inicie sesión nuevamente.' });
    }

    // Securely check if user is still active in PostgreSQL to support instant deactivation revocation
    try {
      const activeRes = await pool.query(
        'SELECT activo, bloqueado_hasta FROM temikia_crm.miembros_login WHERE login_id = $1',
        [user.loginId]
      );
      if (activeRes.rows.length === 0 || !activeRes.rows[0].activo) {
        return res.status(403).json({ error: 'Acceso denegado: Esta cuenta se encuentra desactivada.' });
      }
      if (activeRes.rows[0].bloqueado_hasta && new Date(activeRes.rows[0].bloqueado_hasta) > new Date()) {
        return res.status(403).json({ error: 'Acceso denegado: Esta cuenta se encuentra bloqueada temporalmente.' });
      }
    } catch (dbErr) {
      console.error('Error verifying active status in token middleware:', dbErr);
    }

    req.user = user;
    next();
  });
}

// Middleware: Authorize requests based on user roles (RBAC)
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Permiso denegado: Acción no permitida para su nivel de acceso.' });
    }
    next();
  };
}

// SMTP Transporter using Hostinger secure settings
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true, // SSL/TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  family: 4, // Force IPv4 to prevent IPv6 connection failures
  tls: {
    rejectUnauthorized: false // Avoid self-signed certificate in chain errors
  }
});

// Database Connection
const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('ERROR: DATABASE_URL variable is not set in the environment or .env file.');
  process.exit(1);
}

// Set up PostgreSQL connection pool with SSL configured for Supabase compatibility
const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('supabase.co') ? { rejectUnauthorized: false } : false
});

// Test DB Connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('CRITICAL: Database connection failed!', err.stack);
  } else {
    console.log('SUCCESS: Connected to PostgreSQL Supabase database.');
    release();

    // Auto-run schema migrations on startup
    pool.query(`
      ALTER TABLE temikia_crm.miembros_equipo 
      ADD COLUMN IF NOT EXISTS foto_url text,
      ADD COLUMN IF NOT EXISTS intereses text;

      ALTER TABLE temikia_crm.miembros_login 
      ADD COLUMN IF NOT EXISTS codigo_2fa VARCHAR(6),
      ADD COLUMN IF NOT EXISTS codigo_2fa_expira TIMESTAMP;
    `).then(() => {
      console.log('SUCCESS: Schema verified - database structure is production ready.');
    }).catch(migrationError => {
      console.error('ERROR: Schema migration failed:', migrationError);
    });
  }
});

// Helper: Convert string or JS arrays/JSON into correct format for PostgreSQL
const toPgArray = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    if (val.trim() === '') return null;
    if (val.startsWith('[') && val.endsWith(']')) {
      try {
        return JSON.parse(val);
      } catch (e) {
        return [val];
      }
    }
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }
  return null;
};

const toPgJsonb = (val) => {
  if (typeof val === 'object' && val !== null) return JSON.stringify(val);
  if (typeof val === 'string') {
    try {
      JSON.parse(val);
      return val;
    } catch (e) {
      return JSON.stringify({});
    }
  }
  return JSON.stringify({});
};

// ==========================================
// API ENDPOINTS
// ==========================================

// 1. GET /api/giros - Lookup list of all business giros from temikia_crm.giros_negocios
app.get('/api/giros', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, giro FROM temikia_crm.giros_negocios WHERE giro IS NOT NULL AND giro != \'\' ORDER BY giro');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching giros list:', error);
    res.status(500).json({ error: 'Failed to fetch commercial giros.' });
  }
});

// 1.5 GET /api/miembros - Lookup list of all team members from temikia_crm.miembros_equipo
app.get('/api/miembros', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT miembro_id, nombre_completo, nombre_corto FROM temikia_crm.miembros_equipo ORDER BY nombre_completo');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching team members list:', error);
    res.status(500).json({ error: 'Failed to fetch team members.' });
  }
});

// 1.6 GET /api/equipo - Fetch all active team members with aggregated lead metrics
app.get('/api/equipo', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        me.miembro_id, me.nombre_completo, me.nombre_corto, me.telefono, me.email, 
        me.pais, me.ciudad, me.cargo, me.foto_url, me.notas, me.activo, me.intereses,
        COUNT(pn.id) as total_leads,
        COUNT(CASE WHEN pn.estatus = 'ganado' THEN 1 END) as leads_ganados,
        COUNT(CASE WHEN pn.estatus = 'perdido' THEN 1 END) as leads_perdidos,
        COUNT(CASE WHEN pn.estatus NOT IN ('ganado', 'perdido') THEN 1 END) as leads_activos,
        ROUND(COALESCE(AVG(pn.lead_score), 0)) as avg_lead_score
      FROM temikia_crm.miembros_equipo me
      LEFT JOIN temikia_crm.prospectos_negocios pn ON me.miembro_id = pn.miembro_id
      WHERE me.activo = true
      GROUP BY me.miembro_id, me.nombre_completo, me.nombre_corto, me.telefono, 
               me.email, me.pais, me.ciudad, me.cargo, me.foto_url, me.notas, 
               me.activo, me.intereses
      ORDER BY me.nombre_completo
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching team stats:', error);
    res.status(500).json({ error: 'Failed to fetch team dashboard.' });
  }
});

// 1.7 PUT /api/equipo/:miembroId/intereses - Update interests for a team member
app.put('/api/equipo/:miembroId/intereses', authenticateToken, async (req, res) => {
  try {
    const { miembroId } = req.params;
    const { intereses } = req.body;

    // IDOR Protection: Ensure user is modifying their own interests or is an admin
    if (req.user.miembroId !== miembroId && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: No tiene permisos para modificar estos intereses.' });
    }

    const query = `
      UPDATE temikia_crm.miembros_equipo
      SET intereses = $1, updated_at = NOW()
      WHERE miembro_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [intereses || null, miembroId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Miembro no encontrado.' });
    }

    res.json({
      message: 'Intereses actualizados exitosamente.',
      profile: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating member interests:', error);
    res.status(500).json({ error: 'Failed to update interests.' });
  }
});

// 2. GET /api/kpis - Aggregate statistics for the main Dashboard (with dynamic filters for refining)
app.get('/api/kpis', authenticateToken, async (req, res) => {
  try {
    const { pais, giro, owner, miembro_id } = req.query;

    const whereClauses = [];
    const values = [];
    let valIndex = 1;

    if (pais) {
      whereClauses.push(`p.pais = $${valIndex++}`);
      values.push(pais);
    }
    if (giro) {
      whereClauses.push(`g.giro = $${valIndex++}`);
      values.push(giro);
    }
    if (miembro_id) {
      whereClauses.push(`p.miembro_id = $${valIndex++}`);
      values.push(miembro_id);
    } else if (owner) {
      whereClauses.push(`p.owner = $${valIndex++}`);
      values.push(owner);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // SQL queries utilizing the foreign key JOIN
    const totalLeadsQuery = `SELECT COUNT(*) FROM temikia_crm.prospectos_negocios p LEFT JOIN temikia_crm.giros_negocios g ON p.giro_id = g.id ${whereString}`;
    const avgScoreQuery = `SELECT AVG(p.lead_score) FROM temikia_crm.prospectos_negocios p LEFT JOIN temikia_crm.giros_negocios g ON p.giro_id = g.id ${whereString}`;
    const leadsByStatusQuery = `SELECT p.estatus, COUNT(*) FROM temikia_crm.prospectos_negocios p LEFT JOIN temikia_crm.giros_negocios g ON p.giro_id = g.id ${whereString} GROUP BY p.estatus`;
    const leadsByPriorityQuery = `SELECT p.prioridad, COUNT(*) FROM temikia_crm.prospectos_negocios p LEFT JOIN temikia_crm.giros_negocios g ON p.giro_id = g.id ${whereString} GROUP BY p.prioridad`;
    
    // Joint lookup for Giros
    const leadsByGiroQuery = `
      SELECT COALESCE(g.giro, 'Sin Giro') as giro, COUNT(*) 
      FROM temikia_crm.prospectos_negocios p 
      LEFT JOIN temikia_crm.giros_negocios g ON p.giro_id = g.id 
      ${whereString}
      GROUP BY g.giro, COALESCE(g.giro, 'Sin Giro') 
      ORDER BY COUNT(*) DESC 
      LIMIT 6
    `;

    // Joint lookup for States (requested for new Pie Chart)
    const estadoWhereString = whereClauses.length > 0 
      ? `WHERE ${whereClauses.join(' AND ')} AND p.estado IS NOT NULL AND p.estado != ''` 
      : "WHERE p.estado IS NOT NULL AND p.estado != ''";

    const leadsByEstadoQuery = `
      SELECT COALESCE(p.estado, 'Sin Estado') as estado, COUNT(*) 
      FROM temikia_crm.prospectos_negocios p 
      LEFT JOIN temikia_crm.giros_negocios g ON p.giro_id = g.id 
      ${estadoWhereString}
      GROUP BY p.estado, COALESCE(p.estado, 'Sin Estado') 
      ORDER BY COUNT(*) DESC 
      LIMIT 6
    `;

    // Recent activity feed with filter respect
    const recentActivityQuery = `
      SELECT p.id, p.nombre, p.estatus, p.updated_at, p.lead_score, COALESCE(g.giro, 'Sin Giro') as giro
      FROM temikia_crm.prospectos_negocios p 
      LEFT JOIN temikia_crm.giros_negocios g ON p.giro_id = g.id 
      ${whereString}
      ORDER BY p.updated_at DESC 
      LIMIT 8
    `;

    const [totalLeads, avgScore, leadsByStatus, leadsByPriority, leadsByGiro, leadsByEstado, recentActivity] = await Promise.all([
      pool.query(totalLeadsQuery, values),
      pool.query(avgScoreQuery, values),
      pool.query(leadsByStatusQuery, values),
      pool.query(leadsByPriorityQuery, values),
      pool.query(leadsByGiroQuery, values),
      pool.query(leadsByEstadoQuery, values),
      pool.query(recentActivityQuery, values)
    ]);

    const totalLeadsCount = parseInt(totalLeads.rows[0].count, 10) || 0;
    const averageScore = Math.round(parseFloat(avgScore.rows[0].avg) || 0);

    // Calculate conversion rate (leads in 'ganado' vs total closed)
    const statusCounts = {};
    let activeLeadsCount = 0;
    leadsByStatus.rows.forEach(row => {
      statusCounts[row.estatus] = parseInt(row.count, 10);
      if (row.estatus !== 'ganado' && row.estatus !== 'perdido') {
        activeLeadsCount += parseInt(row.count, 10);
      }
    });

    const wonCount = statusCounts['ganado'] || statusCounts['won'] || 0;
    const lostCount = statusCounts['perdido'] || statusCounts['lost'] || 0;
    const totalFinished = wonCount + lostCount;
    const conversionRate = totalFinished > 0 ? Math.round((wonCount / totalFinished) * 100) : 0;

    res.json({
      totalLeads: totalLeadsCount,
      averageScore,
      activeLeads: activeLeadsCount,
      conversionRate,
      statusCounts: leadsByStatus.rows,
      priorityCounts: leadsByPriority.rows,
      giroCounts: leadsByGiro.rows,
      estadoCounts: leadsByEstado.rows, // Map to React state pie chart
      recentActivity: recentActivity.rows
    });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ error: 'Failed to calculate database statistics.' });
  }
});

// 3. GET /api/filtros - Dynamic filter values directly populated from active database contents (Faceted Search)
app.get('/api/filtros', authenticateToken, async (req, res) => {
  try {
    const {
      estatus,
      prioridad,
      pais,
      ciudad,
      giro,
      owner,
      miembro_id
    } = req.query;

    // Helper to generate dynamic parameterized where clauses excluding a specific key
    const getWhereClauses = (excludeKey) => {
      const clauses = [];
      const values = [];
      let valIndex = 1;

      if (estatus && excludeKey !== 'estatus') {
        clauses.push(`p.estatus = $${valIndex++}`);
        values.push(estatus);
      }
      if (prioridad && excludeKey !== 'prioridad') {
        clauses.push(`p.prioridad = $${valIndex++}`);
        values.push(prioridad);
      }
      if (pais && excludeKey !== 'pais') {
        clauses.push(`p.pais = $${valIndex++}`);
        values.push(pais);
      }
      if (ciudad && excludeKey !== 'ciudad') {
        clauses.push(`p.ciudad = $${valIndex++}`);
        values.push(ciudad);
      }
      if (giro && excludeKey !== 'giro') {
        clauses.push(`g.giro = $${valIndex++}`);
        values.push(giro);
      }
      if (miembro_id && excludeKey !== 'miembro_id') {
        clauses.push(`p.miembro_id = $${valIndex++}`);
        values.push(miembro_id);
      } else if (owner && excludeKey !== 'owner') {
        clauses.push(`p.owner = $${valIndex++}`);
        values.push(owner);
      }

      return {
        clauseStr: clauses.length > 0 ? ' AND ' + clauses.join(' AND ') : '',
        values
      };
    };

    // Construct and execute filtered queries for each dropdown concurrently (6 dimensions)
    const paisesFilter = getWhereClauses('pais');
    const ciudadesFilter = getWhereClauses('ciudad');
    const girosFilter = getWhereClauses('giro');
    const miembrosFilter = getWhereClauses('miembro_id');
    const estatusesFilter = getWhereClauses('estatus');
    const prioridadesFilter = getWhereClauses('prioridad');

    const [paises, ciudades, giros, miembros, estatuses, prioridades] = await Promise.all([
      pool.query(
        `SELECT DISTINCT p.pais FROM temikia_crm.prospectos_negocios p LEFT JOIN temikia_crm.giros_negocios g ON p.giro_id = g.id WHERE p.pais IS NOT NULL AND p.pais != '' ${paisesFilter.clauseStr} ORDER BY p.pais`,
        paisesFilter.values
      ),
      pool.query(
        `SELECT DISTINCT p.ciudad FROM temikia_crm.prospectos_negocios p LEFT JOIN temikia_crm.giros_negocios g ON p.giro_id = g.id WHERE p.ciudad IS NOT NULL AND p.ciudad != '' ${ciudadesFilter.clauseStr} ORDER BY p.ciudad LIMIT 100`,
        ciudadesFilter.values
      ),
      pool.query(
        `SELECT DISTINCT g.giro FROM temikia_crm.prospectos_negocios p JOIN temikia_crm.giros_negocios g ON p.giro_id = g.id WHERE g.giro IS NOT NULL AND g.giro != '' ${girosFilter.clauseStr} ORDER BY g.giro`,
        girosFilter.values
      ),
      pool.query(
        `SELECT DISTINCT m.miembro_id, m.nombre_completo FROM temikia_crm.prospectos_negocios p JOIN temikia_crm.miembros_equipo m ON p.miembro_id = m.miembro_id LEFT JOIN temikia_crm.giros_negocios g ON p.giro_id = g.id WHERE p.miembro_id IS NOT NULL ${miembrosFilter.clauseStr} ORDER BY m.nombre_completo`,
        miembrosFilter.values
      ),
      pool.query(
        `SELECT DISTINCT p.estatus FROM temikia_crm.prospectos_negocios p LEFT JOIN temikia_crm.giros_negocios g ON p.giro_id = g.id WHERE p.estatus IS NOT NULL AND p.estatus != '' ${estatusesFilter.clauseStr} ORDER BY p.estatus`,
        estatusesFilter.values
      ),
      pool.query(
        `SELECT DISTINCT p.prioridad FROM temikia_crm.prospectos_negocios p LEFT JOIN temikia_crm.giros_negocios g ON p.giro_id = g.id WHERE p.prioridad IS NOT NULL AND p.prioridad != '' ${prioridadesFilter.clauseStr} ORDER BY p.prioridad`,
        prioridadesFilter.values
      )
    ]);

    res.json({
      paises: paises.rows.map(r => r.pais),
      ciudades: ciudades.rows.map(r => r.ciudad),
      giros: giros.rows.map(r => r.giro),
      miembros: miembros.rows.map(r => ({ miembro_id: r.miembro_id, nombre_completo: r.nombre_completo })),
      estatuses: estatuses.rows.map(r => r.estatus),
      prioridades: prioridades.rows.map(r => r.prioridad)
    });
  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({ error: 'Failed to fetch dynamic filters.' });
  }
});

// 4. GET /api/prospectos - Get list of leads with server-side filters, search, and pagination (LEFT JOINed with giros_negocios)
app.get('/api/prospectos', authenticateToken, async (req, res) => {
  try {
    const {
      estatus,
      prioridad,
      pais,
      ciudad,
      giro,
      owner,
      miembro_id, // Accept miembro_id UUID filter
      asistente_ia_activo,
      q,
      sortBy = 'updated_at',
      sortOrder = 'DESC',
      limit = 50,
      offset = 0
    } = req.query;

    const whereClauses = [];
    const values = [];
    let valIndex = 1;

    if (estatus) {
      whereClauses.push(`p.estatus = $${valIndex++}`);
      values.push(estatus);
    }
    if (prioridad) {
      whereClauses.push(`p.prioridad = $${valIndex++}`);
      values.push(prioridad);
    }
    if (pais) {
      whereClauses.push(`p.pais = $${valIndex++}`);
      values.push(pais);
    }
    if (ciudad) {
      whereClauses.push(`p.ciudad = $${valIndex++}`);
      values.push(ciudad);
    }
    if (giro) {
      whereClauses.push(`g.giro = $${valIndex++}`);
      values.push(giro);
    }
    if (miembro_id) {
      whereClauses.push(`p.miembro_id = $${valIndex++}`);
      values.push(miembro_id);
    } else if (owner) {
      whereClauses.push(`p.owner = $${valIndex++}`);
      values.push(owner);
    }
    if (asistente_ia_activo !== undefined && asistente_ia_activo !== '') {
      whereClauses.push(`p.asistente_ia_activo = $${valIndex++}`);
      values.push(asistente_ia_activo === 'true' || asistente_ia_activo === true);
    }

    // Text search fallback to name, giro name, city, or country
    if (q && q.trim() !== '') {
      whereClauses.push(`(p.nombre ILIKE $${valIndex} OR g.giro ILIKE $${valIndex} OR p.ciudad ILIKE $${valIndex} OR p.pais ILIKE $${valIndex})`);
      values.push(`%${q}%`);
      valIndex++;
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Validate safe columns for sorting
    const allowedSortCols = ['nombre', 'estatus', 'prioridad', 'lead_score', 'created_at', 'updated_at'];
    const safeSortBy = allowedSortCols.includes(sortBy) ? `p.${sortBy}` : 'p.updated_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Pagination limits
    const safeLimit = Math.min(parseInt(limit, 10) || 50, 1000000);
    const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

    // Dynamic Query with LEFT JOIN lookup on Giro name and Google Maps details
    const dataQuery = `
      SELECT p.id, p.negocios_gmaps_id, p.nombre, p.correo, p.telefono, p.estilo, p.sitio_web, p.rrss, p.whatsapp, 
             p.contacto_nombre, p.contacto_puesto, p.direccion1, p.ciudad, p.estado, p.pais, p.lat, p.lon, p.horario, 
             p.canal_preferido, p.estatus, p.owner, p.source, p.lead_score, p.prioridad, p.proximo_paso_at, 
             p.ultimo_contacto_at, p.consent_marketing, p.notas, p.ficha_prospeccion, p.created_at, p.updated_at,
             p.giro_id, p.miembro_id, p.asistente_ia_activo, COALESCE(g.giro, p.estilo, 'Sin Giro') as giro_nombre,
             COALESCE(me.nombre_completo, p.owner, 'Sin Asignar') as owner_nombre,
             n.total_score, n.reviews_count, n.web_search, n.peoplealsosearch
      FROM temikia_crm.prospectos_negocios p
      LEFT JOIN temikia_crm.giros_negocios g ON p.giro_id = g.id
      LEFT JOIN temikia_crm.miembros_equipo me ON p.miembro_id = me.miembro_id
      LEFT JOIN temikia_crm.negocios_gmaps n ON p.negocios_gmaps_id = n.id
      ${whereString}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT $${valIndex++} OFFSET $${valIndex++}
    `;

    const countQuery = `
      SELECT COUNT(*) 
      FROM temikia_crm.prospectos_negocios p
      LEFT JOIN temikia_crm.giros_negocios g ON p.giro_id = g.id
      ${whereString}
    `;

    const dataValues = [...values, safeLimit, safeOffset];

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, dataValues),
      pool.query(countQuery, values)
    ]);

    res.json({
      rows: dataResult.rows,
      totalCount: parseInt(countResult.rows[0].count, 10),
      limit: safeLimit,
      offset: safeOffset
    });
  } catch (error) {
    console.error('Error query prospects:', error);
    res.status(500).json({ error: 'Failed to query business prospects.' });
  }
});

// 5. GET /api/prospectos/:id - Get a single prospect in full detail (LEFT JOINed)
app.get('/api/prospectos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT p.*, COALESCE(g.giro, p.estilo, 'Sin Giro') as giro_nombre,
             COALESCE(me.nombre_completo, p.owner, 'Sin Asignar') as owner_nombre,
             n.total_score, n.reviews_count, n.web_search, n.peoplealsosearch
      FROM temikia_crm.prospectos_negocios p
      LEFT JOIN temikia_crm.giros_negocios g ON p.giro_id = g.id
      LEFT JOIN temikia_crm.miembros_equipo me ON p.miembro_id = me.miembro_id
      LEFT JOIN temikia_crm.negocios_gmaps n ON p.negocios_gmaps_id = n.id
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prospect not found.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching prospect detail:', error);
    res.status(500).json({ error: 'Failed to fetch prospect details.' });
  }
});

// 6. PUT /api/prospectos/:id/estatus - Fast update for Kanban stage drag-and-drop
app.put('/api/prospectos/:id/estatus', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { estatus } = req.body;

    if (!estatus) {
      return res.status(400).json({ error: 'Field "estatus" is required.' });
    }

    const validEstatus = ['nuevo', 'proceso_contacto', 'contactado', 'calificado', 'propuesta', 'ganado', 'perdido', 'descalificado', 'datos_invalidos', 'cerrado_inexistente'];
    if (!validEstatus.includes(estatus.toLowerCase())) {
      return res.status(400).json({ error: 'Field "estatus" value is invalid.' });
    }

    const query = `
      UPDATE temikia_crm.prospectos_negocios
      SET estatus = $1, updated_at = NOW(), ultimo_contacto_at = NOW()
      WHERE id = $2
      RETURNING id, nombre, estatus, updated_at
    `;

    const result = await pool.query(query, [estatus.toLowerCase(), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prospect not found to update.' });
    }

    res.json({
      message: 'Status updated successfully.',
      prospect: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update pipeline stage.' });
  }
});

// PUT /api/prospectos/:id/prioridad - Fast update for priority
app.put('/api/prospectos/:id/prioridad', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { prioridad } = req.body;

    if (!prioridad) {
      return res.status(400).json({ error: 'Field "prioridad" is required.' });
    }

    const validPrioridades = ['alta', 'media', 'baja'];
    if (!validPrioridades.includes(prioridad.toLowerCase())) {
      return res.status(400).json({ error: 'Field "prioridad" value must be one of: alta, media, baja.' });
    }

    const query = `
      UPDATE temikia_crm.prospectos_negocios
      SET prioridad = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, nombre, prioridad, updated_at
    `;

    const result = await pool.query(query, [prioridad.toLowerCase(), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prospect not found to update.' });
    }

    res.json({
      message: 'Priority updated successfully.',
      prospect: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating priority:', error);
    res.status(500).json({ error: 'Failed to update priority.' });
  }
});

// PUT /api/prospectos/:id/score - Fast update for AI lead score
app.put('/api/prospectos/:id/score', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { lead_score } = req.body;

    if (lead_score === undefined) {
      return res.status(400).json({ error: 'Field "lead_score" is required.' });
    }

    const query = `
      UPDATE temikia_crm.prospectos_negocios
      SET lead_score = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, nombre, lead_score, updated_at
    `;

    const result = await pool.query(query, [parseInt(lead_score, 10), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prospect not found to update.' });
    }

    res.json({
      message: 'AI Score updated successfully.',
      prospect: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating lead score:', error);
    res.status(500).json({ error: 'Failed to update lead score.' });
  }
});

// PUT /api/prospectos/:id/asistente-ia - Fast update for AI Assistant flag
app.put('/api/prospectos/:id/asistente-ia', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { asistente_ia_activo } = req.body;

    if (asistente_ia_activo === undefined) {
      return res.status(400).json({ error: 'Field "asistente_ia_activo" is required.' });
    }

    const query = `
      UPDATE temikia_crm.prospectos_negocios
      SET asistente_ia_activo = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, nombre, asistente_ia_activo, updated_at
    `;

    const result = await pool.query(query, [asistente_ia_activo === true || asistente_ia_activo === 'true', id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prospect not found to update.' });
    }

    res.json({
      message: 'AI Assistant status updated successfully.',
      prospect: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating AI Assistant flag:', error);
    res.status(500).json({ error: 'Failed to update AI Assistant flag.' });
  }
});

// 7. PUT /api/prospectos/:id - Update complete details of a single lead
app.put('/api/prospectos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      correo,
      telefono,
      whatsapp,
      estilo,
      giro_id, // Accept giro_id lookup field
      sitio_web,
      rrss,
      contacto_nombre,
      contacto_puesto,
      direccion1,
      ciudad,
      estado,
      pais,
      prioridad,
      lead_score,
      owner,
      miembro_id, // Accept UUID ejecutivo asignado
      notas,
      ficha_prospeccion,
      canal_preferido,
      proximo_paso_at,
      asistente_ia_activo
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'Field "nombre" is required.' });
    }

    // 1. Validate UUID format for miembro_id
    if (miembro_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(miembro_id)) {
        return res.status(400).json({ error: 'Field "miembro_id" must be a valid UUID.' });
      }
    }

    // 2. Validate enums for prioridad
    const validPrioridades = ['alta', 'media', 'baja'];
    if (prioridad && !validPrioridades.includes(prioridad.toLowerCase())) {
      return res.status(400).json({ error: 'Field "prioridad" must be one of: alta, media, baja.' });
    }

    // 3. Validate enums for canal_preferido
    const validCanales = ['whatsapp', 'correo', 'telefono'];
    if (canal_preferido && !validCanales.includes(canal_preferido.toLowerCase())) {
      return res.status(400).json({ error: 'Field "canal_preferido" must be one of: whatsapp, correo, telefono.' });
    }

    // 4. Validate enums for estatus
    if (req.body.estatus) {
      const validEstatus = ['nuevo', 'proceso_contacto', 'contactado', 'calificado', 'propuesta', 'ganado', 'perdido', 'descalificado', 'datos_invalidos', 'cerrado_inexistente'];
      if (!validEstatus.includes(req.body.estatus.toLowerCase())) {
        return res.status(400).json({ error: 'Field "estatus" is invalid.' });
      }
    }

    const query = `
      UPDATE temikia_crm.prospectos_negocios
      SET nombre = $1,
          correo = $2,
          telefono = $3,
          whatsapp = $4,
          estilo = $5,
          giro_id = $6,
          sitio_web = $7,
          rrss = $8,
          contacto_nombre = $9,
          contacto_puesto = $10,
          direccion1 = $11,
          ciudad = $12,
          estado = $13,
          pais = $14,
          prioridad = $15,
          lead_score = $16,
          owner = $17,
          miembro_id = $18,
          notas = $19,
          ficha_prospeccion = $20,
          canal_preferido = $21,
          proximo_paso_at = $22,
          estatus = $23,
          asistente_ia_activo = $24,
          updated_at = NOW()
      WHERE id = $25
      RETURNING *
    `;

    const parsedGiroId = giro_id ? parseInt(giro_id, 10) : null;

    const values = [
      nombre,
      toPgArray(correo),
      toPgArray(telefono),
      toPgArray(whatsapp),
      estilo || null,
      isNaN(parsedGiroId) ? null : parsedGiroId,
      sitio_web || null,
      toPgJsonb(rrss),
      contacto_nombre || null,
      contacto_puesto || null,
      direccion1 || null,
      ciudad || null,
      estado || null,
      pais || null,
      prioridad || 'baja',
      parseInt(lead_score, 10) || 0,
      owner || null,
      miembro_id || null,
      notas || null,
      ficha_prospeccion || null,
      canal_preferido || 'whatsapp',
      proximo_paso_at ? new Date(proximo_paso_at) : null,
      req.body.estatus || 'nuevo',
      asistente_ia_activo === true || asistente_ia_activo === 'true',
      id
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prospect not found to edit.' });
    }

    logBusinessActivity(req, 'update_prospect', result.rows[0].id, { nombre: result.rows[0].nombre });

    res.json({
      message: 'Prospect updated successfully.',
      prospect: result.rows[0]
    });
  } catch (error) {
    logTechnicalError('PUT /api/prospectos/:id', 'Error saving prospect changes', error);
    res.status(500).json({ error: 'Failed to save edits to PostgreSQL database.' });
  }
});

// 8. POST /api/prospectos - Create new prospect manual input
app.post('/api/prospectos', authenticateToken, async (req, res) => {
  try {
    const {
      nombre,
      correo,
      telefono,
      whatsapp,
      estilo,
      giro_id, // Accept giro_id lookup field
      sitio_web,
      rrss,
      contacto_nombre,
      contacto_puesto,
      direccion1,
      ciudad,
      estado,
      pais,
      prioridad = 'baja',
      lead_score = 0,
      owner,
      miembro_id, // Accept UUID ejecutivo asignado
      notas,
      canal_preferido = 'whatsapp'
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'Field "nombre" is required.' });
    }

    // 1. Validate UUID format for miembro_id
    if (miembro_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(miembro_id)) {
        return res.status(400).json({ error: 'Field "miembro_id" must be a valid UUID.' });
      }
    }

    // 2. Validate enums for prioridad
    const validPrioridades = ['alta', 'media', 'baja'];
    if (prioridad && !validPrioridades.includes(prioridad.toLowerCase())) {
      return res.status(400).json({ error: 'Field "prioridad" must be one of: alta, media, baja.' });
    }

    // 3. Validate enums for canal_preferido
    const validCanales = ['whatsapp', 'correo', 'telefono'];
    if (canal_preferido && !validCanales.includes(canal_preferido.toLowerCase())) {
      return res.status(400).json({ error: 'Field "canal_preferido" must be one of: whatsapp, correo, telefono.' });
    }

    const query = `
      INSERT INTO temikia_crm.prospectos_negocios (
        nombre, correo, telefono, whatsapp, estilo, giro_id, sitio_web, rrss, 
        contacto_nombre, contacto_puesto, direccion1, ciudad, estado, pais, 
        prioridad, lead_score, owner, miembro_id, notas, canal_preferido, source, estatus
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `;

    const parsedGiroId = giro_id ? parseInt(giro_id, 10) : null;

    const values = [
      nombre,
      toPgArray(correo),
      toPgArray(telefono),
      toPgArray(whatsapp),
      estilo || null,
      isNaN(parsedGiroId) ? null : parsedGiroId,
      sitio_web || null,
      toPgJsonb(rrss),
      contacto_nombre || null,
      contacto_puesto || null,
      direccion1 || null,
      ciudad || null,
      estado || null,
      pais || null,
      prioridad,
      parseInt(lead_score, 10) || 0,
      owner || null,
      miembro_id || null,
      notas || null,
      canal_preferido,
      'manual',
      'nuevo' // Starts at the beginning of the pipeline
    ];

    const result = await pool.query(query, values);

    logBusinessActivity(req, 'create_prospect', result.rows[0].id, { nombre: result.rows[0].nombre });

    res.status(201).json({
      message: 'New prospect created successfully.',
      prospect: result.rows[0]
    });
  } catch (error) {
    logTechnicalError('POST /api/prospectos', 'Failed to insert new prospect into PostgreSQL', error);
    res.status(500).json({ error: 'Failed to insert new prospect into PostgreSQL.' });
  }
});

// 9. DELETE /api/prospectos/:id - Delete a prospect record
app.delete('/api/prospectos/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM temikia_crm.prospectos_negocios WHERE id = $1 RETURNING id, nombre',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prospect not found to delete.' });
    }

    logBusinessActivity(req, 'delete_prospect', result.rows[0].id, { nombre: result.rows[0].nombre });

    res.json({
      message: 'Prospect deleted successfully.',
      prospect: result.rows[0]
    });
  } catch (error) {
    logTechnicalError('DELETE /api/prospectos/:id', 'Failed to delete record from PostgreSQL', error);
    res.status(500).json({ error: 'Failed to delete record from PostgreSQL.' });
  }
});

// ==========================================
// AUTHENTICATION & SECURITY ENDPOINTS
// ==========================================

// Helper: Insert audit logs in temikia_crm.login_auditoria
async function auditLoginEvent({ login_id, miembro_id, email_login, evento, exitoso, req, detalle }) {
  try {
    let ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    // Clean up local IPv6 loopback IP to standard IPv4 for clean PG inet compatibility if needed
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
      ip = '127.0.0.1';
    }
    const userAgent = req.headers['user-agent'] || 'Desconocido';

    await pool.query(
      `INSERT INTO temikia_crm.login_auditoria 
       (login_id, miembro_id, email_login, evento, exitoso, ip_origen, user_agent, detalle) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        login_id || null, 
        miembro_id || null, 
        email_login || null, 
        evento, 
        exitoso, 
        ip, 
        userAgent, 
        detalle || null
      ]
    );
  } catch (err) {
    console.error('Audit logger failed:', err);
  }
}

// Helper: Stream structured business audit logs to stdout (Docker/Easypanel captures and rotates this)
function logBusinessActivity(req, action, targetId, details = null) {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'BUSINESS_AUDIT',
      miembroId: req.user ? req.user.miembroId : 'Sistema',
      rol: req.user ? req.user.rol : 'Sistema',
      ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
      action,
      targetId: targetId || null,
      details
    };
    console.log(`[BUSINESS_AUDIT] ${JSON.stringify(logEntry)}`);
  } catch (err) {
    console.error('Business logger failed:', err);
  }
}

// Helper: Stream structured technical error logs to stderr
function logTechnicalError(endpoint, msg, err = null) {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'TECHNICAL_ERROR',
      endpoint,
      message: msg,
      error: err ? err.message : null,
      stack: err ? err.stack : null
    };
    console.error(`[TECHNICAL_ERROR] ${JSON.stringify(logEntry)}`);
  } catch (logErr) {
    console.error('Technical logger failed:', logErr);
  }
}

// 10. POST /api/auth/login - Secure login for temikia.com domain
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
    }

    const emailLower = email.trim().toLowerCase();

    // 1. Enforce temikia.com domain
    if (!emailLower.endsWith('@temikia.com')) {
      await auditLoginEvent({
        evento: 'intento_login_dominio_invalido',
        exitoso: false,
        email_login: emailLower,
        req,
        detalle: 'Intento de login con dominio no permitido: ' + emailLower
      });
      return res.status(400).json({ 
        error: 'Acceso denegado: El portal corporativo solo permite iniciar sesión con cuentas @temikia.com.' 
      });
    }

    // 2. Fetch the user credentials and team member profile details
    const userRes = await pool.query(
      `SELECT ml.*, me.nombre_completo, me.nombre_corto, me.telefono, me.pais, me.ciudad, me.zona_horaria, me.cargo, me.foto_url 
       FROM temikia_crm.miembros_login ml
       LEFT JOIN temikia_crm.miembros_equipo me ON ml.miembro_id = me.miembro_id
       WHERE ml.email_login = $1`,
      [emailLower]
    );

    if (userRes.rows.length === 0) {
      await auditLoginEvent({
        evento: 'intento_login_usuario_inexistente',
        exitoso: false,
        email_login: emailLower,
        req,
        detalle: 'Intento de inicio de sesión de usuario no registrado: ' + emailLower
      });
      // Uniform generic error to prevent user existence enumeration
      return res.status(401).json({ 
        error: 'Usuario o contraseña incorrectos.' 
      });
    }

    const user = userRes.rows[0];

    // 3. Check if account is active
    if (!user.activo) {
      await auditLoginEvent({
        login_id: user.login_id,
        miembro_id: user.miembro_id,
        evento: 'login_cuenta_inactiva',
        exitoso: false,
        email_login: emailLower,
        req,
        detalle: 'Intento de acceso a cuenta desactivada/inactiva'
      });
      return res.status(403).json({ 
        error: 'Esta cuenta se encuentra desactivada. Contacte al administrador.' 
      });
    }

    // 4. Check if account is locked
    if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
      const minutesRemaining = Math.ceil((new Date(user.bloqueado_hasta) - new Date()) / 1000 / 60);
      await auditLoginEvent({
        login_id: user.login_id,
        miembro_id: user.miembro_id,
        evento: 'login_cuenta_bloqueada',
        exitoso: false,
        email_login: emailLower,
        req,
        detalle: `Intento de acceso a cuenta bloqueada por intentos fallidos. Minutos restantes: ${minutesRemaining}`
      });
      return res.status(403).json({ 
        error: `Esta cuenta se encuentra bloqueada temporalmente debido a múltiples intentos fallidos. Intente de nuevo en ${minutesRemaining} minutos.` 
      });
    }

    // 5. Check Password Hash using bcryptjs
    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);

    if (!isPasswordValid) {
      // Increment failed attempts
      const newAttempts = user.intentos_fallidos + 1;
      let blockUntil = user.bloqueado_hasta;
      let detailMsg = 'Contraseña incorrecta. Intento fallido.';

      if (newAttempts >= 5) {
        // Lock for 15 minutes
        blockUntil = new Date(Date.now() + 15 * 60 * 1000);
        detailMsg = 'Cuenta bloqueada por 15 minutos debido a 5 o más intentos fallidos.';
      }

      await pool.query(
        'UPDATE temikia_crm.miembros_login SET intentos_fallidos = $1, bloqueado_hasta = $2, updated_at = NOW() WHERE login_id = $3',
        [newAttempts, blockUntil, user.login_id]
      );

      await auditLoginEvent({
        login_id: user.login_id,
        miembro_id: user.miembro_id,
        evento: 'intento_login_password_incorrecto',
        exitoso: false,
        email_login: emailLower,
        req,
        detalle: detailMsg
      });

      return res.status(401).json({ 
        error: newAttempts >= 5 
          ? 'Se ha superado el número de intentos permitidos y la cuenta ha sido bloqueada temporalmente por 15 minutos.' 
          : 'Usuario o contraseña incorrectos.'
      });
    }

    // 6. Login Successful
    // 6. Check Password Expiration Policy (90 days)
    const lastUpdate = user.password_updated_at ? new Date(user.password_updated_at) : (user.created_at ? new Date(user.created_at) : new Date(0));
    const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000;
    const isPasswordExpired = (Date.now() - lastUpdate.getTime()) > ninetyDaysInMs;

    if (user.requiere_cambio_password || isPasswordExpired) {
      await auditLoginEvent({
        login_id: user.login_id,
        miembro_id: user.miembro_id,
        evento: 'login_requiere_cambio_password',
        exitoso: false,
        email_login: emailLower,
        req,
        detalle: isPasswordExpired ? 'Fuerza de cambio de clave: Contraseña expirada (>90 días)' : 'Primer inicio de sesión seguro'
      });

      return res.json({
        requiresPasswordChange: true,
        email: user.email_login,
        loginId: user.login_id,
        nombreCorto: user.nombre_corto || 'Colaborador',
        message: isPasswordExpired ? 'Su contraseña corporativa ha expirado por política de seguridad (límite de 90 días). Por favor actualícela.' : undefined
      });
    }

    // 7. Clear failed attempts (password was correct)
    await pool.query(
      'UPDATE temikia_crm.miembros_login SET intentos_fallidos = 0, bloqueado_hasta = NULL, updated_at = NOW() WHERE login_id = $1',
      [user.login_id]
    );

    // 8. Generate random 6-digit verification code
    const code2FA = Math.floor(100000 + Math.random() * 900000).toString();

    // 9. Persist code in DB with 3-minute expiration
    await pool.query(
      `UPDATE temikia_crm.miembros_login 
       SET codigo_2fa = $1, 
           codigo_2fa_expira = NOW() + INTERVAL '3 minutes',
           updated_at = NOW() 
       WHERE login_id = $2`,
      [code2FA, user.login_id]
    );

    // 10. Send Email via Hostinger SMTP in background
    const mailOptions = {
      from: `"Temikia Portal Seguro" <${process.env.SMTP_USER || 'no-reply@temikia.com'}>`,
      to: user.email_login,
      subject: `Código de Doble Factor (2FA) - Temikia CRM`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb; text-align: center; margin-bottom: 20px;">Verificación de Doble Factor</h2>
          <p>Hola <strong>${user.nombre_corto || 'Colaborador'}</strong>,</p>
          <p>Detectamos un inicio de sesión exitoso en tu cuenta del CRM de Temikia Agency. Por seguridad, utiliza el siguiente código de verificación de un solo uso para completar tu acceso:</p>
          <div style="background-color: #f8fafc; padding: 18px; border-radius: 6px; text-align: center; margin: 25px 0; border: 1px dashed #cbd5e1;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">${code2FA}</span>
          </div>
          <p style="color: #ef4444; font-size: 13px; text-align: center; font-weight: bold;">Este código es estrictamente válido por 3 minutos.</p>
          <p style="color: #64748b; font-size: 11.5px; text-align: center;">Si no solicitaste este código, te sugerimos modificar tu contraseña de inmediato desde el portal.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 10.5px; text-align: center;">Temikia Agency S.A. de C.V.</p>
        </div>
      `
    };

    transporter.sendMail(mailOptions).then(() => {
      console.log(`SUCCESS: 2FA email successfully delivered to ${user.email_login}`);
    }).catch(mailError => {
      console.error(`ERROR: Failed to deliver 2FA SMTP email:`, mailError);
    });

    // 11. Log 2FA request audit
    await auditLoginEvent({
      login_id: user.login_id,
      miembro_id: user.miembro_id,
      evento: 'login_solicitud_2fa',
      exitoso: true,
      email_login: emailLower,
      req,
      detalle: 'Código de doble factor de 6 dígitos enviado por correo'
    });

    res.json({
      requires2FA: true,
      email: user.email_login,
      loginId: user.login_id,
      nombreCorto: user.nombre_corto || 'Colaborador'
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Falla crítica del servidor al validar credenciales.' });
  }
});

// 10.5 POST /api/auth/verify-2fa - Validate 6-digit verification code
app.post('/api/auth/verify-2fa', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'El correo y el código son obligatorios.' });
    }

    const emailLower = email.trim().toLowerCase();
    const cleanCode = code.trim();

    // 1. Fetch user credentials and joined team member profile details
    const userRes = await pool.query(
      `SELECT ml.*, me.nombre_completo, me.nombre_corto, me.telefono, me.pais, me.ciudad, me.cargo, me.foto_url 
       FROM temikia_crm.miembros_login ml
       LEFT JOIN temikia_crm.miembros_equipo me ON ml.miembro_id = me.miembro_id
       WHERE ml.email_login = $1`,
      [emailLower]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Código de verificación incorrecto o expirado.' });
    }

    const user = userRes.rows[0];

    // 2. Validate locked state
    if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
      const minutesRemaining = Math.ceil((new Date(user.bloqueado_hasta) - new Date()) / 1000 / 60);
      return res.status(403).json({ 
        error: `Esta cuenta se encuentra bloqueada temporalmente. Intente de nuevo en ${minutesRemaining} minutos.` 
      });
    }

    // 3. Verify Code match and expiration time
    if (!user.codigo_2fa || user.codigo_2fa !== cleanCode) {
      // Increment failed attempts
      const newAttempts = user.intentos_fallidos + 1;
      let blockUntil = user.bloqueado_hasta;
      let detailMsg = 'Código 2FA incorrecto.';

      if (newAttempts >= 5) {
        blockUntil = new Date(Date.now() + 15 * 60 * 1000);
        detailMsg = 'Cuenta bloqueada por 15 minutos debido a 5 intentos fallidos (2FA/Pass).';
      }

      await pool.query(
        'UPDATE temikia_crm.miembros_login SET intentos_fallidos = $1, bloqueado_hasta = $2, updated_at = NOW() WHERE login_id = $3',
        [newAttempts, blockUntil, user.login_id]
      );

      await auditLoginEvent({
        login_id: user.login_id,
        miembro_id: user.miembro_id,
        evento: 'login_2fa_fallido_codigo_invalido',
        exitoso: false,
        email_login: emailLower,
        req,
        detalle: `${detailMsg} Código ingresado: ${cleanCode}`
      });

      return res.status(401).json({ 
        error: newAttempts >= 5 
          ? 'Código 2FA incorrecto. Cuenta bloqueada temporalmente por 15 minutos.' 
          : `Código de verificación incorrecto. Intento ${newAttempts} de 5 fallidos.`
      });
    }

    // 4. Verify Code Expiration
    if (new Date(user.codigo_2fa_expira) < new Date()) {
      await auditLoginEvent({
        login_id: user.login_id,
        miembro_id: user.miembro_id,
        evento: 'login_2fa_fallido_codigo_expirado',
        exitoso: false,
        email_login: emailLower,
        req,
        detalle: 'Código 2FA expirado. Tiempo de 3 minutos superado.'
      });

      return res.status(401).json({ 
        error: 'El código de verificación ha expirado (límite de 3 minutos). Por favor inicie sesión de nuevo para generar uno nuevo.' 
      });
    }

    // 5. Code is correct!
    // Clear 2FA data and attempts
    await pool.query(
      `UPDATE temikia_crm.miembros_login 
       SET codigo_2fa = NULL, 
           codigo_2fa_expira = NULL, 
           intentos_fallidos = 0, 
           bloqueado_hasta = NULL, 
           ultimo_login_at = NOW(), 
           updated_at = NOW() 
       WHERE login_id = $1`,
      [user.login_id]
    );

    // Audit log success
    await auditLoginEvent({
      login_id: user.login_id,
      miembro_id: user.miembro_id,
      evento: 'login_exitoso_con_2fa',
      exitoso: true,
      email_login: emailLower,
      req,
      detalle: 'Inicio de sesión completado satisfactoriamente mediante verificación 2FA'
    });

    const token = jwt.sign(
      { loginId: user.login_id, miembroId: user.miembro_id, rol: user.rol_login },
      process.env.JWT_SECRET || 'temikia-secret-key-super-secure',
      { expiresIn: '8h' }
    );

    res.json({
      user: {
        loginId: user.login_id,
        miembroId: user.miembro_id,
        email: user.email_login,
        rol: user.rol_login,
        token,
        nombreCompleto: user.nombre_completo || user.nombre_corto || 'Miembro',
        nombreCorto: user.nombre_corto || 'Miembro',
        telefono: user.telefono || '',
        pais: user.pais || '',
        ciudad: user.ciudad || '',
        zonaHoraria: user.zona_horaria || '',
        cargo: user.cargo || '',
        fotoUrl: user.foto_url || ''
      }
    });
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    res.status(500).json({ error: 'Falla crítica del servidor al verificar código de doble factor.' });
  }
});

// 11. POST /api/auth/change-password - Change password on first session or manual reset
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    const emailLower = email.trim().toLowerCase();

    // 1. Fetch user credentials and joined team member profile details
    const userRes = await pool.query(
      `SELECT ml.*, me.nombre_completo, me.nombre_corto, me.telefono, me.pais, me.ciudad, me.cargo, me.foto_url 
       FROM temikia_crm.miembros_login ml
       LEFT JOIN temikia_crm.miembros_equipo me ON ml.miembro_id = me.miembro_id
       WHERE ml.email_login = $1`,
      [emailLower]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'El usuario no existe.' });
    }

    const user = userRes.rows[0];

    // 2. Validate current password
    const isOldPasswordValid = bcrypt.compareSync(oldPassword, user.password_hash);
    if (!isOldPasswordValid) {
      await auditLoginEvent({
        login_id: user.login_id,
        miembro_id: user.miembro_id,
        evento: 'cambio_password_fallido_anterior_invalido',
        exitoso: false,
        email_login: emailLower,
        req,
        detalle: 'Fallo al cambiar contraseña: Clave anterior incorrecta'
      });
      return res.status(401).json({ error: 'La contraseña actual ingresada es incorrecta.' });
    }

    // Validate password strength: min 8 chars, numbers, symbols, uppercase, lowercase
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};\':",\\|.<>\/?]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      await auditLoginEvent({
        login_id: user.login_id,
        miembro_id: user.miembro_id,
        evento: 'cambio_password_fallido_debil',
        exitoso: false,
        email_login: emailLower,
        req,
        detalle: 'Fallo al cambiar contraseña: Clave no cumple con requisitos de seguridad'
      });
      return res.status(400).json({ 
        error: 'La nueva contraseña es insegura. Debe contener al menos 8 caracteres, incluyendo letras mayúsculas, minúsculas, números y símbolos especiales.' 
      });
    }

    // 3. Hash new password using bcryptjs
    const salt = bcrypt.genSaltSync(12);
    const newHash = bcrypt.hashSync(newPassword, salt);

    // 4. Update password in PostgreSQL DB
    await pool.query(
      `UPDATE temikia_crm.miembros_login 
       SET password_hash = $1, 
           requiere_cambio_password = false, 
           password_updated_at = NOW(), 
           intentos_fallidos = 0,
           bloqueado_hasta = NULL,
           updated_at = NOW() 
       WHERE login_id = $2`,
      [newHash, user.login_id]
    );

    // 5. Audit log success
    await auditLoginEvent({
      login_id: user.login_id,
      miembro_id: user.miembro_id,
      evento: 'cambio_password_exitoso',
      exitoso: true,
      email_login: emailLower,
      req,
      detalle: 'Contraseña del usuario actualizada exitosamente. Flag requiere_cambio_password desactivado.'
    });

    const token = jwt.sign(
      { loginId: user.login_id, miembroId: user.miembro_id, rol: user.rol_login },
      process.env.JWT_SECRET || 'temikia-secret-key-super-secure',
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      message: '¡Excelente! Contraseña actualizada con éxito corporativo.',
      user: {
        loginId: user.login_id,
        miembroId: user.miembro_id,
        email: user.email_login,
        rol: user.rol_login,
        token,
        nombreCompleto: user.nombre_completo || user.nombre_corto || 'Miembro',
        nombreCorto: user.nombre_corto || 'Miembro',
        telefono: user.telefono || '',
        pais: user.pais || '',
        ciudad: user.ciudad || '',
        cargo: user.cargo || '',
        fotoUrl: user.foto_url || ''
      }
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Falla interna al guardar su nueva contraseña.' });
  }
});

// 12. GET /api/auth/profile/:miembroId - Fetch team member profile details from DB
app.get('/api/auth/profile/:miembroId', authenticateToken, async (req, res) => {
  try {
    const { miembroId } = req.params;

    // IDOR Protection: Verify owner of profile or admin level access
    if (req.user.miembroId !== miembroId && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: No tiene permisos para consultar este perfil.' });
    }

    const result = await pool.query(
      'SELECT miembro_id, nombre_completo, nombre_corto, telefono, email, pais, ciudad, zona_horaria, cargo, foto_url, notas FROM temikia_crm.miembros_equipo WHERE miembro_id = $1',
      [miembroId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil de miembro no encontrado.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Error interno al cargar perfil de miembro.' });
  }
});

// 13. PUT /api/auth/profile/:miembroId - Update team member profile details, including base64 foto_url
app.put('/api/auth/profile/:miembroId', authenticateToken, express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { miembroId } = req.params;

    // IDOR Protection: Verify owner of profile or admin level access
    if (req.user.miembroId !== miembroId && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: No tiene permisos para modificar este perfil.' });
    }

    const { nombre_completo, nombre_corto, telefono, pais, ciudad, cargo, foto_url, notas } = req.body;

    const result = await pool.query(
      `UPDATE temikia_crm.miembros_equipo 
       SET nombre_completo = $1, 
           nombre_corto = $2, 
           telefono = $3, 
           pais = $4, 
           ciudad = $5, 
           cargo = $6, 
           foto_url = $7,
           notas = $8,
           updated_at = NOW() 
       WHERE miembro_id = $9
       RETURNING *`,
      [nombre_completo, nombre_corto, telefono, pais, ciudad, cargo, foto_url || null, notas || null, miembroId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Miembro no encontrado para actualizar.' });
    }

    logBusinessActivity(req, 'update_profile', result.rows[0].miembro_id, { nombre: result.rows[0].nombre_completo });

    res.json({
      message: 'Perfil actualizado exitosamente en PostgreSQL.',
      profile: result.rows[0]
    });
  } catch (err) {
    logTechnicalError('PUT /api/auth/profile/:miembroId', 'Falla interna al actualizar perfil en base de datos', err);
    res.status(500).json({ error: 'Falla interna al actualizar perfil en base de datos.' });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'temikia-crm',
    timestamp: new Date().toISOString()
  });
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');

  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API route not found.' });
    }

    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start listening
app.listen(PORT, HOST, () => {
  console.log(`Server Express listening on ${HOST}:${PORT}`);
});
