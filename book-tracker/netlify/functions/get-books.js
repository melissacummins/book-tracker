const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    
    // Create tables if they don't exist
    await sql`
      CREATE TABLE IF NOT EXISTS active_books (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        dev_cost DECIMAL(10,2) NOT NULL,
        launch_date DATE NOT NULL,
        cumulative_profit DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS paid_off_books (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        dev_cost DECIMAL(10,2) NOT NULL,
        launch_date DATE NOT NULL,
        payoff_date DATE NOT NULL,
        final_profit DECIMAL(10,2) NOT NULL,
        months_to_payoff INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS quarterly_updates (
        id SERIAL PRIMARY KEY,
        book_id INTEGER REFERENCES active_books(id),
        quarter TEXT NOT NULL,
        profit DECIMAL(10,2) NOT NULL,
        date_added TIMESTAMP DEFAULT NOW()
      )
    `;

    // Get all active books
    const activeBooks = await sql`SELECT * FROM active_books ORDER BY created_at DESC`;
    
    // Get all paid off books
    const paidOffBooks = await sql`SELECT * FROM paid_off_books ORDER BY payoff_date DESC`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        activeBooks,
        paidOffBooks
      })
    };

  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch books' })
    };
  }
};