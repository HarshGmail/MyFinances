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
import { encrypt, decrypt } from '../utils/encryption';
import { sendPasswordResetEmail } from '../utils/emailService';
import config from '../config';
import logger from '../utils/logger';

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
        id: result.insertedId.toString(),
        email: userData.email,
        name: userData.name,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error({ err: error }, 'Signup error');
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
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error({ err: error }, 'Login error');
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
    logger.error({ err: error }, 'Logout error');
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

    // Decrypt and mask PAN if present
    let panNumber: string | undefined;
    if (user.panNumber) {
      try {
        const decrypted = decrypt(user.panNumber);
        panNumber = decrypted.slice(0, 5) + '****' + decrypted.slice(-1); // e.g. ABCDE****F
      } catch {
        panNumber = undefined;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        userName: user.name,
        userEmail: user.email,
        dob: user.dob,
        phone: user.phone,
        panNumber,
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
    logger.error({ err }, 'User profile fetch error');
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
      phone: req.body.phone || undefined,
    };

    // Encrypt PAN if provided (validate format before encrypting)
    if (req.body.panNumber && typeof req.body.panNumber === 'string') {
      const pan = req.body.panNumber.toUpperCase().trim();
      if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
        try {
          (rawUpdates as Record<string, unknown>).panNumber = encrypt(pan);
        } catch {
          // ENCRYPTION_KEY not configured — skip PAN encryption silently
        }
      }
    }

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
        phone: updatedUser.phone,
        joined: updatedUser.createdAt,
        currentBaseSalary,
        salaryHistory: updatedUser.salaryHistory ?? [],
        paymentHistory: updatedUser.paymentHistory ?? [],
      },
    });
  } catch (err: unknown) {
    logger.error({ err }, 'User profile update error');
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
    logger.error({ err }, 'Regenerate ingest token error');
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
    logger.error({ err }, 'Ingest token exchange error');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    // Validate inputs
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
      return;
    }

    const db = database.getDb();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ _id: new ObjectId(userPayload.userId) });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await usersCollection.updateOne(
      { _id: new ObjectId(userPayload.userId) },
      { $set: { password: hashedPassword, updatedAt: new Date() } }
    );

    logger.info({ userId: userPayload.userId }, 'Password changed successfully');

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err: unknown) {
    logger.error({ err }, 'Change password error');
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    const db = database.getDb();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email: (email as string).toLowerCase() });

    // Always respond with 200 to avoid leaking email existence
    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent',
      });
      return;
    }

    // Generate reset token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const resetTokensCollection = db.collection('passwordResetTokens');
    await resetTokensCollection.insertOne({
      userId: user._id,
      tokenHash,
      expiresAt,
      createdAt: new Date(),
    });

    // Build reset URL
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${rawToken}`;

    // Send email
    await sendPasswordResetEmail(user.email, user.name, resetUrl);

    logger.info({ email: user.email }, 'Password reset email sent');

    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent',
    });
  } catch (err: unknown) {
    logger.error({ err }, 'Forgot password error');
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Token and new password are required',
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
      return;
    }

    const db = database.getDb();
    const resetTokensCollection = db.collection('passwordResetTokens');

    // Hash the token to match stored hash
    const tokenHash = crypto
      .createHash('sha256')
      .update(token as string)
      .digest('hex');

    // Find token in DB
    const resetTokenDoc = await resetTokensCollection.findOne({ tokenHash });

    if (!resetTokenDoc) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset link',
      });
      return;
    }

    // Check if token is expired
    if (new Date() > resetTokenDoc.expiresAt) {
      await resetTokensCollection.deleteOne({ _id: resetTokenDoc._id });
      res.status(400).json({
        success: false,
        message: 'Reset link has expired',
      });
      return;
    }

    // Fetch user
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ _id: resetTokenDoc.userId });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await usersCollection.updateOne(
      { _id: resetTokenDoc.userId },
      { $set: { password: hashedPassword, updatedAt: new Date() } }
    );

    // Delete token immediately
    await resetTokensCollection.deleteOne({ _id: resetTokenDoc._id });

    logger.info({ userId: resetTokenDoc.userId }, 'Password reset successfully');

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (err: unknown) {
    logger.error({ err }, 'Reset password error');
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function demoLogin(req: Request, res: Response) {
  try {
    const DEMO_EMAIL = 'testuser@gmail.com';
    const db = database.getDb();
    const usersCollection = db.collection('users');

    const demoUser = await usersCollection.findOne({ email: DEMO_EMAIL });

    if (!demoUser) {
      logger.error({ email: DEMO_EMAIL }, 'Demo user not found');
      res.status(503).json({
        success: false,
        message: 'Demo account not available',
      });
      return;
    }

    // Authenticate user (generate token and set cookie)
    authenticateUser(res, {
      name: demoUser.name,
      email: demoUser.email,
      id: demoUser._id.toString(),
    });

    res.status(200).json({
      success: true,
      message: 'Demo login successful',
      data: {
        id: demoUser._id.toString(),
        email: demoUser.email,
        name: demoUser.name,
        isDemo: true,
      },
    });
  } catch (err: unknown) {
    logger.error({ err }, 'Demo login error');
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}
