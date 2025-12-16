import { hashPassword, verifyPassword, generatePasswordHash } from '@/lib/auth/password';

describe('Password Authentication', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'samePassword';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string password', async () => {
      const password = '';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle special characters in password', async () => {
      const password = '!@#$%^&*()_+{}[]';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password against hash', async () => {
      const password = 'correctPassword';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password against hash', async () => {
      const password = 'correctPassword';
      const wrongPassword = 'wrongPassword';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });

    it('should handle empty password verification', async () => {
      const password = '';
      const hash = await hashPassword(password);
      const isValidCorrect = await verifyPassword('', hash);
      const isValidWrong = await verifyPassword('notEmpty', hash);
      
      expect(isValidCorrect).toBe(true);
      expect(isValidWrong).toBe(false);
    });

    it('should handle case sensitivity', async () => {
      const password = 'TestPassword';
      const hash = await hashPassword(password);
      const isValidSame = await verifyPassword('TestPassword', hash);
      const isValidDifferentCase = await verifyPassword('testpassword', hash);
      
      expect(isValidSame).toBe(true);
      expect(isValidDifferentCase).toBe(false);
    });

    it('should reject invalid hash format', async () => {
      const password = 'testPassword';
      const invalidHash = 'not-a-valid-hash';
      const isValid = await verifyPassword(password, invalidHash);
      
      expect(isValid).toBe(false);
    });

    it('should handle long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      const hash = await hashPassword(longPassword);
      const isValid = await verifyPassword(longPassword, hash);
      
      expect(isValid).toBe(true);
    });

    it('should handle unicode characters', async () => {
      const unicodePassword = '密码测试123🔐';
      const hash = await hashPassword(unicodePassword);
      const isValid = await verifyPassword(unicodePassword, hash);
      
      expect(isValid).toBe(true);
    });
  });

  describe('generatePasswordHash', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should generate and log a password hash', async () => {
      const password = 'testPassword123';
      await generatePasswordHash(password);
      
      expect(consoleSpy).toHaveBeenCalledWith('Add this to your .env.local file:');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^SHARED_PASSWORD_HASH=\$2[ab]\$\d+\$.{53}$/)
      );
    });

    it('should generate valid hash that can be verified', async () => {
      const password = 'verifiablePassword';
      await generatePasswordHash(password);
      
      // Extract the hash from the console log
      const calls = consoleSpy.mock.calls;
      const hashCall = calls.find(call => call[0]?.startsWith?.('SHARED_PASSWORD_HASH='));
      expect(hashCall).toBeDefined();
      
      const hash = hashCall![0].replace('SHARED_PASSWORD_HASH=', '');
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });
  });

  describe('Security Properties', () => {
    it('should use bcrypt with sufficient salt rounds', async () => {
      const password = 'testPassword';
      const hash = await hashPassword(password);
      
      // Check that it starts with $2b$ (bcrypt) and has proper salt rounds
      expect(hash).toMatch(/^\$2[ab]\$\d{2}\$.{53}$/);
      
      // Extract salt rounds (should be at least 10)
      const saltRounds = parseInt(hash.substring(4, 6), 10);
      expect(saltRounds).toBeGreaterThanOrEqual(10);
    });

    it('should be resistant to timing attacks', async () => {
      const password = 'testPassword';
      const hash = await hashPassword(password);
      
      // Time correct password verification
      const start1 = Date.now();
      await verifyPassword(password, hash);
      const time1 = Date.now() - start1;
      
      // Time incorrect password verification
      const start2 = Date.now();
      await verifyPassword('wrongPassword', hash);
      const time2 = Date.now() - start2;
      
      // Both should take similar time (within 50ms difference)
      // This is a basic check; real timing attack resistance requires more sophisticated testing
      const timeDifference = Math.abs(time1 - time2);
      expect(timeDifference).toBeLessThan(50);
    });

    it('should handle concurrent password operations', async () => {
      const passwords = ['password1', 'password2', 'password3'];
      
      // Hash all passwords concurrently
      const hashPromises = passwords.map(p => hashPassword(p));
      const hashes = await Promise.all(hashPromises);
      
      // Verify all passwords concurrently
      const verifyPromises = passwords.map((p, i) => verifyPassword(p, hashes[i]));
      const results = await Promise.all(verifyPromises);
      
      expect(results).toEqual([true, true, true]);
      expect(hashes).toHaveLength(3);
      expect(new Set(hashes).size).toBe(3); // All hashes should be unique
    });
  });
});