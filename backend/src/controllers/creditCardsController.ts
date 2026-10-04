import { Request, Response } from 'express';
import { Db, ObjectId, WithId, Document } from 'mongodb';
import { ZodError } from 'zod';
import database from '../database';
import {
  CreditCardIssuer,
  creditCardInputSchema,
  creditCardUpdateSchema,
} from '../schemas/creditCard';
import { GmailClient, StatementMessage, StatementSender } from '../services/gmailService';
import { PdfPasswordError, extractTextFromPdfWithPassword } from '../services/pdfParser';
import {
  KNOWN_CARD_SENDERS,
  buildCardPasswordCandidates,
  extractPasswordHint,
  issuerForSender,
} from '../services/creditCardPasswords';
import {
  ParsedCardStatement,
  parseCreditCardStatement,
  statementMentionsCard,
} from '../services/creditCardStatementParser';
import { sendPush } from '../services/pushService';
import { decrypt, encrypt } from '../utils/encryption';
import { loadCustomPdfPasswords } from '../utils/customPasswords';
import { getUserFromRequest } from '../utils/jwtHelpers';
import { resolveOwnedFilter } from '../utils/ownedDocuments';
import logger from '../utils/logger';

const CARDS_COLLECTION = 'creditCards';
const STATEMENTS_COLLECTION = 'creditCardStatements';
const TRANSACTIONS_COLLECTION = 'creditCardTransactions';
const SYNC_JOB_KIND = 'credit-cards';
const NO_PASSWORD = '';
const MASKED_DIGITS_PREFIX = '••';

interface CardSyncResult {
  statementsImported: number;
  transactionsImported: number;
  passwordsDiscovered: number;
  errors: string[];
}

interface CardSenderSuggestion {
  email: string;
  issuer: CreditCardIssuer | null;
  count: number;
  latestSubject?: string;
  isKnown: boolean;
}

function requireUserId(req: Request, res: Response): ObjectId | null {
  const user = getUserFromRequest(req);
  if (!user?.userId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return null;
  }
  return new ObjectId(user.userId);
}

function handleCardError(res: Response, error: unknown, context: string) {
  if (error instanceof ZodError) {
    res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    return;
  }
  logger.error({ err: error }, context);
  res.status(500).json({ success: false, message: 'Internal server error' });
}

const idString = (value: unknown) => (value instanceof ObjectId ? value.toHexString() : value);

function withoutFields(doc: WithId<Document>, hiddenFields: readonly string[]) {
  return Object.fromEntries(Object.entries(doc).filter(([key]) => !hiddenFields.includes(key)));
}

const HIDDEN_CARD_FIELDS = ['userId', 'pdfPassword'] as const;
const HIDDEN_STATEMENT_FIELDS = ['userId', 'gmailMessageId'] as const;
const HIDDEN_TRANSACTION_FIELDS = ['userId'] as const;

function toCreditCardResponse(card: WithId<Document>) {
  return {
    ...withoutFields(card, HIDDEN_CARD_FIELDS),
    _id: card._id.toHexString(),
    hasPassword: !!card.pdfPassword,
    passwordSource: card.passwordSource ?? null,
    lastSyncAt: card.lastSyncAt ?? null,
  };
}

function toStatementResponse(statement: WithId<Document>) {
  return {
    ...withoutFields(statement, HIDDEN_STATEMENT_FIELDS),
    _id: statement._id.toHexString(),
    cardId: idString(statement.cardId),
  };
}

function toTransactionResponse(transaction: WithId<Document>) {
  return {
    ...withoutFields(transaction, HIDDEN_TRANSACTION_FIELDS),
    _id: transaction._id.toHexString(),
    cardId: idString(transaction.cardId),
    statementId: idString(transaction.statementId),
  };
}

function passwordFields(pdfPassword: string | undefined) {
  if (pdfPassword === undefined) return {};
  return pdfPassword
    ? { pdfPassword: encrypt(pdfPassword), passwordSource: 'user' as const }
    : { pdfPassword: null, passwordSource: null };
}

export async function getCreditCards(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const cards = await database
      .getDb()
      .collection(CARDS_COLLECTION)
      .find({ userId })
      .sort({ createdAt: 1 })
      .toArray();
    res.status(200).json({ success: true, data: cards.map(toCreditCardResponse) });
  } catch (error) {
    handleCardError(res, error, 'Fetch credit cards error');
  }
}

