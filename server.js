import express from 'express';
import Fuse from 'fuse.js';

const app = express();
app.use(express.json());

// Airtable configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;
const AIRTABLE_VIEW_NAME = process.env.AIRTABLE_VIEW_NAME;
const ALLOWED_FIELDS = process.env.ALLOWED_FIELDS?.split(',') || null;

// CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Fetch records from Airtable
async function fetchAirtableRecords() {
  let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;
  
  const params = new URLSearchParams();
  if (AIRTABLE_VIEW_NAME) {
    params.append('view', AIRTABLE_VIEW_NAME);
  }
  
  if (ALLOWED_FIELDS && ALLOWED_FIELDS.length > 0) {
    ALLOWED_FIELDS.forEach(field => {
      params.append('fields[]', field.trim());
    });
  }
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Airtable API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.records;
}

// Filter fields
function filterFields(record) {
  if (!ALLOWED_FIELDS || ALLOWED_FIELDS.length === 0) {
    return record;
  }
  
  const filtered = { id: record.id };
  ALLOWED_FIELDS.forEach(field => {
    const trimmedField = field.trim();
    if (record[trimmedField] !== undefined) {
      filtered[trimmedField]
