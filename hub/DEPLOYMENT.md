# SMART Connect Hub - Deployment Guide

## Deploy to Vercel (Recommended)

Vercel is the recommended platform for deploying Next.js applications. It offers excellent performance, automatic deployments, and a generous free tier.

### Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. GitHub repository access
3. OpenAI API key (get from https://platform.openai.com/api-keys)

### Deployment Steps

#### Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/new
   - Sign in with GitHub

2. **Import Repository**
   - Click "Import Project"
   - Select your GitHub repository: `Acurioustractor/SMART-Connect`
   - Vercel will automatically detect the Next.js project in the `hub/` directory

3. **Configure Project**
   - **Root Directory**: Set to `hub`
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (auto-configured)
   - **Output Directory**: `.next` (auto-configured)

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add the following:
     ```
     OPENAI_API_KEY=sk-...your-key-here
     ```
   - Make sure to apply to Production, Preview, and Development environments

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for the build to complete
   - Your app will be live at: `https://your-project.vercel.app`

#### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Navigate to Hub Directory**
   ```bash
   cd hub
   ```

4. **Deploy**
   ```bash
   vercel
   ```

   Follow the prompts:
   - Set up and deploy: Yes
   - Which scope: Select your account
   - Link to existing project: No (first time)
   - Project name: smart-connect-hub
   - Directory: `./` (you're already in hub/)
   - Override settings: No

5. **Add Environment Variables**
   ```bash
   vercel env add OPENAI_API_KEY
   ```

   Then paste your OpenAI API key and select all environments.

6. **Redeploy**
   ```bash
   vercel --prod
   ```

### Post-Deployment

#### 1. Verify Deployment

Visit your deployed URL and check:
- ✅ Homepage loads correctly
- ✅ Navigation works (Chat, Tools)
- ✅ Chat page loads
- ✅ Tools page loads

#### 2. Test AI Chat

1. Go to the Chat page
2. Try one of the example prompts:
   - "What did facilitators say about burnout?"
   - "Generate a discussion post about cultural safety"
3. Verify the AI responds with research-grounded content

#### 3. Set Custom Domain (Optional)

1. In Vercel Dashboard, go to Project Settings > Domains
2. Add your custom domain (e.g., `hub.smartrecovery.org.au`)
3. Follow DNS configuration instructions
4. Wait for SSL certificate to provision (automatic)

### Continuous Deployment

Vercel automatically deploys:
- **Production**: When you push to `main` branch
- **Preview**: For every pull request and branch push

To trigger a new deployment:
```bash
git add .
git commit -m "Update feature"
git push
```

Vercel will automatically build and deploy within 2-3 minutes.

### Monitoring and Logs

#### View Deployment Logs
1. Go to Vercel Dashboard
2. Select your project
3. Click on a deployment
4. View build logs and runtime logs

#### Monitor Performance
- Vercel automatically tracks Core Web Vitals
- View analytics in Vercel Dashboard > Analytics

#### Check Function Logs
- Go to Vercel Dashboard > Functions
- View logs for API routes (e.g., `/api/chat`)

### Troubleshooting

#### Build Fails

**Error**: "Module not found"
- **Solution**: Make sure all dependencies are in `package.json`
- Run `npm install` locally to verify

**Error**: "Environment variable not found"
- **Solution**: Add environment variables in Vercel Dashboard
- Make sure to redeploy after adding variables

#### API Routes Not Working

**Error**: "500 Internal Server Error"
- **Solution**: Check Vercel Function logs
- Verify `OPENAI_API_KEY` is set correctly
- Ensure API key has credits

**Error**: "OpenAI API key not configured"
- **Solution**: Add `OPENAI_API_KEY` to Vercel environment variables
- Redeploy the project

#### Chat Not Responding

**Issue**: Chat interface loads but no response
- **Check**: Browser console for errors
- **Check**: Vercel Function logs for API errors
- **Verify**: OpenAI API key is valid and has credits
- **Test**: Make a direct API call to `/api/chat` endpoint

### Rollback

If something goes wrong, you can instantly rollback:

1. Go to Vercel Dashboard > Deployments
2. Find a previous working deployment
3. Click "..." menu > "Promote to Production"

### Cost Estimates

#### Free Tier (Hobby)
- **Bandwidth**: 100 GB/month
- **Function Executions**: 100 GB-hours
- **Build Time**: 6,000 minutes/month
- **Suitable for**: MVP, team testing

#### Pro Tier ($20/month)
- **Bandwidth**: 1 TB/month
- **Function Executions**: 1,000 GB-hours
- **Build Time**: Unlimited
- **Suitable for**: Production with moderate traffic

Plus OpenAI API costs:
- **MVP**: ~$50-100/month (team usage)
- **Production**: ~$200-500/month (higher usage)

### Security Best Practices

1. **Never commit `.env.local`** (already in `.gitignore`)
2. **Rotate API keys** if they're exposed
3. **Use environment variables** for all secrets
4. **Enable Vercel Authentication** (optional) for internal tools
5. **Monitor API usage** in OpenAI dashboard to prevent abuse

### Alternative Deployment Options

If you prefer not to use Vercel:

#### Netlify
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

#### Railway
```bash
npm install -g railway
railway login
railway deploy
```

#### Docker + Cloud Run
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

---

## Next Steps

After deployment:

1. ✅ Share the URL with your team
2. ✅ Test AI chat functionality
3. ✅ Generate first content with AI
4. ✅ Set up co-design testing with facilitators
5. ✅ Import knowledge base content to wiki (Phase 2)
6. ✅ Add more AI tools (Phase 2)

For questions, see:
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- Hub README.md for local development
