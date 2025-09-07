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
    const { bookId } = JSON.parse(event.body);
    
    if (!bookId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Book ID is required' })
      };
    }

    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    
    // Get the book details
    const book = await sql`
      SELECT * FROM active_books WHERE id = ${bookId}
    `;
    
    if (book.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Book not found' })
      };
    }

    const bookData = book[0];
    
    // Calculate months to payoff
    const launchDate = new Date(bookData.launch_date);
    const payoffDate = new Date();
    const monthsToPayoff = (payoffDate.getFullYear() - launchDate.getFullYear()) * 12 + 
                          (payoffDate.getMonth() - launchDate.getMonth());

    // Move to paid off books
    await sql`
      INSERT INTO paid_off_books (
        title, dev_cost, launch_date, payoff_date, final_profit, months_to_payoff
      ) VALUES (
        ${bookData.title}, 
        ${bookData.dev_cost}, 
        ${bookData.launch_date}, 
        ${payoffDate.toISOString().split('T')[0]}, 
        ${bookData.cumulative_profit}, 
        ${monthsToPayoff}
      )
    `;
    
    // Remove from active books
    await sql`DELETE FROM active_books WHERE id = ${bookId}`;
    
    // Remove related quarterly updates
    await sql`DELETE FROM quarterly_updates WHERE book_id = ${bookId}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: `"${bookData.title}" moved to paid off books!`
      })
    };

  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to move book to paid off' })
    };
  }
};