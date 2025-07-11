# AgNext News Intelligence Platform

A modern news intelligence platform built with Next.js 15, React 18, and TypeScript, featuring AI-powered news analysis, smart bookmarking, and LinkedIn content generation.

## 🚀 Features

- **🔍 Smart Search**: AI-powered news search with keyword expansion and relevance scoring
- **📚 Bookmark System**: Persistent bookmarking with user authentication
- **🎯 AgNext Relevance**: Specialized scoring for agriculture technology news
- **💼 LinkedIn Integration**: Automatic LinkedIn post generation for bookmarked articles
- **⚡ Real-time Updates**: Live notifications for new articles
- **🎨 Modern UI**: Beautiful, responsive design with glassmorphism effects
- **🔐 Authentication**: Secure user authentication with Supabase
- **📊 Analytics**: Engagement scoring and article metrics

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS with custom animations
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- NewsAPI key (optional, for news sources)

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/Mohikkler/news_intelligence.git
cd news_intelligence
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: News API Configuration
NEWSAPI_KEY=your_newsapi_key

# Optional: Webhook URLs for n8n integration
LINKEDIN_WEBHOOK_URL=http://localhost:5678/webhook/linkedin
```

### 4. Database Setup
Run the SQL schema in your Supabase SQL Editor:
```sql
-- See supabase_schema.sql for complete schema
```

### 5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔐 Authentication

The platform uses Supabase Auth with email/password authentication:

**Demo Account:**
- Email: `demo@agnext.com`
- Password: `demo123`

## 📱 Usage

1. **Login**: Use the demo account or create a new account
2. **Search**: Enter agriculture/food technology keywords
3. **Bookmark**: Save interesting articles for later
4. **LinkedIn Content**: Generate professional LinkedIn posts from bookmarked articles
5. **Sort & Filter**: Organize articles by relevance, date, or engagement score

## 🎯 AgNext Relevance Scoring

Articles are automatically scored based on:
- Agriculture technology keywords
- Food quality and safety terms
- Industry relevance
- Content quality metrics
- Recency and source reliability

## 🔧 Configuration

### Supabase Setup
1. Create a new Supabase project
2. Run the provided SQL schema
3. Configure Row Level Security (RLS)
4. Add environment variables

### Optional: n8n Integration
For LinkedIn content generation and advanced workflows:
1. Set up n8n instance
2. Import provided workflow
3. Configure webhook endpoints

## 📦 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
```bash
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
```

## 🏗 Architecture

```
AgNext News Intelligence
├── Frontend (Next.js + React)
│   ├── Search Interface
│   ├── Article Grid
│   ├── Bookmark Management
│   └── LinkedIn Content Modal
├── Backend (Next.js API Routes)
│   ├── Authentication
│   ├── Bookmark Management
│   ├── Article Processing
│   └── LinkedIn Content Generation
├── Database (Supabase)
│   ├── User Sessions
│   ├── Bookmarks
│   └── LinkedIn Content
└── External Integrations
    ├── News APIs
    ├── n8n Workflows
    └── AI Processing
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙋‍♂️ Support

For questions and support:
- Create an issue on GitHub
- Check the documentation
- Review the deployment guide

## 🔮 Roadmap

- [ ] Mobile app development
- [ ] Advanced AI analytics
- [ ] Multi-language support
- [ ] Enterprise features
- [ ] API access for third parties

---

Built with ❤️ for the agriculture technology community 