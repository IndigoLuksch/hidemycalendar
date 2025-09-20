# Hidemycalendar

Visit [hidemycalendar.com](https://hidemycalendar.com)

Anonymises event details from calendar subscription links

Mostly vibe coded

### How it works

1. User inputs original URL 
2. Cloudflare worker receives this URL and encrypts it (using an encryption key stored in the Cloudflare Secrets Store). Original URL is not stored
3. New, private link of format `/?url=<encrypted_url>` returned
4. When a calendar application uses this private link, the worker decrypts the link, fetches the original feed, and returns the anonymised event data. Again, the original URL and event details are not stored
