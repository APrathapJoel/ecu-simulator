# Authentication Test Checklist

## Before Testing
1. Set MONGODB_URI environment variable in Render dashboard
2. Ensure NODE_ENV=production is set
3. Deploy the updated code

## Test Cases

### 1. Registration Test
```bash
curl -X POST https://your-app.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```
Expected: `{"message":"Registration successful. You may now log in."}`

### 2. Login Test
```bash
curl -X POST https://your-app.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt
```
Expected: User object with session cookie set

### 3. Auth Check Test
```bash
curl -X GET https://your-app.onrender.com/api/auth/me \
  -b cookies.txt
```
Expected: User object

### 4. Logout Test
```bash
curl -X POST https://your-app.onrender.com/api/auth/logout \
  -b cookies.txt
```
Expected: `{"status":"success"}`

## Error Cases to Verify

### Missing MONGODB_URI
- Should return 503 with DB_UNAVAILABLE code
- Server should exit on startup in production

### Invalid Credentials
- Should return 401 error

### Missing Session
- Should return 401 error

## Production vs Development
- Production: Requires database, exits on failure
- Development: Falls back to in-memory storage
