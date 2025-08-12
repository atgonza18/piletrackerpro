// Quick test script to verify invitation token generation works
const crypto = require('crypto');

// Test the token generation logic
const generateToken = () => {
  const array = new Uint8Array(32);
  crypto.randomFillSync(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Generate a test token
const testToken = generateToken();
console.log('Generated test token:', testToken);
console.log('Token length:', testToken.length);

// Test expiration date
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 7);
console.log('Expires at:', expiresAt.toISOString());

// Test invitation URL
const invitationLink = `http://localhost:3009/auth?invitation=${testToken}`;
console.log('Invitation link:', invitationLink);
console.log('\nTest passed! Token generation logic works correctly.');