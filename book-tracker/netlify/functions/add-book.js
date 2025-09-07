const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { title, devCost, launchDate } = JSON.parse(event.body);
    
    if (!title || !devCost || !launchDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    
    const result = await sql`
      INSERT INTO active_books (title, dev_cost, launch_date)
      VALUES (${title}, ${devCost}, ${launchDate})
      RETURNING *
    `;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ book: result[0] })
    };

  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to add book' })
    };
  }
};