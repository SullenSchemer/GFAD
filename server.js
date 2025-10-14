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

app.post('/search', async (req, res) => {
  try {
    console.log('Received request:', req.body);
    
    // Handle both direct API calls and Jotform webhook format
    let query;
    if (req.body.rawRequest) {
      // Jotform webhook format
      const formData = JSON.parse(req.body.rawRequest);
      query = formData.keyword || formData.q_keyword || formData['1'] || '';
    } else {
      // Direct API format
      query = req.body.query || '';
    }
    
    const limit = req.body.limit || 10;

    if (!query) {
      return res.status(400).json({ error: 'Query required' });
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
    
    const fuse = new Fuse(items, {
      keys: Object.keys(items[0] || {}).filter(k => k !== 'id'),
      threshold: 0.4,
      includeScore: true
    });
    
    const results = fuse.search(query).slice(0, limit);
    const output = results.map(r => ({ score: r.score, ...r.item }));

    // Format response for Jotform
    const responseHtml = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
            h1 { color: #333; }
            .result { padding: 15px; margin: 10px 0; background: #f5f5f5; border-left: 4px solid #0070f3; }
            .title { font-weight: bold; color: #0070f3; }
            .meta { color: #666; font-size: 14px; margin: 5px 0; }
          </style>
        </head>
        <body>
          <h1>Search Results for "${query}"</h1>
          <p>Found ${output.length} matching opportunities</p>
          ${output.map(r => `
            <div class="result">
              <div class="title">${r.Opportunity || 'Untitled'}</div>
              <div class="meta">Funder: ${r.Funder || 'N/A'}</div>
              <div class="meta">Amount: ${r.Amount || 'N/A'}</div>
              <div class="meta">Deadline: ${r.Deadline || 'N/A'}</div>
              ${r.Summary ? `<p>${r.Summary}</p>` : ''}
              ${r['Opportunity Link'] ? `<a href="${r['Opportunity Link']}" target="_blank">More Info</a>` : ''}
            </div>
          `).join('')}
        </body>
      </html>
    `;

    res.send(responseHtml);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).send(`<html><body><h1>Error</h1><p>${error.message}</p></body></html>`);
  }
});

app.listen(process.env.PORT || 3000);
export default app;
