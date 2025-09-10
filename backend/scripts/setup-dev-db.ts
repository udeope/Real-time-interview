import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

async function setupDevDatabase() {
  console.log('🚀 Setting up development database...');

  try {
    // Check if .env file exists
    const envPath = join(process.cwd(), '..', '.env');
    if (!existsSync(envPath)) {
      console.log('❌ .env file not found. Please create one based on .env.example');
      process.exit(1);
    }

    console.log('📋 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    console.log('🗄️  Pushing database schema...');
    try {
      execSync('npx prisma db push', { stdio: 'inherit' });
    } catch (error) {
      console.log('⚠️  Database push failed. This is expected if database is not running.');
      console.log('📝 To complete setup:');
      console.log('   1. Start your PostgreSQL database');
      console.log('   2. Update DATABASE_URL in .env file');
      console.log('   3. Run: npm run db:push');
      console.log('   4. Run: npm run db:seed');
      return;
    }

    console.log('🌱 Seeding database with sample data...');
    try {
      execSync('npm run db:seed', { stdio: 'inherit' });
    } catch (error) {
      console.log('⚠️  Seeding failed. You can run it manually later with: npm run db:seed');
    }

    console.log('✅ Development database setup completed!');
    console.log('🎉 You can now start the development server with: npm run dev');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupDevDatabase();