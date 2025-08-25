# URL Shortener

A simple URL shortener built with Node.js and Express that allows you to create short URLs for long links.

## Features

- ✨ Clean, responsive web interface
- 🔗 Generate short URLs from long URLs
- 🚀 Instant redirection to original URLs
- 📋 Copy-to-clipboard functionality
- ✅ URL validation
- 🔄 Duplicate URL detection (returns existing short code)
- 📱 Mobile-friendly design

## Installation

1. Clone the repository:
```bash
git clone https://github.com/XF2525/Url-shortener.git
cd Url-shortener
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and go to `http://localhost:3000`

## Usage

### Web Interface
1. Open `http://localhost:3000` in your browser
2. Enter a long URL in the input field
3. Click "Shorten URL"
4. Copy the generated short URL
5. Use the short URL to redirect to the original URL

### API Endpoints

#### POST /shorten
Create a short URL from a long URL.

**Request:**
```json
{
  "originalUrl": "https://www.example.com"
}
```

**Response:**
```json
{
  "shortCode": "abc123",
  "originalUrl": "https://www.example.com"
}
```

#### GET /:shortCode
Redirect to the original URL using the short code.

**Example:** `http://localhost:3000/abc123` → redirects to `https://www.example.com`

#### GET /api/urls
Get all stored URL mappings (for debugging purposes).

## Technical Details

- **Framework:** Express.js
- **Storage:** In-memory (URLs are lost when server restarts)
- **Short Code Generation:** Random 6-character alphanumeric strings
- **Port:** 3000 (configurable via PORT environment variable)

## Example

```bash
# Create a short URL
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://www.google.com"}'

# Response: {"shortCode":"sH5sgc","originalUrl":"https://www.google.com"}

# Use the short URL
curl -I http://localhost:3000/sH5sgc
# Redirects to https://www.google.com
```

## Development

To run in development mode:
```bash
npm run dev
```

## License

ISC