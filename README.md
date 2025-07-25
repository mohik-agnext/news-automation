# AgNext News Intelligence

A modern Next.js application for news aggregation, analysis, and intelligence gathering with real-time updates and advanced search capabilities.

## Features

- 📰 **News Aggregation**: Collect and display news articles from multiple sources
- 🔍 **Advanced Search**: Powerful search functionality with keyword filtering
- 📊 **Real-time Updates**: Live article updates using Server-Sent Events (SSE)
- 🔖 **Bookmarking**: Save and organize articles for later reading
- 🔗 **LinkedIn Integration**: Webhook integration for social media automation
- ⚡ **Performance Optimized**: Redis caching for improved performance
- 🗄️ **Database Integration**: Supabase for reliable data storage

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **Caching**: Redis
- **Deployment**: Vercel-ready

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Required: Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional: News API Configuration
NEWSAPI_KEY=your-newsapi-key

# Optional: LinkedIn Integration
LINKEDIN_WEBHOOK_URL=your-linkedin-webhook-url

# Optional: Redis Configuration
REDIS_URL=redis://localhost:6379
```

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy `env.example` to `.env.local` and fill in your values

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Deployment

### Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard based on your `.env.local` file
3. **Deploy**: Vercel will automatically detect Next.js and deploy

This project includes a `vercel.json` configuration file with optimized settings for:
- Server-Sent Events (SSE) endpoints
- Build commands
- Region configuration

### Manual Deployment

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm start
   ```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
├── app/                 # Next.js App Router
│   ├── api/            # API routes
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # React components
├── lib/               # Utility functions
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
└── public/            # Static assets
```
