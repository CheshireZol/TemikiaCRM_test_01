import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('Connected to database!');
    
    // 1. Get all members
    const resMembers = await client.query(`
      SELECT miembro_id, nombre_completo, nombre_corto 
      FROM temikia_crm.miembros_equipo 
      ORDER BY nombre_completo
    `);
    console.log('--- ALL MEMBERS ---');
    console.log(resMembers.rows);
    
    // 2. Query some leads and check their miembro_id
    const resLeads = await client.query(`
      SELECT p.id, p.nombre, p.miembro_id, me.nombre_completo as executive_name
      FROM temikia_crm.prospectos_negocios p
      LEFT JOIN temikia_crm.miembros_equipo me ON p.miembro_id = me.miembro_id
      LIMIT 10
    `);
    console.log('--- SAMPLE LEADS ---');
    console.log(resLeads.rows);

    // 3. Query leads specifically where executive is "Sin Asignar" or similar
    const resSinAsignar = await client.query(`
      SELECT p.id, p.nombre, p.miembro_id, me.nombre_completo as executive_name
      FROM temikia_crm.prospectos_negocios p
      LEFT JOIN temikia_crm.miembros_equipo me ON p.miembro_id = me.miembro_id
      WHERE p.miembro_id IS NULL OR me.nombre_completo = 'Sin Asignar' OR p.miembro_id::text = ''
      LIMIT 10
    `);
    console.log('--- LEADS WITH SIN ASIGNAR OR NULL EXECUTIVE ---');
    console.log(resSinAsignar.rows);

  } catch (err) {
    console.error('Error during query:', err);
  } finally {
    await client.end();
  }
}

run();
