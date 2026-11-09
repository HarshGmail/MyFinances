export const INSTALL_READY_EVENT = 'myfinance-install-ready';
export const CAPTURED_PROMPT_KEY = '__myFinanceInstallPrompt' as const;

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type InstallWindow = Window & { [CAPTURED_PROMPT_KEY]?: InstallPromptEvent };

export const INSTALL_CAPTURE_SCRIPT = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.${CAPTURED_PROMPT_KEY}=e;window.dispatchEvent(new Event("${INSTALL_READY_EVENT}"))});`;

export function getCapturedInstallPrompt(): InstallPromptEvent | undefined {
  return (window as InstallWindow)[CAPTURED_PROMPT_KEY];
}

export function clearCapturedInstallPrompt(): void {
  (window as InstallWindow)[CAPTURED_PROMPT_KEY] = undefined;
}