export async function addCreditCard(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const { pdfPassword, ...identity } = creditCardInputSchema.parse(req.body);
    const now = new Date();
    const result = await database
      .getDb()
      .collection(CARDS_COLLECTION)
      .insertOne({
        ...identity,
        userId,
        passwordSource: null,
        ...passwordFields(pdfPassword),
        lastSyncAt: null,
        createdAt: now,
        updatedAt: now,
      });
    res.status(201).json({ success: true, message: 'Card added', id: result.insertedId });
  } catch (error) {
    handleCardError(res, error, 'Add credit card error');
  }
}

export async function updateCreditCard(req: Request, res: Response) {
  const filter = resolveOwnedFilter(req, res, 'Card');
  if (!filter) return;
  try {
    const { pdfPassword, ...identity } = creditCardUpdateSchema.parse(req.body);
    const result = await database
      .getDb()
      .collection(CARDS_COLLECTION)
      .updateOne(filter, {
        $set: { ...identity, ...passwordFields(pdfPassword), updatedAt: new Date() },
      });
    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'Card not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Card updated' });
  } catch (error) {
    handleCardError(res, error, 'Update credit card error');
  }
}

export async function deleteCreditCard(req: Request, res: Response) {
  const filter = resolveOwnedFilter(req, res, 'Card');
  if (!filter) return;
  try {
    const db = database.getDb();
    const result = await db.collection(CARDS_COLLECTION).deleteOne(filter);
    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: 'Card not found' });
      return;
    }
    const cardScope = { userId: filter.userId, cardId: filter._id };
    await db.collection(TRANSACTIONS_COLLECTION).deleteMany(cardScope);
    await db.collection(STATEMENTS_COLLECTION).deleteMany(cardScope);
    res.status(200).json({ success: true, message: 'Card deleted' });
  } catch (error) {
    handleCardError(res, error, 'Delete credit card error');
  }
}

export async function resetCardSync(req: Request, res: Response) {
  const filter = resolveOwnedFilter(req, res, 'Card');
  if (!filter) return;
  try {
    const result = await database
      .getDb()
      .collection(CARDS_COLLECTION)
      .updateOne(filter, { $set: { lastSyncAt: null, updatedAt: new Date() } });
    if (result.matchedCount === 0) {
      res.status(404).json({ success: false, message: 'Card not found' });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Sync history cleared — next sync will fetch every statement',
    });
  } catch (error) {
    handleCardError(res, error, 'Reset card sync error');
  }
}

function resolveCardFilter(req: Request, res: Response, userId: ObjectId) {
  const { cardId } = req.query;
  if (cardId === undefined || cardId === '') return { userId };
  if (typeof cardId !== 'string' || !ObjectId.isValid(cardId)) {
    res.status(400).json({ success: false, message: 'Invalid card ID' });
    return null;
  }
  return { userId, cardId: new ObjectId(cardId) };
}

export async function getCardStatements(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const filter = resolveCardFilter(req, res, userId);
  if (!filter) return;
  try {
    const statements = await database
      .getDb()
      .collection(STATEMENTS_COLLECTION)
      .find(filter)
      .sort({ periodEnd: -1 })
      .toArray();
    res.status(200).json({ success: true, data: statements.map(toStatementResponse) });
  } catch (error) {
    handleCardError(res, error, 'Fetch card statements error');
  }
}

export async function getCardTransactions(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const filter = resolveCardFilter(req, res, userId);
  if (!filter) return;
  try {
    const transactions = await database
      .getDb()
      .collection(TRANSACTIONS_COLLECTION)
      .find(filter)
      .sort({ date: -1 })
      .toArray();
    res.status(200).json({ success: true, data: transactions.map(toTransactionResponse) });
  } catch (error) {
    handleCardError(res, error, 'Fetch card transactions error');
  }
}

function knownSenderSuggestions(): Map<string, CardSenderSuggestion> {
  return new Map(
    KNOWN_CARD_SENDERS.map(({ email, issuer }) => [
      email,
      { email, issuer, count: 0, isKnown: true },
    ])
  );
}

function mergeSender(suggestions: Map<string, CardSenderSuggestion>, sender: StatementSender) {
  const existing = suggestions.get(sender.email);
  if (existing) {
    existing.count += sender.count;
    existing.latestSubject = existing.latestSubject ?? sender.latestSubject;
    return;
  }
  suggestions.set(sender.email, {
    email: sender.email,
    issuer: issuerForSender(sender.email),
    count: sender.count,
    latestSubject: sender.latestSubject,
    isKnown: false,
  });
}

const bySenderRelevance = (a: CardSenderSuggestion, b: CardSenderSuggestion) =>
  b.count - a.count || Number(b.isKnown) - Number(a.isKnown);

export async function getCardSenderSuggestions(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const integrations = await database
      .getDb()
      .collection('emailIntegrations')
      .find({ userId })
      .toArray();
    const suggestions = knownSenderSuggestions();
    for (const integration of integrations) {
      try {
        const senders = await new GmailClient(
          integration.refreshToken as string
        ).listStatementSenders();
        senders.forEach((sender) => mergeSender(suggestions, sender));
      } catch (err) {
        logger.warn(
          { err, account: integration.email },
          '[CreditCards] Could not list statement senders for account'
        );
      }
    }
    res
      .status(200)
      .json({ success: true, data: [...suggestions.values()].sort(bySenderRelevance) });
  } catch (error) {
    handleCardError(res, error, 'Card sender suggestions error');
  }
}

export async function syncCreditCards(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const db = database.getDb();
    const integrations = await db.collection('emailIntegrations').find({ userId }).toArray();
    if (integrations.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Link a Gmail account in Integrations before syncing card statements',
      });
      return;
    }
    const cards = await db.collection(CARDS_COLLECTION).find({ userId }).toArray();
    if (cards.length === 0) {
      res.status(400).json({ success: false, message: 'Add a credit card before syncing' });
      return;
    }
    const userDoc = await db.collection('users').findOne({ _id: userId });
    if (!userDoc) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const jobId = new ObjectId().toHexString();
    await db.collection('syncJobs').insertOne({
      _id: new ObjectId(jobId),
      userId,
      kind: SYNC_JOB_KIND,
      status: 'processing',
      createdAt: new Date(),
    });

    res.status(202).json({ success: true, data: { jobId } });

    void runCardSyncInBackground(jobId, userId, userDoc, cards, integrations, db);
  } catch (error) {
    handleCardError(res, error, 'Credit card sync error');
  }
}

interface PasswordPlan {
  passwords: string[];
  savedPassword: string | null;
  derivedCount: number;
  customCount: number;
}

function dedupePasswords(candidates: string[]): string[] {
  return [...new Set(candidates.filter((candidate) => candidate.length > 0)), NO_PASSWORD];
}

function decryptSavedPassword(card: WithId<Document>): string | null {
  if (!card.pdfPassword) return null;
  try {
    return decrypt(card.pdfPassword as string);
  } catch (err) {
    logger.warn({ err, cardId: card._id }, '[CardSync] Saved card password could not be decrypted');
    return null;
  }
}

function planCardPasswords(
  card: WithId<Document>,
  userDoc: WithId<Document>,
  customPasswords: string[]
): PasswordPlan {
  const savedPassword = decryptSavedPassword(card);
  const derived = buildCardPasswordCandidates({
    issuer: card.issuer as CreditCardIssuer,
    name: (card.nameOnCard as string | undefined) || ((userDoc.name as string) ?? ''),
    dob: (userDoc.dob as Date | undefined) ?? null,
    lastDigits: card.lastDigits as string,
  });
  return {
    passwords: dedupePasswords([savedPassword ?? '', ...derived, ...customPasswords]),
    savedPassword,
    derivedCount: derived.length,
    customCount: customPasswords.length,
  };
}

function cardTag(card: WithId<Document>): string {
  const lastDigits = card.lastDigits as string;
  return `[${card.label as string} ${MASKED_DIGITS_PREFIX}${lastDigits.slice(-4)}]`;
}

const formatEmailDate = (date: Date) =>
  date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

function describeTriedPasswords(plan: PasswordPlan): string {
  const parts = [
    ...(plan.savedPassword ? ['saved password'] : []),
    `${plan.derivedCount} name+DOB formats`,
    `${plan.customCount} custom passwords`,
  ];
  return parts.join(' / ');
}

function describeLockedStatement(
  card: WithId<Document>,
  message: StatementMessage,
  plan: PasswordPlan,
  hint: string | undefined
): string {
  const hintNote = hint ? ` The email says: "${hint}".` : '';
  return (
    `${cardTag(card)} Couldn't open the statement emailed on ${formatEmailDate(message.receivedAt)} ` +
    `(tried ${describeTriedPasswords(plan)}).${hintNote} ` +
    'Add the password on the card in Expenses › Credit Cards.'
  );
}

function senderQuery(senderEmails: string[]): string {
  return `from:(${senderEmails.join(' OR ')}) has:attachment`;
}

async function saveStatement(
  db: Db,
  userId: ObjectId,
  cardId: ObjectId,
  parsed: ParsedCardStatement,
  periodEnd: Date,
  gmailMessageId: string
): Promise<number> {
  const { summary } = parsed;
  const statementFields = {
    periodStart: summary.periodStart,
    statementDate: summary.statementDate,
    dueDate: summary.dueDate,
    totalDue: summary.totalDue ?? 0,
    minimumDue: summary.minimumDue,
    previousBalance: summary.previousBalance,
    creditLimit: summary.creditLimit,
    availableLimit: summary.availableLimit,
    reconciled: parsed.reconciled,
    gmailMessageId,
    parsedAt: new Date(),
  };
  const definedFields = Object.fromEntries(
    Object.entries(statementFields).filter(([, value]) => value !== undefined)
  );
  const statement = await db
    .collection(STATEMENTS_COLLECTION)
    .findOneAndUpdate(
      { userId, cardId, periodEnd },
      { $set: definedFields, $setOnInsert: { userId, cardId, periodEnd } },
      { upsert: true, returnDocument: 'after', projection: { _id: 1 } }
    );
  const statementId = statement?._id;
  if (!statementId) throw new Error('Statement upsert returned no document');

  await db.collection(TRANSACTIONS_COLLECTION).deleteMany({ userId, statementId });
  if (parsed.transactions.length === 0) return 0;
  await db
    .collection(TRANSACTIONS_COLLECTION)
    .insertMany(
      parsed.transactions.map((transaction) => ({ ...transaction, userId, cardId, statementId }))
    );
  return parsed.transactions.length;
}

interface CardSyncContext {
  db: Db;
  userId: ObjectId;
  card: WithId<Document>;
  plan: PasswordPlan;
  result: CardSyncResult;
}

async function rememberHint(ctx: CardSyncContext, hint: string | undefined) {
  if (!hint) return;
  await ctx.db
    .collection(CARDS_COLLECTION)
    .updateOne({ _id: ctx.card._id }, { $set: { passwordHint: hint, updatedAt: new Date() } });
}

async function rememberDiscoveredPassword(
  ctx: CardSyncContext,
  password: string,
  hint: string | undefined
) {
  if (!password || ctx.plan.savedPassword) return;
  await ctx.db.collection(CARDS_COLLECTION).updateOne(
    { _id: ctx.card._id },
    {
      $set: {
        pdfPassword: encrypt(password),
        passwordSource: 'derived',
        ...(hint && { passwordHint: hint }),
        updatedAt: new Date(),
      },
    }
  );
  ctx.plan.savedPassword = password;
  ctx.result.passwordsDiscovered += 1;
}

type PdfImportOutcome = 'imported' | 'locked' | 'other-card';

async function importStatementPdf(
  ctx: CardSyncContext,
  message: StatementMessage,
  pdf: Buffer,
  hint: string | undefined
): Promise<PdfImportOutcome> {
  const { card, plan, result } = ctx;
  let unlocked: { text: string; password: string };
  try {
    unlocked = await extractTextFromPdfWithPassword(pdf, plan.passwords);
  } catch (err) {
    if (!(err instanceof PdfPasswordError)) throw err;
    result.errors.push(describeLockedStatement(card, message, plan, hint));
    await rememberHint(ctx, hint);
    return 'locked';
  }

  if (!statementMentionsCard(unlocked.text, card.lastDigits as string)) {
    logger.info(
      { cardId: card._id, messageId: message.messageId },
      '[CardSync] Statement belongs to another card from the same sender, skipping'
    );
    return 'other-card';
  }

  await rememberDiscoveredPassword(ctx, unlocked.password, hint);

  const parsed = parseCreditCardStatement(unlocked.text, card.issuer as CreditCardIssuer);
  const warnings = [...parsed.warnings];
  let periodEnd = parsed.summary.periodEnd;
  if (!periodEnd) {
    periodEnd = message.receivedAt;
    warnings.push(
      `Statement period not found; filed under the email date ${formatEmailDate(message.receivedAt)}`
    );
  }

  result.transactionsImported += await saveStatement(
    ctx.db,
    ctx.userId,
    card._id,
    parsed,
    periodEnd,
    message.messageId
  );
  result.statementsImported += 1;
  result.errors.push(
    ...warnings.map(
      (warning) => `${cardTag(card)} ${formatEmailDate(message.receivedAt)}: ${warning}`
    )
  );
  return 'imported';
}

