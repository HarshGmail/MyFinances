import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import database from '../database';
import { UserInput, userInputSchema, createUser } from '../schemas';
import { authenticateUser, clearAuthCookie } from '../utils/jwtHelpers';

export async function signup(req: Request, res: Response) {
  try {
    let userInput: UserInput;
    try {
      userInput = userInputSchema.parse(req.body);
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: err.errors || err.message,
      });
      return;
    }

    const db = database.getDb();
    const usersCollection = db.collection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: userInput.email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(userInput.password, saltRounds);

    // Create user document
    const userData = createUser({
      ...userInput,
      password: hashedPassword,
    });

    // Save user to database
    const result = await usersCollection.insertOne(userData);

    // Authenticate user (generate token and set cookie)
    authenticateUser(res, {
      name: userData.name,
      email: userData.email,
      id: result.insertedId.toString(),
    });

    // Return success response (without password)
    const { password: _, ...userWithoutPassword } = userData;

    res.status(201).json({
      success: true,
      message: 'User created and logged in successfully',
      data: {
        id: result.insertedId,
        ...userWithoutPassword,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Validate email and password presence
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
      return;
    }

    let parsedEmail: string;
    try {
      parsedEmail = userInputSchema.shape.email.parse(email);
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
        errors: err.errors || err.message,
      });
      return;
    }

    const db = database.getDb();
    const usersCollection = db.collection('users');

    // Find user by email
    const user = await usersCollection.findOne({ email: parsedEmail.toLowerCase() });
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Authenticate user (generate token and set cookie)
    authenticateUser(res, { name: user.name, email: user.email, id: user._id.toString() });

    // Return success response (without password and without token in body)
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        id: user._id,
        ...userWithoutPassword,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export function logout(req: Request, res: Response) {
  try {
    // Clear the JWT token cookie
    clearAuthCookie(res);
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}
