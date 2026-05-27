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
    
    // Query unique countries
    const resLead406 = await client.query(`
      SELECT p.*, g.giro as giro_nombre, n.total_score, n.reviews_count, n.web_search, n.peoplealsosearch
      FROM temikia_crm.prospectos_negocios p
      LEFT JOIN temikia_crm.giros_negocios g ON p.giro_id = g.id
      LEFT JOIN temikia_crm.negocios_gmaps n ON p.negocios_gmaps_id = n.id
      WHERE p.negocios_gmaps_id = 406 OR p.nombre ILIKE '%Humberto%'
    `);
    console.log('Lead 406 data:');
    console.log(JSON.stringify(resLead406.rows[0], null, 2));
    
    // Query unique countries
    const resHorarios = await client.query(`
      SELECT nombre, horario FROM temikia_crm.prospectos_negocios WHERE horario IS NOT NULL LIMIT 8
    `);
    console.log('Sample horarios from prospectos_negocios:');
    resHorarios.rows.forEach(r => {
      console.log(r.nombre + ':');
      console.log(JSON.stringify(r.horario, null, 2));
    });
    
  } catch (err) {
    console.error('Error during query:', err);
  } finally {
    await client.end();
  }
}

run();