async function fetchCardMessages(
  ctx: CardSyncContext,
  integrations: WithId<Document>[]
): Promise<{ messages: StatementMessage[]; fetchFailed: boolean }> {
  const { card, result } = ctx;
  const query = senderQuery(card.senderEmails as string[]);
  const afterDate = (card.lastSyncAt as Date | null) ?? undefined;
  const messages: StatementMessage[] = [];
  let fetchFailed = false;

  for (const integration of integrations) {
    const account = integration.email as string;
    try {
      const client = new GmailClient(integration.refreshToken as string);
      messages.push(...(await client.fetchStatementMessages(query, afterDate)));
    } catch (err) {
      fetchFailed = true;
      const isInvalidGrant = err instanceof Error && err.message.includes('invalid_grant');
      result.errors.push(
        isInvalidGrant
          ? `${cardTag(card)} Gmail access for ${account} has expired. Reconnect it in Integrations.`
          : `${cardTag(card)} Could not fetch emails from ${account}: ${err instanceof Error ? err.message : String(err)}`
      );
      logger.error(
        { err, account, cardId: card._id, isInvalidGrant },
        isInvalidGrant
          ? '[CardSync] Fetch failed — invalid_grant means the OAuth token was revoked or expired; user must reconnect Gmail'
          : '[CardSync] Statement email fetch error'
      );
    }
  }

  return { messages, fetchFailed };
}

async function syncCard(ctx: CardSyncContext, integrations: WithId<Document>[]) {
  const { messages, fetchFailed } = await fetchCardMessages(ctx, integrations);
  let cardFailed = fetchFailed;

  for (const message of messages) {
    const hint = message.html ? extractPasswordHint(message.html) : undefined;
    for (const pdf of message.pdfs) {
      try {
        const outcome = await importStatementPdf(ctx, message, pdf, hint);
        if (outcome === 'locked') cardFailed = true;
      } catch (err) {
        cardFailed = true;
        ctx.result.errors.push(
          `${cardTag(ctx.card)} Could not read the statement emailed on ${formatEmailDate(message.receivedAt)}: ${err instanceof Error ? err.message : String(err)}`
        );
        logger.error(
          { err, cardId: ctx.card._id, messageId: message.messageId },
          '[CardSync] Statement import error'
        );
      }
    }
  }

  if (!cardFailed) {
    await ctx.db
      .collection(CARDS_COLLECTION)
      .updateOne({ _id: ctx.card._id }, { $set: { lastSyncAt: new Date() } });
  }
}

async function isJobCancelled(db: Db, jobId: string): Promise<boolean> {
  const jobDoc = await db.collection('syncJobs').findOne({ _id: new ObjectId(jobId) });
  return jobDoc?.status === 'cancelled';
}

function describeImportedCounts({ statementsImported, transactionsImported }: CardSyncResult) {
  const statementWord = statementsImported === 1 ? 'statement' : 'statements';
  const transactionWord = transactionsImported === 1 ? 'transaction' : 'transactions';
  return `${statementsImported} ${statementWord}, ${transactionsImported} ${transactionWord} imported`;
}

async function runCardSyncInBackground(
  jobId: string,
  userId: ObjectId,
  userDoc: WithId<Document>,
  cards: WithId<Document>[],
  integrations: WithId<Document>[],
  db: Db
) {
  const result: CardSyncResult = {
    statementsImported: 0,
    transactionsImported: 0,
    passwordsDiscovered: 0,
    errors: [],
  };
  logger.info(
    { jobId, cards: cards.length, accounts: integrations.length, hasDob: !!userDoc.dob },
    '[CardSync] Starting background sync'
  );

  try {
    const customPasswords = await loadCustomPdfPasswords(userId);

    for (const card of cards) {
      if (await isJobCancelled(db, jobId)) {
        logger.info({ jobId }, '[CardSync] Job cancelled by user, stopping early');
        return;
      }
      const plan = planCardPasswords(card, userDoc, customPasswords);
      await syncCard({ db, userId, card, plan, result }, integrations);
    }

    logger.info(
      {
        jobId,
        statements: result.statementsImported,
        transactions: result.transactionsImported,
        passwordsDiscovered: result.passwordsDiscovered,
        errorCount: result.errors.length,
      },
      '[CardSync] Sync complete'
    );

    await db
      .collection('syncJobs')
      .updateOne(
        { _id: new ObjectId(jobId) },
        { $set: { status: 'done', completedAt: new Date(), result } }
      );

    await sendPush(userId.toString(), {
      title: 'Card statements synced',
      body: describeImportedCounts(result),
      url: '/expenses?tab=cards',
      tag: 'card-sync',
    });
  } catch (err) {
    logger.error({ err }, `[cardSyncJob:${jobId}] Unhandled error`);
    await db.collection('syncJobs').updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          status: 'failed',
          completedAt: new Date(),
          error: err instanceof Error ? err.message : 'Internal error',
        },
      }
    );

    await sendPush(userId.toString(), {
      title: 'Card statement sync failed',
      body: 'The sync could not finish. Open the app to retry.',
      url: '/expenses?tab=cards',
      tag: 'card-sync',
    });
  }
}
