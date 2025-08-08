import { User } from '../../models/user.js';
import { logger } from '../../src/utils/logger.js';
import bcrypt from 'bcrypt';

export class CreateUserCommand {
  constructor() {
    // User model will be imported
  }

  async execute(options = {}) {
    const { username, email, password, role = 'user', profile = {} } = options;
    
    try {
      logger.info('Starting user creation command', { username, email, role });
      
      // Validate required fields
      if (!username || !email || !password) {
        throw new Error('Username, email, and password are required');
      }
      
      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [{ username }, { email }] 
      });
      
      if (existingUser) {
        throw new Error('User with this username or email already exists');
      }
      
      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Create user
      const user = new User({
        username,
        email,
        password: hashedPassword,
        role,
        profile,
        createdAt: new Date(),
        isActive: true
      });
      
      await user.save();
      
      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;
      
      logger.info('User created successfully', { userId: user._id, username });
      return userResponse;
    } catch (error) {
      logger.error('Error during user creation', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  async createWithValidation(options = {}) {
    const { username, email, password, role = 'user', profile = {} } = options;
    
    try {
      logger.info('Starting user creation with validation', { username, email, role });
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }
      
      // Validate password strength
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }
      
      // Validate username format
      if (username.length < 3 || username.length > 30) {
        throw new Error('Username must be between 3 and 30 characters');
      }
      
      // Validate role
      const validRoles = ['user', 'admin', 'moderator'];
      if (!validRoles.includes(role)) {
        throw new Error('Invalid role');
      }
      
      // Proceed with creation
      return await this.execute({ username, email, password, role, profile });
    } catch (error) {
      logger.error('Error during user creation with validation', { error: error.message });
      throw error;
    }
  }
}

