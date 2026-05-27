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
    
    // Add column if it does not exist
    await client.query(`
      ALTER TABLE temikia_crm.prospectos_negocios 
      ADD COLUMN IF NOT EXISTS asistente_ia_activo BOOLEAN DEFAULT false;
    `);
    console.log('Column asistente_ia_activo added successfully (or already exists)!');
  } catch (err) {
    console.error('Error during query:', err);
  } finally {
    await client.end();
  }
}

run();
