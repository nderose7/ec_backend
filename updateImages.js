const { Pool } = require('pg');

// Configure your PostgreSQL connection
const pool = new Pool({
  user: 'ec-backend',
  host: 'localhost',
  database: 'ec-backend',
  password: 'ec-backend',
  port: 5432, // Your DB port, 5432 is the default for PostgreSQL
});

async function updateImageUrls() {
  const baseUrl = 'https://eatclassy.nyc3.cdn.digitaloceanspaces.com';

  try {
    // Connect to the database
    const client = await pool.connect();

    // Get images associated with recipes
    const res = await client.query(`
      SELECT files.id, files.name 
      FROM files 
      JOIN files_related_morphs ON files.id = files_related_morphs.file_id 
      WHERE files_related_morphs.related_type = 'api::recipe.recipe'
    `);

    for (const row of res.rows) {
      const newUrl = `${baseUrl}/${row.name}`; // Construct the new URL

      // Update the image entry in the database
      await client.query('UPDATE files SET url = $1 WHERE id = $2', [newUrl, row.id]);
    }

    console.log('Image URLs updated successfully.');
  } catch (err) {
    console.error('Error running query', err);
  } finally {
    // Close the database connection
    pool.end();
  }
}

updateImageUrls();
