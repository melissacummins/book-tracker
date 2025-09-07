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

  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { bookId, title, devCost, launchDate } = JSON.parse(event.body);
    
    if (!bookId || !title || !devCost || !launchDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    
    const result = await sql`
      UPDATE active_books 
      SET title = ${title}, dev_cost = ${devCost}, launch_date = ${launchDate}
      WHERE id = ${bookId}
      RETURNING *
    `;

    if (result.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Book not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ book: result[0] })
    };

  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to edit book' })
    };
  }
};