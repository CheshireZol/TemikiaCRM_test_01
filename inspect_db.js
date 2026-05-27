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
    
    // Check columns of miembros_equipo
    const resColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'temikia_crm' AND table_name = 'miembros_equipo'
    `);
    console.log('Columns in temikia_crm.miembros_equipo:');
    console.log(resColumns.rows);
    
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
