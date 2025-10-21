# GFAD - Funding Opportunities Search

A fuzzy search middleware that connects Jotform to Airtable, enabling users to search for research funding opportunities with intelligent matching.

## 🔍 Overview

This project provides a search interface for the "Funding Announcements" database at American University's Office of Research. Users can enter keywords through a Jotform, and the system performs fuzzy search on the Airtable database to return relevant funding opportunities.

**Live Demo:**
- **Search Form:** https://www.jotform.com/form/252758211486058
- **API Endpoint:** https://gfad.vercel.app

## 🏗️ Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Jotform   │ ──────► │   Vercel     │ ──────► │  Airtable   │
│  (Search)   │         │ (Middleware) │         │  (Database) │
└─────────────┘         └──────────────┘         └─────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ Search Results│
                        │   (HTML)      │
                        └──────────────┘
```

### Components:

1. **Jotform** - User-facing search form
2. **Vercel** - Hosts the Node.js middleware
3. **Airtable** - Database containing funding opportunities
4. **Fuse.js** - Fuzzy search library for intelligent matching

## 🚀 Features

- **Fuzzy Search** - Finds relevant results even with typos or partial matches
- **Real-time Results** - Instant search results displayed in a clean interface
- **Match Scoring** - Shows relevance percentage for each result
- **Secure Data Access** - Only exposes approved fields from Airtable
- **Mobile Responsive** - Works on all devices
- **Direct Links** - Each result links to the full opportunity details

## 📁 Project Structure

```
GFAD/
├── server.js           # Main application file
├── package.json        # Dependencies and scripts
├── vercel.json         # Vercel deployment configuration
├── .env.example        # Environment variables template
└── README.md          # This file
```

## 🛠️ Technology Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Search Engine:** Fuse.js
- **Database:** Airtable
- **Hosting:** Vercel
- **Form:** Jotform

## ⚙️ Environment Variables

The following environment variables must be set in Vercel:

| Variable | Description | Example |
|----------|-------------|---------|
| `AIRTABLE_API_KEY` | Airtable Personal Access Token | `patXXXXXXXXXXXX` |
| `AIRTABLE_BASE_ID` | Airtable Base ID | `appQknghmnGQf1IgO` |
| `AIRTABLE_TABLE_NAME` | Table name in Airtable | `FundingAnnouncements` |
| `AIRTABLE_VIEW_NAME` | (Optional) Specific view to query | `Public API View` |
| `ALLOWED_FIELDS` | (Optional) Comma-separated field whitelist | `Opportunity,Funder,Amount` |

### Getting Airtable Credentials:

1. **API Key:**
   - Go to https://airtable.com/create/tokens
   - Create new token with `data.records:read` scope
   - Add access to "Funding Announcements" base
   - Copy the token (starts with `pat...`)

2. **Base ID:**
   - Open your Airtable base
   - Look at the URL: `https://airtable.com/appXXXXXXXXXX/...`
   - The part starting with `app` is your Base ID

3. **Table Name:**
   - Must match exactly (including spaces and capitalization)
   - Example: `Funding Announcements` or `FundingAnnouncements`

## 📦 Installation

### Option 1: Deploy to Vercel (Recommended)

1. **Fork this repository**

2. **Import to Vercel:**
   - Go to https://vercel.com
   - Click "New Project" → Import from GitHub
   - Select the `GFAD` repository

3. **Add Environment Variables:**
   - In Vercel dashboard → Settings → Environment Variables
   - Add all variables listed above

4. **Deploy!**

### Option 2: Run Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SullenSchemer/GFAD.git
   cd GFAD
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Run the server:**
   ```bash
   npm start
   ```

5. **Test locally:**
   ```
   http://localhost:3000/health
   http://localhost:3000/search?query=research
   ```

## 🔗 API Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

### `GET /search`
Search for funding opportunities.

**Parameters:**
- `query` (required) - Search term
- `limit` (optional) - Number of results (default: 10)

**Example:**
```
https://gfad.vercel.app/search?query=stem&limit=5
```

**Response:**
Returns an HTML page with formatted search results.

### `POST /search`
Alternative POST endpoint for programmatic access.

**Body:**
```json
{
  "query": "research",
  "limit": 10
}
```

## 🎨 Customization

### Modify Search Behavior

Edit the Fuse.js configuration in `server.js`:

```javascript
const fuseOptions = {
  keys: Object.keys(items[0] || {}).filter(k => k !== 'id'),
  threshold: 0.4,  // Lower = stricter matching (0.0 - 1.0)
  includeScore: true,
  minMatchCharLength: 2
};
```

### Customize Results Page

Modify the HTML template in the `handleSearch` function:

```javascript
const responseHtml = `
  <!DOCTYPE html>
  <html>
    <!-- Customize the HTML here -->
  </html>
`;
```

### Change Styling

Edit the `<style>` section in the HTML template to match your branding.

## 🔒 Security Features

1. **Field Whitelisting** - Only approved fields are returned in results
2. **View-Based Access** - Can restrict to specific Airtable views
3. **Token Scoping** - Airtable token has minimal required permissions
4. **No Direct Database Access** - Users never interact with Airtable directly
5. **CORS Enabled** - Allows safe cross-origin requests

## 🐛 Troubleshooting

### "Cannot GET /search"
- Check that the GET endpoint is defined in `server.js`
- Verify deployment succeeded in Vercel dashboard

### "Airtable API error (403)"
- Verify `AIRTABLE_API_KEY` is correct
- Ensure token has access to the specific base
- Check token has `data.records:read` scope

### "NOT_FOUND" error
- Verify `AIRTABLE_BASE_ID` starts with `app`
- Check `AIRTABLE_TABLE_NAME` matches exactly (case-sensitive)
- Ensure table exists in the specified base

### No results returned
- Check that table has records
- Verify view (if specified) contains records
- Try searching with a broader term

### "[object Object]" in results
- Some Airtable fields (linked records, lookups) return objects
- Update `handleSearch` to handle these field types appropriately

## 📊 Monitoring

### View Logs

1. Go to Vercel dashboard
2. Navigate to your project → Logs
3. Monitor search queries and errors in real-time

### Key Metrics to Watch

- Search query frequency
- Common search terms
- Error rates
- Response times

## 🔄 Updating the Database

When you add/edit records in Airtable:
- Changes are reflected immediately (no caching)
- No need to redeploy the application
- New fields require updating `ALLOWED_FIELDS` if using field filtering

## 📝 Future Enhancements

Potential improvements:

- [ ] Add search history/analytics
- [ ] Implement result caching for faster responses
- [ ] Add filters (by funder type, amount range, deadline)
- [ ] Create admin dashboard for search analytics
- [ ] Add email notifications for new opportunities
- [ ] Implement saved searches/favorites
- [ ] Add export to CSV functionality
- [ ] Multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- **Sharon Wanyana** - Office of Research, American University
- **LinkedIn** - www.linkedin.com/in/sharonwanyana

## 🙏 Acknowledgments

- Built with guidance from Claude (Anthropic)
- Powered by Airtable, Vercel, and Jotform
- Fuzzy search by Fuse.js

## 📞 Support

For questions or issues:
1. Check the Troubleshooting section above
2. Review Vercel logs for error details
3. Open an issue on GitHub
4. Email: sw1026a@american.edu

## 🔗 Related Links

- **Airtable API Documentation:** https://airtable.com/developers/web/api/introduction
- **Vercel Documentation:** https://vercel.com/docs
- **Fuse.js Documentation:** https://fusejs.io/
- **Jotform API:** https://api.jotform.com/docs/

---

**Last Updated:** October 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
