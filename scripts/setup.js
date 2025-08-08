#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setup() {
  console.log('🚀 Configuration de GreenDataHarvester v2.0.0\n');

  try {
    // Vérifier si .env existe
    const envPath = path.join(__dirname, '..', '.env');
    const envExamplePath = path.join(__dirname, '..', 'env.example');

    try {
      await fs.access(envPath);
      console.log('✅ Fichier .env déjà présent');
    } catch {
      console.log('📝 Création du fichier .env...');
      const envExample = await fs.readFile(envExamplePath, 'utf8');
      await fs.writeFile(envPath, envExample);
      console.log('✅ Fichier .env créé');
    }

    // Créer le dossier logs
    const logsPath = path.join(__dirname, '..', 'logs');
    try {
      await fs.access(logsPath);
      console.log('✅ Dossier logs déjà présent');
    } catch {
      console.log('📁 Création du dossier logs...');
      await fs.mkdir(logsPath, { recursive: true });
      console.log('✅ Dossier logs créé');
    }

    // Vérifier les dépendances
    console.log('\n📦 Vérification des dépendances...');
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    console.log(`✅ Node.js version: ${process.version}`);
    console.log(`✅ Package version: ${packageJson.version}`);

    // Instructions finales
    console.log('\n🎉 Configuration terminée !');
    console.log('\n📋 Prochaines étapes :');
    console.log('1. Éditer le fichier .env avec vos paramètres');
    console.log('2. Obtenir un token API INSEE sur https://api.insee.fr/');
    console.log('3. Démarrer MongoDB et Redis (optionnel)');
    console.log('4. Lancer l\'application : npm run dev');
    console.log('\n📚 Documentation :');
    console.log('- GraphQL Playground : http://localhost:5000/graphql');
    console.log('- API REST : http://localhost:5000/api/');
    console.log('- Santé : http://localhost:5000/health');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error.message);
    process.exit(1);
  }
}

// Vérifier les prérequis
async function checkPrerequisites() {
  console.log('🔍 Vérification des prérequis...\n');

  // Vérifier Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    console.error('❌ Node.js 18+ requis. Version actuelle:', nodeVersion);
    process.exit(1);
  }
  console.log(`✅ Node.js ${nodeVersion}`);

  // Vérifier npm
  try {
    const { execSync } = await import('child_process');
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`✅ npm ${npmVersion}`);
  } catch {
    console.log('⚠️  npm non détecté, mais ce n\'est pas bloquant');
  }

  console.log('');
}

// Script principal
async function main() {
  await checkPrerequisites();
  await setup();
}

main().catch(console.error);

