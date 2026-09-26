const INVITE_CODE_PREFIX = 'MFW1';
const INVITE_CODE_SEPARATOR = '.';
const BASE64URL_SEGMENT = '[A-Za-z0-9_-]+';

const CODE_PATTERN = new RegExp(
  `${INVITE_CODE_PREFIX}\\.(${BASE64URL_SEGMENT})\\.(${BASE64URL_SEGMENT})`
);
const LINK_PATTERN = new RegExp(
  `/vault/join/(${BASE64URL_SEGMENT})(?:\\?[^#\\s]*)?#k=(${BASE64URL_SEGMENT})`
);
const LINK_WITHOUT_KEY_PATTERN = new RegExp(`/vault/join/(${BASE64URL_SEGMENT})`);

export interface WalletInviteParts {
  token: string;
  key: string;
}

export class InviteKeyMissingError extends Error {
  constructor() {
    super('That link is missing its key');
    this.name = 'InviteKeyMissingError';
  }
}

export function buildInviteCode({ token, key }: WalletInviteParts): string {
  return [INVITE_CODE_PREFIX, token, key].join(INVITE_CODE_SEPARATOR);
}

export function buildInviteLink(origin: string, { token, key }: WalletInviteParts): string {
  return `${origin}/vault/join/${token}#k=${key}`;
}

export function parseWalletInvite(input: string): WalletInviteParts {
  const trimmed = input.trim();

  const codeMatch = CODE_PATTERN.exec(trimmed);
  if (codeMatch) return { token: codeMatch[1], key: codeMatch[2] };

  const linkMatch = LINK_PATTERN.exec(trimmed);
  if (linkMatch) return { token: linkMatch[1], key: linkMatch[2] };

  if (LINK_WITHOUT_KEY_PATTERN.test(trimmed)) throw new InviteKeyMissingError();

  throw new Error('That does not look like a wallet invite');
}
