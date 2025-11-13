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

// ROOT ROUTE - This was missing!
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Funding Opportunities Search API</title>
        <style>
          body { 
            font-family: Arial, Helvetica, sans-serif;
            background: #f0f4f8;
            margin: 0;
            padding: 0;
            min-height: 100vh;
          }
          .header {
            background: #0c4b7a;
            color: white;
            padding: 40px 20px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .container {
            background: white;
            max-width: 900px;
            margin: 40px auto;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { 
            color: white;
            margin: 0 0 15px 0;
            font-size: 32px;
            font-weight: 600;
          }
          .subtitle {
            color: rgba(255,255,255,0.9);
            margin-bottom: 20px;
            font-size: 16px;
            line-height: 1.6;
          }
          .status {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-top: 10px;
            border: 1px solid rgba(255,255,255,0.3);
          }
          .button {
            display: inline-block;
            margin: 20px 10px;
            padding: 14px 32px;
            background: #0c4b7a;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            transition: all 0.3s;
            font-size: 16px;
          }
          .button:hover {
            background: #094063;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(12,75,122,0.3);
          }
          .content {
            text-align: center;
            padding: 20px 0;
          }
          .content p {
            color: #555;
            line-height: 1.8;
            font-size: 15px;
          }
          .endpoints {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 2px solid #e8eef3;
            text-align: left;
          }
          .endpoints h3 {
            color: #0c4b7a;
            margin-bottom: 20px;
            font-size: 20px;
          }
          .endpoint {
            background: #f8fafc;
            padding: 14px 18px;
            margin: 10px 0;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            color: #495057;
            border-left: 3px solid #0c4b7a;
          }
          .method {
            display: inline-block;
            background: #0c4b7a;
            color: white;
            padding: 4px 10px;
            border-radius: 4px;
            font-weight: 600;
            margin-right: 10px;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔍 Funding Opportunities Search</h1>
          <div class="subtitle">
            Complete one or more of the filters below to search our database and find research opportunities that match your interests.
          </div>
          <div class="status">✓ API Online</div>
        </div>
        
        <div class="container">
          <div class="content">
            <p>
              Welcome to the Funding Opportunities Search API service. 
              This API powers the funding opportunities search system and provides access to 
              comprehensive research funding data.
            </p>
            
            <a href="https://www.jotform.com/form/252758211486058" class="button">
              Start Searching →
            </a>
          </div>
          
          <div class="endpoints">
            <h3>Available API Endpoints</h3>
            <div class="endpoint">
              <span class="method">GET</span> /health
            </div>
            <div class="endpoint">
              <span class="method">GET</span> /search?keyword=...&discipline=...&funder=...&deadline=...
            </div>
            <div class="endpoint">
              <span class="method">POST</span> /search
            </div>
          </div>
        </div>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function handleSearch(query, limit, res, filters = {}) {
  try {
    console.log('Search query:', query);
    console.log('Filters:', filters);

    let url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}`;
    if (VIEW) url += `?view=${encodeURIComponent(VIEW)}`;

    console.log('Fetching from Airtable:', url);

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });

    console.log('Airtable response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable error response:', errorText);
      throw new Error(`Airtable API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('Records fetched:', data.records?.length || 0);
    
    let items = data.records.map(r => ({ id: r.id, ...r.fields }));
    
    // Filter by deadline if provided (show opportunities with deadline on or after the search date)
    if (filters.deadline) {
      const searchDeadline = new Date(filters.deadline);
      items = items.filter(item => {
        if (!item.Deadline) return false;
        const itemDeadline = new Date(item.Deadline);
        return itemDeadline >= searchDeadline;
      });
    }
    
    if (items.length === 0) {
      return res.send(`
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
              h1 { color: #333; }
              .button { 
                display: inline-block; 
                margin-top: 20px; 
                padding: 12px 24px; 
                background: #0c4b7a; 
                color: white; 
                text-decoration: none; 
                border-radius: 6px; 
              }
            </style>
          </head>
          <body>
            <h1>No opportunities found</h1>
            <p>No opportunities match your search criteria. Try adjusting your filters.</p>
            <a href="https://www.jotform.com/form/252758211486058" class="button">← New Search</a>
          </body>
        </html>
      `);
    }
    
    // Perform fuzzy search if query provided
    let output;
    if (query) {
      const fuse = new Fuse(items, {
        keys: Object.keys(items[0] || {}).filter(k => k !== 'id'),
        threshold: 0.4,
        includeScore: true
      });
      
      const results = fuse.search(query).slice(0, limit);
      output = results.map(r => ({ score: r.score, ...r.item }));
    } else {
      // If only deadline filter (no search query), return filtered items
      output = items.slice(0, limit).map(item => ({ score: 0, ...item }));
    }

    // Build filter summary for display
    let filterSummary = [];
    if (filters.keyword) filterSummary.push(`Keywords: "${filters.keyword}"`);
    if (filters.discipline && filters.discipline !== 'All Disciplines') filterSummary.push(`Discipline: ${filters.discipline}`);
    if (filters.funder) filterSummary.push(`Funder: "${filters.funder}"`);
    if (filters.deadline) filterSummary.push(`Deadline after: ${new Date(filters.deadline).toLocaleDateString()}`);

    const responseHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Search Results</title>
          <style>
            body { 
              font-family: Arial, Helvetica, sans-serif;
              max-width: 900px; 
              margin: 0 auto; 
              padding: 20px;
              background: #f0f4f8;
            }
            .header {
              background: #0c4b7a;
              color: white;
              padding: 30px;
              margin: -20px -20px 30px -20px;
              text-align: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .subtitle { margin-top: 10px; opacity: 0.9; font-size: 14px; }
            .search-again {
              display: inline-block;
              background: white;
              color: #0c4b7a;
              padding: 12px 24px;
              border: 2px solid white;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 600;
              margin-top: 10px;
              transition: all 0.2s;
            }
            .search-again:hover {
              background: rgba(255,255,255,0.9);
              transform: translateY(-1px);
            }
            .result { 
              padding: 20px; 
              margin: 15px 0; 
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              border-left: 4px solid #0c4b7a;
            }
            .title { 
              font-weight: bold; 
              color: #0c4b7a;
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
            .match-score {
              display: inline-block;
              background: #e3f2fd;
              color: #0c4b7a;
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
            }
            .filters {
              background: #fff3e0;
              padding: 15px;
              border-radius: 6px;
              margin-bottom: 20px;
              font-size: 14px;
            }
            .filters strong {
              color: #e65100;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔍 Funding Opportunities</h1>
            <div class="subtitle">Search Results</div>
            <a href="https://www.jotform.com/form/252758211486058" class="search-again">← New Search</a>
          </div>
          
          ${filterSummary.length > 0 ? `
            <div class="filters">
              <strong>Filters applied:</strong> ${filterSummary.join(' • ')}
            </div>
          ` : ''}
          
          <p style="color: #666; margin-bottom: 20px;">
            <strong>${output.length}</strong> matching opportunit${output.length === 1 ? 'y' : 'ies'} found
          </p>
          
          ${output.map(r => {
            const matchScore = query ? ((1 - r.score) * 100).toFixed(0) : '100';
            return `
              <div class="result">
                <div class="title">${r.Opportunity || 'Untitled Opportunity'}</div>
                ${query ? `<div class="meta"><span class="match-score">${matchScore}% match</span></div>` : ''}
                ${r.Funder ? `<div class="meta"><span class="label">Funder:</span> ${r.Funder}</div>` : ''}
                ${r.Amount ? `<div class="meta"><span class="label">Amount:</span> $${typeof r.Amount === 'number' ? r.Amount.toLocaleString() : r.Amount}</div>` : ''}
                ${r.Deadline ? `<div class="meta"><span class="label">Deadline:</span> ${new Date(r.Deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>` : ''}
                ${r.Discipline && typeof r.Discipline === 'string' ? `<div class="meta"><span class="label">Discipline:</span> ${r.Discipline}</div>` : ''}
                ${r['Type of Funder'] && typeof r['Type of Funder'] === 'string' ? `<div class="meta"><span class="label">Type:</span> ${r['Type of Funder']}</div>` : ''}
                ${r.Summary ? `<div class="summary">${r.Summary}</div>` : ''}
                ${r['Opportunity Link'] ? `<a href="${r['Opportunity Link']}" target="_blank" class="link" rel="noopener noreferrer">View Full Details →</a>` : ''}
              </div>
            `;
          }).join('')}
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
            body { font-family: Arial, Helvetica, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
            .error { color: #0c4b7a; background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #0c4b7a; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>Error</h1>
            <p>${error.message}</p>
          </div>
        </body>
      </html>
    `);
  }
}

app.get('/search', async (req, res) => {
  const keyword = req.query.keyword || '';
  const discipline = req.query.discipline || '';
  const funder = req.query.funder || '';
  const deadline = req.query.deadline || '';
  const limit = parseInt(req.query.limit) || 10;
  
  // Build search query from all provided fields
  let searchTerms = [];
  if (keyword) searchTerms.push(keyword);
  if (discipline && discipline !== 'All Disciplines') {
    searchTerms.push(discipline);
  }
  if (funder) searchTerms.push(funder);
  
  const searchQuery = searchTerms.join(' ').trim();
  
  // If no search criteria provided at all
  if (!searchQuery && !deadline) {
    return res.send(`
      <html>
        <head>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 100px auto; text-align: center; }
            .error { color: #0c4b7a; }
            .button { 
              display: inline-block; 
              margin-top: 20px; 
              padding: 12px 24px; 
              background: #0c4b7a; 
              color: white; 
              text-decoration: none; 
              border-radius: 6px; 
            }
          </style>
        </head>
        <body>
          <h1 class="error">No search criteria provided</h1>
          <p>Please provide at least one search term, discipline, funder, or deadline.</p>
          <a href="https://www.jotform.com/form/252758211486058" class="button">← Back to Search</a>
        </body>
      </html>
    `);
  }
  
  await handleSearch(searchQuery, limit, res, { deadline, discipline, funder, keyword });
});

app.post('/search', async (req, res) => {
  const query = req.body.query || '';
  const limit = req.body.limit || 10;
  await handleSearch(query, limit, res);
});

// For Vercel serverless
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;


