import express from 'express';
import Fuse from 'fuse.js';

const app = express();
app.use(express.json());
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
    const { query, limit = 5 } = req.body;
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

    res.json({ success: true, query, count: output.length, results: output });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(process.env.PORT || 3000);
export default app;
