import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import database from '../database';
import {
  UserInput,
  userInputSchema,
  createUser,
  User,
  updateUser,
  SalaryRecord,
  MonthlyPayment,
} from '../schemas';
import { authenticateUser, clearAuthCookie, getUserFromRequest } from '../utils/jwtHelpers';
import config from '../config';

export async function signup(req: Request, res: Response) {
  try {
    let userInput: UserInput;
    try {
      userInput = userInputSchema.parse(req.body);
    } catch (err: unknown) {
      const error = err as Error;
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.message,
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

    res.status(201).json({
      success: true,
      message: 'User created and logged in successfully',
      data: {
        email: userData.email,
        name: userData.name,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
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
    } catch (err: unknown) {
      const error = err as Error;
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
        errors: error.message,
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

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        email: user.email,
        name: user.name,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
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

export async function userProfile(req: Request, res: Response) {
  try {
    const userPayload = getUserFromRequest(req);

    if (!userPayload) {
      res.status(401).json({ success: false, message: 'Unauthorized: Invalid or missing token' });
      return;
    }

    const db = database.getDb();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ _id: new ObjectId(userPayload.userId) });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Get current base salary from salary history
    type SalaryRecord = {
      effectiveDate: string;
      baseSalary: number;
    };

    const currentBaseSalary =
      Array.isArray(user.salaryHistory) && user.salaryHistory.length > 0
        ? ((user.salaryHistory as SalaryRecord[])
            .filter((record) => new Date(record.effectiveDate) <= new Date())
            .sort(
              (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
            )[0]?.baseSalary ?? null)
        : (user.monthlySalary ?? null);

    // Generate ingest token lazily if not present
    let ingestToken: string = user.ingestToken;
    if (!ingestToken) {
      ingestToken = crypto.randomBytes(32).toString('hex');
      await usersCollection.updateOne(
        { _id: new ObjectId(userPayload.userId) },
        { $set: { ingestToken } }
      );
    }

    res.status(200).json({
      success: true,
      data: {
        userName: user.name,
        userEmail: user.email,
        dob: user.dob,
        joined: user.createdAt,
        monthlySalary: user.monthlySalary ?? null, // Keep for backward compatibility
        currentBaseSalary,
        salaryHistory: user.salaryHistory ?? [],
        paymentHistory: user.paymentHistory ?? [],
        ingestToken,
        session: {
          loginTime: userPayload.iat ? new Date(userPayload.iat * 1000) : null,
          expiry: userPayload.exp ? new Date(userPayload.exp * 1000) : null,
        },
      },
    });
  } catch (err) {
    console.error('User profile fetch error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile',
    });
  }
}

export async function updateUserProfile(req: Request, res: Response) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const db = database.getDb();
    const usersCollection = db.collection('users');

    const existingUser = await usersCollection.findOne({ _id: new ObjectId(userPayload.userId) });
    if (!existingUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Step 1: Map frontend fields
    const rawUpdates: Partial<User> = {
      name: req.body.userName,
      email: req.body.userEmail,
      dob: req.body.dob ? new Date(req.body.dob) : undefined,
    };

    // Step 2: Filter out undefined values (critical!)
    const mappedUpdates = Object.fromEntries(
      Object.entries(rawUpdates).filter(
        ([, v]) => v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '')
      )
    ) as Partial<User>;

    // Step 3: Validate with schema
    let updates: Partial<User>;
    try {
      updates = userInputSchema.partial().parse(mappedUpdates);
    } catch (err: unknown) {
      const error = err as Error;
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.message,
      });
      return;
    }

    // Step 4: Handle salary history updates separately
    let salaryHistoryUpdate: { salaryHistory?: SalaryRecord[] } = {};
    if (req.body.salaryHistory && Array.isArray(req.body.salaryHistory)) {
      try {
        const parsedSalaryHistory: SalaryRecord[] = req.body.salaryHistory.map(
          (record: { baseSalary: number; effectiveDate: string | Date; notes?: string }) => ({
            baseSalary: record.baseSalary,
            effectiveDate: new Date(record.effectiveDate),
            notes: record.notes,
          })
        );

        // Sort by effectiveDate (newest first)
        parsedSalaryHistory.sort(
          (a: SalaryRecord, b: SalaryRecord) =>
            b.effectiveDate.getTime() - a.effectiveDate.getTime()
        );

        salaryHistoryUpdate = { salaryHistory: parsedSalaryHistory };
      } catch {
        res.status(400).json({
          success: false,
          message: 'Invalid salary history format',
        });
        return;
      }
    }

    // Step 5: Handle payment history updates separately
    let paymentHistoryUpdate: { paymentHistory?: MonthlyPayment[] } = {};
    if (req.body.paymentHistory && Array.isArray(req.body.paymentHistory)) {
      try {
        const parsedPaymentHistory: MonthlyPayment[] = req.body.paymentHistory.map(
          (payment: {
            month: string | Date;
            baseAmount: number;
            bonus?: number;
            arrears?: number;
            totalPaid: number;
            notes?: string;
          }) => ({
            month: new Date(payment.month),
            baseAmount: payment.baseAmount,
            bonus: payment.bonus || 0,
            arrears: payment.arrears || 0,
            totalPaid: payment.totalPaid,
            notes: payment.notes,
          })
        );

        // Sort by month (newest first)
        parsedPaymentHistory.sort(
          (a: MonthlyPayment, b: MonthlyPayment) => b.month.getTime() - a.month.getTime()
        );

        paymentHistoryUpdate = { paymentHistory: parsedPaymentHistory };
      } catch {
        res.status(400).json({
          success: false,
          message: 'Invalid payment history format',
        });
        return;
      }
    }

    // Step 6: Update and save
    const updatedUser = {
      ...updateUser(existingUser as User, updates),
      ...salaryHistoryUpdate,
      ...paymentHistoryUpdate,
    };

    await usersCollection.updateOne(
      { _id: new ObjectId(userPayload.userId) },
      { $set: updatedUser }
    );

    // Get current base salary for response
    const currentBaseSalary =
      updatedUser.salaryHistory && updatedUser.salaryHistory.length > 0
        ? (updatedUser.salaryHistory
            .filter((record: SalaryRecord) => new Date(record.effectiveDate) <= new Date())
            .sort(
              (a: SalaryRecord, b: SalaryRecord) =>
                new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
            )[0]?.baseSalary ?? null)
        : null;

    res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      data: {
        userName: updatedUser.name,
        userEmail: updatedUser.email,
        dob: updatedUser.dob,
        joined: updatedUser.createdAt,
        currentBaseSalary,
        salaryHistory: updatedUser.salaryHistory ?? [],
        paymentHistory: updatedUser.paymentHistory ?? [],
      },
    });
  } catch (err: unknown) {
    console.error('User profile update error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function regenerateIngestToken(req: Request, res: Response) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const ingestToken = crypto.randomBytes(32).toString('hex');

    const db = database.getDb();
    await db
      .collection('users')
      .updateOne({ _id: new ObjectId(userPayload.userId) }, { $set: { ingestToken } });

    res.status(200).json({ success: true, data: { ingestToken } });
  } catch (err) {
    console.error('Regenerate ingest token error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function ingestTokenExchange(req: Request, res: Response) {
  try {
    const { ingestToken } = req.body;
    if (!ingestToken || typeof ingestToken !== 'string') {
      res.status(400).json({ success: false, message: 'ingestToken is required' });
      return;
    }
    const db = database.getDb();
    const user = await db.collection('users').findOne({ ingestToken });
    if (!user) {
      res.status(403).json({ success: false, message: 'Invalid ingest token' });
      return;
    }
    const token = jwt.sign(
      { name: user.name, email: user.email, userId: user._id.toString() },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ success: true, token });
  } catch (err) {
    console.error('Ingest token exchange error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
