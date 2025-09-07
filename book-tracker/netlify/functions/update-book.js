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
    const { bookId, profit, quarter } = JSON.parse(event.body);
    
    if (!bookId || profit === undefined || !quarter) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    
    // Add the quarterly update
    await sql`
      INSERT INTO quarterly_updates (book_id, quarter, profit)
      VALUES (${bookId}, ${quarter}, ${profit})
    `;
    
    // Update cumulative profit
    await sql`
      UPDATE active_books 
      SET cumulative_profit = cumulative_profit + ${profit}
      WHERE id = ${bookId}
    `;
    
    // Get updated book info
    const updatedBook = await sql`
      SELECT * FROM active_books WHERE id = ${bookId}
    `;

    const book = updatedBook[0];
    
    // Check if book is now paid off
    const isPaidOff = book.cumulative_profit >= book.dev_cost;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        book,
        isPaidOff
      })
    };

  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update book' })
    };
  }
};