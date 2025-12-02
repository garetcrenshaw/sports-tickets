#!/usr/bin/env node

/**
 * DIAGNOSTIC SCRIPT - RUN THIS FIRST
 *
 * This script will tell you EXACTLY what's wrong and how to fix it.
 * Run: node diagnose-everything.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNOSTIC MODE - LET\'S FIND OUT WHAT\'S WRONG\n');
console.log('='.repeat(60));

// Step 1: Check if we're in the right directory
console.log('1️⃣ CHECKING PROJECT DIRECTORY...');
const packageJson = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJson)) {
  console.log('❌ ERROR: Not in project directory! Run this from your sports-tickets folder.');
  process.exit(1);
}
console.log('✅ Found package.json - correct directory\n');

// Step 2: Check Vercel CLI
console.log('2️⃣ CHECKING VERCEL CLI...');
try {
  const vercelVersion = execSync('vercel --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Vercel CLI installed: ${vercelVersion}`);
} catch (error) {
  console.log('❌ VERCEL CLI NOT INSTALLED!');
  console.log('');
  console.log('🔧 FIX: Install Vercel CLI:');
  console.log('   npm install -g vercel');
  console.log('   OR: npm install -g @vercel/cli');
  console.log('');
  process.exit(1);
}

// Step 3: Check Vercel authentication
console.log('\n3️⃣ CHECKING VERCEL AUTHENTICATION...');
try {
  const whoami = execSync('vercel whoami', { encoding: 'utf8' }).trim();
  console.log(`✅ Logged in as: ${whoami}`);
} catch (error) {
  console.log('❌ NOT LOGGED INTO VERCEL!');
  console.log('');
  console.log('🔧 FIX: Login to Vercel:');
  console.log('   vercel login');
  console.log('');
  process.exit(1);
}

// Step 4: Check if project is linked
console.log('\n4️⃣ CHECKING PROJECT LINKING...');
const vercelConfig = path.join(process.cwd(), '.vercel');
if (!fs.existsSync(vercelConfig)) {
  console.log('❌ PROJECT NOT LINKED TO VERCEL!');
  console.log('');
  console.log('🔧 FIX: Link this project to Vercel:');
  console.log('   vercel link');
  console.log('   (Choose "sports-tickets" or create new project)');
  console.log('');
  process.exit(1);
}
console.log('✅ Project linked to Vercel');

// Step 5: Check environment variables
console.log('\n5️⃣ CHECKING ENVIRONMENT VARIABLES...');
const envLocal = path.join(process.cwd(), '.env.local');
const envFile = path.join(process.cwd(), '.env');

let envIssues = [];

if (!fs.existsSync(envLocal)) {
  envIssues.push('❌ .env.local file missing');
} else {
  const envContent = fs.readFileSync(envLocal, 'utf8');
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RESEND_API_KEY'
  ];

  requiredVars.forEach(varName => {
    if (!envContent.includes(`${varName}=`)) {
      envIssues.push(`❌ ${varName} missing from .env.local`);
    }
  });
}

if (envIssues.length > 0) {
  console.log('❌ ENVIRONMENT VARIABLE ISSUES:');
  envIssues.forEach(issue => console.log(`   ${issue}`));
  console.log('');
  console.log('🔧 FIX: Check your .env.local file and add missing variables');
  console.log('   Copy from env-local-template.txt if needed');
  console.log('');
  process.exit(1);
}
console.log('✅ Environment variables look good');

// Step 6: Check build configuration
console.log('\n6️⃣ CHECKING BUILD CONFIGURATION...');
const vercelJson = path.join(process.cwd(), 'vercel.json');
if (!fs.existsSync(vercelJson)) {
  console.log('❌ vercel.json missing!');
  console.log('');
  console.log('🔧 FIX: Create vercel.json with:');
  console.log(`{
  "builds": [
    { "src": "package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } },
    { "src": "api/**/*.js", "use": "@vercel/node" }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "headers": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      "dest": "/api/$1"
    },
    { "src": "/(.*)", "dest": "/$1" }
  ]
}`);
  process.exit(1);
}
console.log('✅ vercel.json exists');

// Step 7: Try to build locally
console.log('\n7️⃣ TESTING LOCAL BUILD...');
try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ Local build successful');
} catch (error) {
  console.log('❌ LOCAL BUILD FAILED!');
  console.log('   Error:', error.message);
  console.log('');
  console.log('🔧 FIX: Run "npm run build" manually to see detailed error');
  process.exit(1);
}

// Step 8: Check Vercel project status
console.log('\n8️⃣ CHECKING VERCEL PROJECT STATUS...');
try {
  const projectInfo = execSync('vercel project ls', { encoding: 'utf8' });
  if (projectInfo.includes('sports-tickets')) {
    console.log('✅ Vercel project "sports-tickets" found');
  } else {
    console.log('❌ "sports-tickets" project not found in Vercel');
    console.log('');
    console.log('🔧 FIX: Create project or link existing one:');
    console.log('   vercel link');
  }
} catch (error) {
  console.log('❌ CANNOT CHECK VERCEL PROJECTS');
  console.log('   Error:', error.message);
}

// FINAL STEP: Try deployment
console.log('\n9️⃣ ATTEMPTING DEPLOYMENT...');
console.log('');
console.log('🚀 DEPLOYMENT COMMAND:');
console.log('   vercel --prod');
console.log('');
console.log('If this fails, the error message will tell you exactly what to fix.');
console.log('');
console.log('='.repeat(60));
console.log('🎯 READY TO DEPLOY!');
console.log('Run: vercel --prod');
console.log('='.repeat(60));
