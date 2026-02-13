import { hashPassword, comparePassword, generateToken, verifyToken } from '../authService';
import jwt from 'jsonwebtoken';

describe('authService', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      
      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hash = await hashPassword(password);
      
      const isValid = await comparePassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });
  describe('generateToken', () => {
    it('returns a non-empty string', () => {
      const token = generateToken(1);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });
  
  describe('verifyToken', () => {
    it('returns userId for valid token', () => {
      const token = generateToken(42);
      const payload = verifyToken(token);
      expect(payload.userId).toBe(42);
    });
  
    it('throws for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });
  
    it('throws for expired token', () => {
      const secret = process.env.JWT_SECRET || 'secret-key';
      const token = jwt.sign({ userId: 1 }, secret, { expiresIn: '0s' });
      expect(() => verifyToken(token)).toThrow();
    });
  });
});


