# 🌐 Connect Vercel Frontend to Choreo Backend

## 🎯 Overview

Your frontend is deployed on Vercel and needs to connect to your Choreo backend API. Here's how to configure the connection.

## 🔧 Current Configuration

Your frontend is already configured to use environment variables for the API base URL:

```typescript
const DEFAULT_BASE_URL = 'http://localhost:9090/health'
const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || DEFAULT_BASE_URL
```

## 🚀 Steps to Connect

### Step 1: Get Your Choreo Backend URL

1. **Deploy your backend to Choreo** (if not already done)
2. **Get the Choreo URL** from your Choreo console
   - Format: `https://your-component-name-your-org.choreoapps.dev`
   - Example: `https://health-records-api-yourorg.choreoapps.dev`

### Step 2: Set Environment Variables in Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project** (babaf)
3. **Go to Settings** → **Environment Variables**
4. **Add the following variable**:

```bash
Name: VITE_API_BASE_URL
Value: https://your-choreo-backend-url/health
Environment: Production, Preview, Development
```

**Example:**
```bash
Name: VITE_API_BASE_URL
Value: https://health-records-api-yourorg.choreoapps.dev/health
Environment: Production, Preview, Development
```

### Step 3: Redeploy Your Frontend

1. **Trigger a new deployment** in Vercel
2. **Or push changes** to your Git repository to auto-deploy

## 🧪 Test the Connection

### Test API Endpoints

Once deployed, test these endpoints from your Vercel frontend:

```bash
# Health check
curl https://your-choreo-backend-url/health

# Test with your frontend
# The frontend will automatically use the new API URL
```

### Test from Browser Console

Open your Vercel frontend and test in browser console:

```javascript
// Test API connection
fetch('https://your-choreo-backend-url/health')
  .then(response => response.json())
  .then(data => console.log('API Response:', data))
  .catch(error => console.error('API Error:', error))
```

## 🔍 Troubleshooting

### CORS Issues

If you get CORS errors, ensure your Choreo backend allows requests from your Vercel domain:

1. **Add CORS headers** to your Choreo backend
2. **Allow your Vercel domain** in the CORS configuration

### Environment Variable Issues

1. **Check Vercel Environment Variables**:
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Ensure `VITE_API_BASE_URL` is set correctly
   - Ensure it's enabled for all environments

2. **Verify Variable Name**:
   - Must start with `VITE_` for Vite to expose it to the frontend
   - Case sensitive: `VITE_API_BASE_URL`

### Network Issues

1. **Check Choreo Backend Status**:
   - Ensure your Choreo backend is running
   - Test the health endpoint directly

2. **Check URLs**:
   - Ensure the Choreo URL is correct
   - Ensure `/health` is appended to the base URL

## 📱 Frontend Services Affected

The following services will automatically use the new Choreo backend:

- ✅ **Authentication** (`authService.ts`)
- ✅ **User Profile** (`profileService.ts`)
- ✅ **BMI Records** (`bmiService.ts`)
- ✅ **Vaccines** (`vaccineService.ts`)
- ✅ **Doctor Appointments** (`doctorAppointmentsService.ts`)
- ✅ **Diseases** (`diseaseService.ts`)
- ✅ **Special Notes** (`specialNotesService.ts`)
- ✅ **Appointments** (`appointmentsService.ts`)

## 🔒 Security Considerations

1. **HTTPS Only**: Ensure your Choreo backend uses HTTPS
2. **CORS Configuration**: Configure CORS properly in your backend
3. **Environment Variables**: Keep API URLs in environment variables, not in code

## 📊 Monitoring

### Vercel Monitoring
- **Deployment Logs**: Check Vercel deployment logs for build issues
- **Function Logs**: Monitor serverless function logs if any
- **Performance**: Monitor frontend performance metrics

### Choreo Monitoring
- **API Logs**: Check Choreo console for API request logs
- **Error Tracking**: Monitor for API errors and 500 responses
- **Performance**: Track API response times

## 🚀 Quick Setup Commands

### For Local Development
```bash
# Create .env.local file
echo "VITE_API_BASE_URL=http://localhost:9090/health" > frontend/babaf/.env.local

# Start local development
cd frontend/babaf
npm run dev
```

### For Production
```bash
# Set Vercel environment variable (via dashboard)
VITE_API_BASE_URL=https://your-choreo-backend-url/health

# Deploy to Vercel
vercel --prod
```

## ✅ Success Checklist

- [ ] Choreo backend deployed and running
- [ ] Vercel environment variable `VITE_API_BASE_URL` set
- [ ] Frontend redeployed with new environment variable
- [ ] API endpoints responding correctly
- [ ] No CORS errors in browser console
- [ ] All frontend features working with Choreo backend

---

## 🎉 Ready to Connect!

Your frontend is already configured to use environment variables. Just set the `VITE_API_BASE_URL` in Vercel and redeploy!

**Next Step**: Deploy your backend to Choreo and set the environment variable in Vercel! 🚀
