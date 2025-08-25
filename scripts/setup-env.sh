#!/bin/bash

# Setup script for PeerAI MongoMigrator environment
# This script helps users set up their .env file

set -e

echo "🔧 Setting up PeerAI MongoMigrator environment..."

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled. Your existing .env file was not modified."
        exit 1
    fi
fi

# Copy template
if [ -f "env.template" ]; then
    cp env.template .env
    echo "✅ Created .env file from template"
else
    echo "❌ env.template not found. Please ensure you're in the project root directory."
    exit 1
fi

echo ""
echo "📝 Next steps:"
echo "1. Edit the .env file with your actual database credentials:"
echo "   nano .env"
echo ""
echo "2. Required variables to set:"
echo "   - POSTGRES_DB: Your PostgreSQL database name"
echo "   - POSTGRES_PASSWORD: Your PostgreSQL password"
echo "   - MONGO_CONNECTION_STRING: Your MongoDB connection string (include database name)"
echo "   - MONGO_DB: Your MongoDB database name"
echo ""
echo "3. Test your configuration:"
echo "   npm run dev"
echo ""
echo "🔐 Security reminder: Never commit .env files to version control!"
echo "✅ Setup complete!"
