#!/usr/bin/env ts-node

/**
 * Script to generate TypeScript clients from OpenAPI specifications
 * This generates clients for all backend services until npm packages are available
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface ServiceConfig {
  name: string;
  openApiUrl: string;
  outputDir: string;
}

const services: ServiceConfig[] = [
  {
    name: 'tenant-management',
    openApiUrl: `${process.env.API_GATEWAY_URL}/swagger/TenantManagement/swagger.json`,
    outputDir: 'lib/clients/tenant-management'
  },
  {
    name: 'client-management',
    openApiUrl: `${process.env.API_GATEWAY_URL}/swagger/ClientManagement/swagger.json`,
    outputDir: 'lib/clients/client-management'
  },
  {
    name: 'identity',
    openApiUrl: `${process.env.API_GATEWAY_URL}/swagger/Identity/swagger.json`,
    outputDir: 'lib/clients/identity'
  }
];

async function generateClient(service: ServiceConfig): Promise<void> {
  console.log(`Generating client for ${service.name}...`);
  
  try {
    // Ensure output directory exists
    await fs.mkdir(service.outputDir, { recursive: true });
    
    // Generate TypeScript client using openapi-typescript-codegen
    await execAsync(`npx openapi-typescript-codegen --input "${service.openApiUrl}" --output "${service.outputDir}" --client fetch`);
    
    // Create index.ts for easy imports
    const indexContent = `export * from './services';
export * from './models';
export { ApiError } from './core/ApiError';
export { CancelablePromise } from './core/CancelablePromise';
export { OpenAPI } from './core/OpenAPI';
`;
    
    await fs.writeFile(path.join(service.outputDir, 'index.ts'), indexContent);
    
    console.log(`✅ Client generated for ${service.name}`);
  } catch (error) {
    console.error(`❌ Failed to generate client for ${service.name}:`, error);
  }
}

async function generateAllClients(): Promise<void> {
  console.log('Starting client generation...');
  
  // Install openapi-typescript-codegen if not already installed
  try {
    await execAsync('npx openapi-typescript-codegen --version');
  } catch {
    console.log('Installing openapi-typescript-codegen...');
    await execAsync('npm install -D openapi-typescript-codegen');
  }
  
  // Generate clients for all services
  for (const service of services) {
    await generateClient(service);
  }
  
  // Create main index file
  const mainIndexContent = services.map(s => 
    `export * as ${s.name.replace('-', '')}Client from './clients/${s.name}';`
  ).join('\n') + '\n';
  
  await fs.writeFile('lib/index.ts', mainIndexContent);
  
  console.log('🎉 All clients generated successfully!');
}

if (require.main === module) {
  generateAllClients().catch(console.error);
}

export { generateAllClients };