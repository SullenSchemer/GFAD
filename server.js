import express from 'express';
import Fuse from 'fuse.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE = process.env.AIRTABLE_TABLE_NAME;
const VIEW = process.env.AIRTABLE_VIEW_NAME;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handle both GET and POST requests
async function handleSearch(query, limit, res) {
  try {
    if (!query) {
      return res.send(`
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; text-align: center; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">No search query provided</h1>
            <p>Please go back and enter a search term.</p>
          </body>
        </html>
      `);
    }

    let url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}`;
    if (VIEW) url += `?view=${encodeURIComponent(VIEW)}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });

    if (!response.ok) {
      throw new Error('Airtable API error');
    }

    const data = await response.json();
    const items = data.records.map(r => ({ id: r.id, ...r.fields }));
    
    if (items.length === 0) {
      return res.send(`
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
              h1 { color: #333; }
            </style>
          </head>
          <body>
            <h1>No opportunities found in database</h1>
            <p>The database appears to be empty.</p>
          </body>
        </html>
      `);
    }
    
    const fuse = new Fuse(items, {
      keys: Object.keys(items[0] || {}).filter(k => k !== 'id'),
      threshold: 0.4,
      includeScore: true
    });
    
    const results = fuse.search(query).slice(0, limit);
    const output = results.map(r => ({ score: r.score, ...r.item }));

    const responseHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Search Results - ${query}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
              max-width: 900px; 
              margin: 0 auto; 
              padding: 20px;
              background: #f5f5f5;
            }
            .header {
              background: #d32f2f;
              color: white;
              padding: 30px;
              margin: -20px -20px 30px -20px;
              text-align: center;
            }
            h1 { margin: 0; font-size: 28px; }
            .subtitle { margin-top: 10px; opacity: 0.9; }
            .result { 
              padding: 20px; 
              margin: 15px 0; 
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              border-left: 4px solid #d32f2f;
            }
            .title { 
              font-weight: bold; 
              color: #d32f2f;
              font-size: 18px;
              margin-bottom: 10px;
            }
            .meta { 
              color: #666; 
              font-size: 14px; 
              margin: 5px 0;
              display: flex;
              gap: 5px;
            }
            .label {
              font-weight: 600;
              color: #333;
            }
            .summary {
              margin-top: 12px;
              line-height: 1.6;
              color: #444;
            }
            .link {
              display: inline-block;
              margin-top: 10px;
              color: #1976d2;
              text-decoration: none;
              font-weight: 500;
            }
            .link:hover {
              text-decoration: underline;
            }
            .no-results {
              text-align: center;
              padding: 60px 20px;
              background: white;
              border-radius: 8px;
            }
            .match-score {
              display: inline-block;
              background: #e3f2fd;
              color: #1976d2;
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔍 Funding Opportunities</h1>
            <div class="subtitle">Search results for "${query}"</div>
          </div>
          
          ${output.length === 0 ? `
            <div class="no-results">
              <h2>No matching opportunities found</h2>
              <p>Try different search terms or browse all opportunities.</p>
            </div>
          ` : `
            <p style="color: #666; margin-bottom: 20px;">
              <strong>${output.length}</strong> matching opportunit${output.length === 1 ? 'y' : 'ies'} found
            </p>
            ${output.map(r => {
              const matchScore = ((1 - r.score) * 100).toFixed(0);
              return `
                <div class="result">
                  <div class="title">${r.Opportunity || 'Untitled Opportunity'}</div>
                  <div class="meta">
                    <span class="match-score">${matchScore}% match</span>
                  </div>
                  ${r.Funder ? `<div class="meta"><span class="label">Funder:</span> ${r.Funder}</div>` : ''}
                  ${r.Amount ? `<div class="meta"><span class="label">Amount:</span> ${r.Amount}</div>` : ''}
                  ${r.Deadline ? `<div class="meta"><span class="label">Deadline:</span> ${r.Deadline}</div>` : ''}
                  ${r['Type of Funder'] ? `<div class="meta"><span class="label">Type:</span> ${r['Type of Funder']}</div>` : ''}
                  ${r.Summary ? `<div class="summary">${r.Summary}</div>` : ''}
                  ${r['Opportunity Link'] ? `<a href="${r['Opportunity Link']}" target="_blank" class="link">View Full Details →</a>` : ''}
                </div>
              `;
            }).join('')}
          `}
        </body>
      </html>
    `;

    res.send(responseHtml);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).send(`
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; text-align: center; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h1 class="error">Error</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
}

// GET endpoint for URL parameters
app.get('/search', async (req, res) => {
  const query = req.query.query || req.query.q || req.query.keyword || '';
  const limit = parseInt(req.query.limit) || 10;
  await handleSearch(query, limit, res);
});

// POST endpoint for API calls
app.post('/search', async (req, res) => {
  const query = req.body.query || '';
  const limit = req.body.limit || 10;
  await handleSearch(query, limit, res);
});

app.listen(process.env.PORT || 3000);
export default app;
