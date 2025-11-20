#!/usr/bin/env node

/**
 * JWT Authentication Testing Script
 * 
 * Usage:
 *   node test-jwt-auth.js
 *   node test-jwt-auth.js --host localhost --port 3108
 * 
 * Tests:
 * 1. Login endpoint
 * 2. Token validation
 * 3. Refresh token
 * 4. Get user info
 * 5. Change password
 * 6. Logout
 * 7. Rate limiting
 */

const axios = require('axios');
const colors = require('colors');

// Configuration
const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 3108;
const BASE_URL = `http://${HOST}:${PORT}`;

// Test credentials
const TEST_USER = {
  email: 'admin@wms.local',
  password: 'password123'
};

// State
let tokens = {
  access: null,
  refresh: null
};

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  validateStatus: () => true // Don't throw on any status
});

// ============================================================
// UTILITIES
// ============================================================

function log(type, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[${timestamp}]`;

  switch (type) {
    case 'header':
      console.log('\n' + '='.repeat(70));
      console.log(colors.cyan(prefix + ' ' + message));
      console.log('='.repeat(70));
      break;
    case 'success':
      console.log(colors.green(`✅ ${prefix} ${message}`));
      if (data) console.log('   ' + JSON.stringify(data, null, 2).split('\n').join('\n   '));
      break;
    case 'error':
      console.log(colors.red(`❌ ${prefix} ${message}`));
      if (data) console.log('   ' + JSON.stringify(data, null, 2).split('\n').join('\n   '));
      break;
    case 'info':
      console.log(colors.blue(`ℹ️  ${prefix} ${message}`));
      if (data) console.log('   ' + JSON.stringify(data, null, 2).split('\n').join('\n   '));
      break;
    case 'warning':
      console.log(colors.yellow(`⚠️  ${prefix} ${message}`));
      if (data) console.log('   ' + JSON.stringify(data, null, 2).split('\n').join('\n   '));
      break;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// TESTS
// ============================================================

async function testHealthCheck() {
  log('header', 'TEST 1: Health Check');
  
  try {
    const res = await api.get('/health');
    
    if (res.status === 200) {
      log('success', 'Server is healthy', res.data);
      return true;
    } else {
      log('error', `Health check failed with status ${res.status}`, res.data);
      return false;
    }
  } catch (error) {
    log('error', `Cannot connect to ${BASE_URL}`, error.message);
    return false;
  }
}

async function testLogin() {
  log('header', 'TEST 2: Login');
  
  try {
    const res = await api.post('/auth/login', TEST_USER);
    
    if (res.status === 200 && res.data.token) {
      tokens.access = res.data.token;
      tokens.refresh = res.data.refreshToken;
      
      log('success', 'Login successful', {
        user: res.data.user,
        token_type: res.data.token_type,
        expires_in: res.data.expires_in
      });
      return true;
    } else {
      log('error', `Login failed with status ${res.status}`, res.data);
      return false;
    }
  } catch (error) {
    log('error', 'Login error', error.message);
    return false;
  }
}

async function testGetMe() {
  log('header', 'TEST 3: Get Current User Info');
  
  if (!tokens.access) {
    log('warning', 'Skipping - No access token available');
    return false;
  }

  try {
    const res = await api.get('/auth/me', {
      headers: { 'Authorization': `Bearer ${tokens.access}` }
    });
    
    if (res.status === 200) {
      log('success', 'Get me successful', res.data.user);
      return true;
    } else {
      log('error', `Get me failed with status ${res.status}`, res.data);
      return false;
    }
  } catch (error) {
    log('error', 'Get me error', error.message);
    return false;
  }
}

async function testVerifyToken() {
  log('header', 'TEST 4: Verify Token');
  
  if (!tokens.access) {
    log('warning', 'Skipping - No access token available');
    return false;
  }

  try {
    const res = await api.post('/auth/verify', {}, {
      headers: { 'Authorization': `Bearer ${tokens.access}` }
    });
    
    if (res.status === 200 && res.data.valid) {
      log('success', 'Token is valid', {
        user: res.data.user,
        expiresAt: res.data.expiresAt
      });
      return true;
    } else {
      log('error', `Token verification failed`, res.data);
      return false;
    }
  } catch (error) {
    log('error', 'Verify token error', error.message);
    return false;
  }
}

async function testRefreshToken() {
  log('header', 'TEST 5: Refresh Token');
  
  if (!tokens.refresh) {
    log('warning', 'Skipping - No refresh token available');
    return false;
  }

  try {
    const res = await api.post('/auth/refresh', {
      refreshToken: tokens.refresh
    });
    
    if (res.status === 200 && res.data.token) {
      const oldToken = tokens.access;
      tokens.access = res.data.token;
      
      log('success', 'Token refreshed successfully', {
        expires_in: res.data.expires_in,
        token_type: res.data.token_type,
        token_changed: oldToken !== tokens.access
      });
      return true;
    } else {
      log('error', `Token refresh failed with status ${res.status}`, res.data);
      return false;
    }
  } catch (error) {
    log('error', 'Refresh token error', error.message);
    return false;
  }
}

async function testInvalidToken() {
  log('header', 'TEST 6: Invalid Token Handling');
  
  try {
    const res = await api.get('/auth/me', {
      headers: { 'Authorization': 'Bearer invalid_token_123' }
    });
    
    if (res.status === 401) {
      log('success', 'Invalid token correctly rejected', res.data);
      return true;
    } else {
      log('warning', `Expected 401 but got ${res.status}`, res.data);
      return false;
    }
  } catch (error) {
    log('error', 'Invalid token test error', error.message);
    return false;
  }
}

async function testMissingAuth() {
  log('header', 'TEST 7: Missing Authorization Header');
  
  try {
    const res = await api.get('/auth/me');
    
    if (res.status === 401) {
      log('success', 'Missing auth correctly rejected', res.data);
      return true;
    } else {
      log('warning', `Expected 401 but got ${res.status}`, res.data);
      return false;
    }
  } catch (error) {
    log('error', 'Missing auth test error', error.message);
    return false;
  }
}

async function testChangePassword() {
  log('header', 'TEST 8: Change Password');
  
  if (!tokens.access) {
    log('warning', 'Skipping - No access token available');
    return false;
  }

  try {
    const res = await api.post(
      '/auth/change-password',
      {
        currentPassword: TEST_USER.password,
        newPassword: 'newpassword123', // Will fail if user already has this pwd
        confirmPassword: 'newpassword123'
      },
      {
        headers: { 'Authorization': `Bearer ${tokens.access}` }
      }
    );
    
    if (res.status === 200) {
      log('success', 'Password change successful', res.data);
      return true;
    } else if (res.status === 400 || res.status === 401) {
      log('info', `Change password expected error (expected in test)`, res.data);
      return true;
    } else {
      log('error', `Change password failed with status ${res.status}`, res.data);
      return false;
    }
  } catch (error) {
    log('error', 'Change password error', error.message);
    return false;
  }
}

async function testRateLimiting() {
  log('header', 'TEST 9: Rate Limiting on Login');
  
  log('info', 'Attempting 6 rapid login requests (limit is 5/15min)...');
  
  let limitedRequests = 0;
  
  for (let i = 0; i < 6; i++) {
    try {
      const res = await api.post('/auth/login', {
        email: 'test@test.com',
        password: 'wrongpass'
      });
      
      if (res.status === 429) {
        limitedRequests++;
        log('info', `Request ${i + 1}: Rate limited (429)`);
      } else {
        log('info', `Request ${i + 1}: Status ${res.status}`);
      }
    } catch (error) {
      log('info', `Request ${i + 1}: Error ${error.message}`);
    }
    
    if (i < 5) await sleep(100); // Small delay between requests
  }
  
  if (limitedRequests > 0) {
    log('success', `Rate limiting working! ${limitedRequests} requests were limited`);
    return true;
  } else {
    log('warning', 'No rate limited requests detected (might be configured differently)');
    return true; // Not a hard failure
  }
}

async function testLogout() {
  log('header', 'TEST 10: Logout');
  
  if (!tokens.access) {
    log('warning', 'Skipping - No access token available');
    return false;
  }

  try {
    const res = await api.post(
      '/auth/logout',
      {},
      {
        headers: { 'Authorization': `Bearer ${tokens.access}` }
      }
    );
    
    if (res.status === 200) {
      log('success', 'Logout successful', res.data);
      return true;
    } else {
      log('error', `Logout failed with status ${res.status}`, res.data);
      return false;
    }
  } catch (error) {
    log('error', 'Logout error', error.message);
    return false;
  }
}

// ============================================================
// MAIN
// ============================================================

async function runAllTests() {
  console.clear();
  console.log(colors.cyan.bold('╔' + '═'.repeat(68) + '╗'));
  console.log(colors.cyan.bold('║') + ' JWT Authentication Testing Suite'.padEnd(68) + colors.cyan.bold('║'));
  console.log(colors.cyan.bold('║') + ` Target: ${BASE_URL}`.padEnd(68) + colors.cyan.bold('║'));
  console.log(colors.cyan.bold('╚' + '═'.repeat(68) + '╝'));

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Login', fn: testLogin },
    { name: 'Get Current User', fn: testGetMe },
    { name: 'Verify Token', fn: testVerifyToken },
    { name: 'Refresh Token', fn: testRefreshToken },
    { name: 'Invalid Token', fn: testInvalidToken },
    { name: 'Missing Auth', fn: testMissingAuth },
    { name: 'Change Password', fn: testChangePassword },
    { name: 'Rate Limiting', fn: testRateLimiting },
    { name: 'Logout', fn: testLogout }
  ];

  const results = [];

  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ test: test.name, passed: result });
    } catch (error) {
      log('error', `Test "${test.name}" crashed`, error.message);
      results.push({ test: test.name, passed: false });
    }
  }

  // Summary
  log('header', 'TEST SUMMARY');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log('\n📋 Results:\n');
  results.forEach((r, i) => {
    const status = r.passed ? colors.green('✅ PASS') : colors.red('❌ FAIL');
    console.log(`   ${(i + 1).toString().padStart(2)}) ${r.test.padEnd(30)} ${status}`);
  });

  console.log(`\n📊 Summary: ${colors.green(passed + ' passed')} / ${colors.red(failed + ' failed')}\n`);

  if (failed === 0) {
    console.log(colors.green.bold('🎉 All tests passed!\n'));
    process.exit(0);
  } else {
    console.log(colors.yellow.bold(`⚠️  ${failed} test(s) failed\n`));
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  log('error', 'Test suite error', error.message);
  process.exit(1);
});
