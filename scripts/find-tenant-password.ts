#!/usr/bin/env node

import axios from 'axios';
import * as crypto from 'crypto';

const API_GATEWAY_URL = 'https://api-gateway-production-91e9.up.railway.app';

async function testPassword(password: string): Promise<boolean> {
  try {
    const response = await axios.post(
      `${API_GATEWAY_URL}/api/authentication/login`,
      { 
        email: 'anass.yatim+nstech2@gmail.com',
        password 
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': crypto.randomUUID()
        },
        validateStatus: () => true
      }
    );
    
    if (response.status === 200) {
      console.log(`✅ SUCCESS with password: ${password}`);
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 Finding TenantAdmin password...\n');
  
  const passwords = [
    'Admin@123!',
    'TenantAdmin@123!',
    'Test@123!',
    'Password@123!',
    'Shift@2024!',
    'Welcome@123!',
    'Anass@123!',
    'nstech2@123!',
    'Nstech2@123!',
    'SuperAdmin@123!',
    '123456',
    'password',
    'Password1!',
    'Test123!',
    'Admin123!',
  ];
  
  for (const pwd of passwords) {
    console.log(`Testing: ${pwd}`);
    const success = await testPassword(pwd);
    if (success) {
      console.log(`\n✅ Found password: ${pwd}`);
      break;
    }
  }
}

main();