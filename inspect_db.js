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
    
    // Check columns of negocios_gmaps
    const resColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'temikia_crm' AND table_name = 'negocios_gmaps'
    `);
    console.log('Columns in temikia_crm.negocios_gmaps:');
    console.log(resColumns.rows);
    
    // Check a sample row
    const resSample = await client.query(`
      SELECT id, total_score, reviews_count, web_search, peoplealsosearch 
      FROM temikia_crm.negocios_gmaps 
      WHERE total_score IS NOT NULL OR reviews_count IS NOT NULL OR web_search IS NOT NULL OR peoplealsosearch IS NOT NULL
      LIMIT 1
    `);
    console.log('Sample row from temikia_crm.negocios_gmaps:');
    console.log(JSON.stringify(resSample.rows[0], null, 2));
    
  } catch (err) {
    console.error('Error during query:', err);
  } finally {
    await client.end();
  }
}

run();
