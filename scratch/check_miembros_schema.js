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
    
    // Check members list
    const resMembers = await client.query(`
      SELECT * FROM temikia_crm.miembros_equipo LIMIT 2
    `);
    console.log('Sample members:');
    console.log(resMembers.rows);
    
  } catch (err) {
    console.error('Error during query:', err);
  } finally {
    await client.end();
  }
}

run();
