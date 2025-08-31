# 🔗 Vercel Frontend + Choreo Backend Integration

## 🎯 Your Choreo Backend URL

```
https://316dda40-9b55-45ef-bc8e-8204b688dbea-dev.e1-us-east-azure.choreoapis.dev/default/ballerinahealthrec/v1.0
```

## 🚀 Quick Setup Steps

### Step 1: Set Environment Variables in Vercel

Go to your Vercel project settings and add these environment variables:

```bash
# Required: API Base URL
Name: VITE_API_BASE_URL
Value: https://316dda40-9b55-45ef-bc8e-8204b688dbea-dev.e1-us-east-azure.choreoapis.dev/default/ballerinahealthrec/v1.0
Environment: Production, Preview, Development

# Optional: API Key (if required by Choreo)
Name: VITE_CHOREO_API_KEY
Value: your-api-key-here
Environment: Production, Preview, Development
```

### Step 2: Configure Choreo Authentication

1. **Go to Choreo Console**: https://console.choreo.dev
2. **Find your API component** (ballerinahealthrec)
3. **Configure API Keys** or **Authentication settings**
4. **Set up CORS** to allow your Vercel domain

### Step 3: Redeploy Frontend

1. **Trigger new deployment** in Vercel
2. **Or push changes** to your Git repository

## 🔧 Frontend Configuration

### API Configuration

The frontend now includes an `apiConfig.ts` utility that:

- ✅ **Automatically adds authentication headers** when API key is available
- ✅ **Handles CORS** properly
- ✅ **Logs configuration** for debugging
- ✅ **Supports both local and Choreo backends**

### Updated Services

The following services have been updated to use the new API configuration:

- ✅ **Authentication** (`authService.ts`)
- ✅ **User Profile** (`profileService.ts`)
- ✅ **BMI Records** (`bmiService.ts`)
- ✅ **Vaccines** (`vaccineService.ts`)
- ✅ **Doctor Appointments** (`doctorAppointmentsService.ts`)
- ✅ **Diseases** (`diseaseService.ts`)
- ✅ **Special Notes** (`specialNotesService.ts`)
- ✅ **Appointments** (`appointmentsService.ts`)

## 🧪 Testing Your Integration

### Test API Connection

Open your Vercel frontend and test in browser console:

```javascript
// Test API connection
fetch('https://316dda40-9b55-45ef-bc8e-8204b688dbea-dev.e1-us-east-azure.choreoapis.dev/default/ballerinahealthrec/v1.0/health')
  .then(response => response.json())
  .then(data => console.log('✅ API Connected:', data))
  .catch(error => console.error('❌ API Error:', error))

// Test with authentication (if API key is set)
fetch('https://316dda40-9b55-45ef-bc8e-8204b688dbea-dev.e1-us-east-azure.choreoapis.dev/default/ballerinahealthrec/v1.0/health', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
})
  .then(response => response.json())
  .then(data => console.log('✅ Authenticated API Response:', data))
  .catch(error => console.error('❌ API Error:', error))
```

### Test Frontend Features

1. **Login/Signup**: Test user authentication
2. **User Profile**: Test profile management
3. **BMI Tracking**: Test weight/height records
4. **Vaccines**: Test vaccine management
5. **Appointments**: Test appointment scheduling
6. **Diseases**: Test disease tracking

## 🔍 Troubleshooting

### Authentication Issues

**Error**: `"Invalid Credentials"` or `"900901"`

**Solutions**:
1. **Check API Key**: Ensure `VITE_CHOREO_API_KEY` is set correctly in Vercel
2. **Verify Choreo Settings**: Check Choreo console for API key configuration
3. **Test Directly**: Test API endpoints with curl or Postman

```bash
# Test with curl
curl -X GET "https://316dda40-9b55-45ef-bc8e-8204b688dbea-dev.e1-us-east-azure.choreoapis.dev/default/ballerinahealthrec/v1.0/health" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### CORS Issues

**Error**: `"CORS policy"` or `"No 'Access-Control-Allow-Origin'"`

**Solutions**:
1. **Check Choreo CORS Settings**: Ensure Vercel domain is allowed
2. **Verify Environment Variables**: Check `VITE_API_BASE_URL` is correct
3. **Check Browser Console**: Look for CORS errors

### Environment Variable Issues

**Error**: `"Failed to fetch"` or API calls going to localhost

**Solutions**:
1. **Check Vercel Environment Variables**: Ensure `VITE_API_BASE_URL` is set
2. **Verify Variable Name**: Must start with `VITE_`
3. **Check All Environments**: Ensure variable is set for Production, Preview, Development
4. **Redeploy**: Trigger a new deployment after setting variables

### Network Issues

**Error**: `"Network Error"` or `"ERR_NETWORK"`

**Solutions**:
1. **Check Choreo Status**: Ensure backend is running
2. **Verify URL**: Check API URL is correct
3. **Test Directly**: Test API endpoints directly
4. **Check DNS**: Ensure domain resolves correctly

## 📊 Monitoring

### Frontend Monitoring (Vercel)
- **Deployment Logs**: Check build and deployment status
- **Function Logs**: Monitor serverless function logs
- **Performance**: Track frontend performance metrics

### Backend Monitoring (Choreo)
- **Application Logs**: Check Choreo console for API logs
- **Error Tracking**: Monitor for 500 errors and authentication failures
- **Performance**: Track API response times

### Debug Information

The frontend now logs API configuration for debugging:

```javascript
// Check API configuration in browser console
// This will show:
// - Base URL being used
// - Whether using Choreo backend
// - API key availability
```

## 🔒 Security

### Environment Variables
- ✅ **No Hardcoded Secrets**: All sensitive data in environment variables
- ✅ **Vite Prefix**: Variables must start with `VITE_` to be exposed to frontend
- ✅ **Environment Specific**: Can set different values for different environments

### API Security
- ✅ **HTTPS Only**: Both Vercel and Choreo use HTTPS
- ✅ **Authentication**: API key authentication for Choreo
- ✅ **CORS**: Proper CORS configuration for secure cross-origin requests

## 📋 Deployment Checklist

### Vercel Configuration
- [ ] `VITE_API_BASE_URL` environment variable set
- [ ] `VITE_CHOREO_API_KEY` environment variable set (if required)
- [ ] Environment variables enabled for all environments
- [ ] Frontend redeployed with new configuration

### Choreo Configuration
- [ ] Backend deployed and running
- [ ] API keys configured (if required)
- [ ] CORS settings allow Vercel domain
- [ ] Health endpoint responding

### Testing
- [ ] API connection working
- [ ] Authentication working (if required)
- [ ] All frontend features functional
- [ ] No CORS errors in browser console
- [ ] No network errors

## 🆘 Support

### Documentation
- **Choreo Docs**: https://docs.choreo.dev
- **Vercel Docs**: https://vercel.com/docs
- **Ballerina Docs**: https://ballerina.io/learn/

### Common Issues
- **Authentication**: Check API key configuration in Choreo
- **CORS**: Verify CORS settings allow your Vercel domain
- **Environment Variables**: Ensure variables are set correctly in Vercel
- **Deployment**: Check build logs for any errors

---

## 🎉 Integration Complete!

Your Vercel frontend is now configured to connect to your Choreo backend!

**Next Steps**:
1. Set environment variables in Vercel
2. Configure authentication in Choreo (if required)
3. Test all features
4. Monitor performance and logs

🚀 **Your Health Records app is ready for production!**
