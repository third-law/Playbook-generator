# AI Visibility Tool

An automated AI search visibility analysis and action brief generator built with Next.js, TypeScript, and Claude AI.

## Features

- 🔐 Password-protected access
- 📊 AI visibility analysis with competitive insights
- 🤖 Claude AI-powered brief generation
- 📈 Effort/Impact scoring and prioritization
- 📝 Export comprehensive markdown reports
- 💾 Store and access previous analyses

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for local PostgreSQL)
- Anthropic API key (Claude)

## Local Development Setup

### 1. Clone and Install Dependencies

```bash
cd ai-visibility-tool
npm install
```

### 2. Set Up Environment Variables

Copy the `.env.local` file and update with your values:

```bash
# Generate a password hash (default: 'admin')
node scripts/setup.js yourpassword

# Update .env.local with:
# - ANTHROPIC_API_KEY (get from https://console.anthropic.com)
# - SHARED_PASSWORD_HASH (from the setup script output)
```

### 3. Start the Database

```bash
# Start PostgreSQL with Docker
docker-compose up -d

# Verify it's running
docker ps

# The database will be available at localhost:5432
# Database name: ai_visibility
# Username: postgres
# Password: postgres
```

### 4. Run Database Migrations

The database schema will be automatically created when the container starts from the SQL file in `/sql/001_init.sql`.

To verify:
```bash
# Connect to database
docker exec -it ai-visibility-postgres psql -U postgres -d ai_visibility

# List tables
\dt

# Exit
\q
```

### 5. Add Knowledge Base Files

Create the knowledge base directory and add your MD files:

```bash
mkdir -p public/knowledge-base

# Add these files (you'll need to provide the content):
# - Technology.md
# - Platform_Presence.md
# - Content_Structure.md
# - Content_Types.md
# - Reviews_and_Testimonials.md
# - PR_Outreach_and_LLM_Seeding.md
# - Social_Engagement_and_Community_Strategy.md
# - Multimodal_and_Visual_Optimization.md
# - Data_Authority_and_Proprietary_Statistics.md
# - References.md
# - combined_all_articles.md
```

### 6. Start the Development Server

```bash
npm run dev
```

Visit http://localhost:3000 and login with your password.

## Project Structure

```
ai-visibility-tool/
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   ├── dashboard/            # Dashboard page
│   ├── analyze/              # Analysis pages
│   └── page.tsx              # Login page
├── lib/                      # Utility libraries
│   ├── auth/                 # Authentication
│   ├── db/                   # Database
│   ├── ai/                   # Claude AI integration
│   └── ...
├── types/                    # TypeScript types
├── public/
│   └── knowledge-base/       # MD knowledge files
├── sql/                      # Database migrations
└── docker-compose.yml        # Local PostgreSQL setup
```

## Usage

1. **Login**: Enter the shared password
2. **Dashboard**: View previous analyses or create new
3. **Create Analysis**:
   - Enter customer and visibility data
   - Upload technical analysis
   - Customize the competitive analysis prompt
   - Select categories and brief count
4. **Review Results**: Sort, filter, and select top 15 briefs
5. **Export**: Download markdown report

## Development Commands

```bash
# Start database
docker-compose up -d

# Stop database
docker-compose down

# View database logs
docker-compose logs postgres

# Generate password hash
node scripts/setup.js yourpassword

# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Database Management

```bash
# Connect to database
docker exec -it ai-visibility-postgres psql -U postgres -d ai_visibility

# Backup database
docker exec ai-visibility-postgres pg_dump -U postgres ai_visibility > backup.sql

# Restore database
docker exec -i ai-visibility-postgres psql -U postgres ai_visibility < backup.sql
```

## Deployment to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables in Vercel dashboard:
   - `ANTHROPIC_API_KEY`
   - `SHARED_PASSWORD_HASH`
   - `SESSION_SECRET`
   - Database credentials (Vercel Postgres)
4. Deploy

## Troubleshooting

### Database Connection Issues
- Ensure Docker is running: `docker ps`
- Check logs: `docker-compose logs postgres`
- Verify connection string in `.env.local`

### Authentication Issues
- Regenerate password hash: `node scripts/setup.js`
- Clear cookies in browser
- Check `SESSION_SECRET` is set

### API Issues
- Verify `ANTHROPIC_API_KEY` is valid
- Check API rate limits
- Review logs: `npm run dev` shows server logs

## Security Notes

- Never commit `.env.local` to version control
- Use strong passwords in production
- Rotate `SESSION_SECRET` regularly
- Keep Anthropic API key secure
- Use HTTPS in production

## License

Private - All rights reserved
