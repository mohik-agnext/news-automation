# 🚀 Deployment Guide - Vercel

This guide will help you deploy the AgNext News Intelligence platform to Vercel.

## Prerequisites

- GitHub account with repository access
- Vercel account (free tier works)
- Supabase project set up
- Environment variables ready

## 📋 Pre-Deployment Checklist

### 1. Supabase Configuration

Ensure your Supabase project has:
- ✅ Database schema applied (from `supabase_schema.sql`)
- ✅ Row Level Security (RLS) enabled
- ✅ Demo user created (`demo@agnext.com`)
- ✅ API keys available

### 2. Environment Variables

Prepare these environment variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Optional variables:
```bash
NEWSAPI_KEY=your_newsapi_key
LINKEDIN_WEBHOOK_URL=your_n8n_webhook_url
```

## 🔧 Vercel Deployment Steps

### Step 1: Connect Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import from GitHub: `Mohikkler/news_intelligence`
4. Click "Import"

### Step 2: Configure Project Settings

In the Vercel import screen:

**Framework Preset**: Next.js
**Root Directory**: `./` (default)
**Build Settings**: 
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### Step 3: Add Environment Variables

In the Vercel deployment configuration:

1. Click "Environment Variables"
2. Add each variable:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Production |

Optional variables:
| Name | Value | Environment |
|------|-------|-------------|
| `NEWSAPI_KEY` | Your NewsAPI key | Production |
| `LINKEDIN_WEBHOOK_URL` | Your n8n webhook URL | Production |

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Visit your deployed URL

## 🔍 Post-Deployment Verification

### Test Core Functionality

1. **Authentication Test**
   - Visit your deployed URL
   - Login with demo account: `demo@agnext.com` / `demo123`
   - Verify login works

2. **Search Test**
   - Enter keywords: "food safety", "agriculture"
   - Verify search results appear
   - Check article cards display properly

3. **Bookmark Test**
   - Bookmark an article
   - Switch to "My Bookmarks" view
   - Verify bookmarks persist

4. **LinkedIn Content Test**
   - Open a bookmarked article's LinkedIn modal
   - Verify content generates or displays

### Database Connection Test

Check Vercel Function logs:
1. Go to Vercel Dashboard → Your Project → Functions
2. Check API route logs for database connections
3. Look for successful Supabase operations

## 🛠 Troubleshooting

### Common Issues

#### 1. Build Errors
**Problem**: TypeScript or build errors
**Solution**: 
```bash
# Fix locally first
npm run build
npm run type-check
```

#### 2. Environment Variables Not Working
**Problem**: `NEXT_PUBLIC_` variables not accessible
**Solution**:
- Ensure variables start with `NEXT_PUBLIC_`
- Redeploy after adding variables
- Check Vercel Environment Variables tab

#### 3. Supabase Connection Issues
**Problem**: Database operations failing
**Solution**:
- Verify Supabase URL and keys
- Check RLS policies are correct
- Test connection in Supabase dashboard

#### 4. Authentication Errors
**Problem**: Login not working
**Solution**:
- Verify demo user exists in Supabase Auth
- Check auth configuration
- Review browser console for errors

### Debug Commands

Check deployment status:
```bash
npx vercel ls
npx vercel logs your-project-url
```

## 🚀 Production Optimizations

### Performance Settings

1. **Enable Edge Functions** (if using)
2. **Configure Caching**:
   - Static assets: 1 year
   - API routes: Appropriate cache headers
3. **Image Optimization**: Next.js handles automatically

### Security Headers

Add to `next.config.js`:
```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};
```

### Monitoring

Set up monitoring:
1. **Vercel Analytics**: Enable in project settings
2. **Error Tracking**: Monitor function logs
3. **Performance**: Use Vercel Speed Insights

## 🔄 Continuous Deployment

### Automatic Deployments

Vercel automatically deploys when you:
- Push to `main` branch → Production deployment
- Push to other branches → Preview deployments

### Manual Deployment

Force redeploy:
```bash
npx vercel --prod
```

## 📊 Environment Management

### Multiple Environments

Create separate Supabase projects for:
- **Development**: Local development
- **Staging**: Preview deployments  
- **Production**: Main deployment

Configure different environment variables for each.

## ✅ Launch Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Database schema applied
- [ ] Demo account working
- [ ] Core features tested
- [ ] Error pages working
- [ ] Mobile responsiveness checked
- [ ] Performance optimized
- [ ] Security headers added
- [ ] Monitoring enabled
- [ ] Domain configured (if custom)

## 🌐 Custom Domain (Optional)

1. Go to Vercel Project → Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Wait for SSL certificate generation

## 📞 Support

If you encounter issues:

1. Check Vercel documentation
2. Review function logs in Vercel dashboard
3. Test locally with production environment variables
4. Check Supabase dashboard for database issues

## 🎉 Success!

Once deployed successfully, your AgNext News Intelligence platform will be available at:
- Vercel URL: `https://your-project.vercel.app`
- Custom domain: `https://your-domain.com` (if configured)

Share the demo credentials with users:
- Email: `demo@agnext.com`
- Password: `demo123` 