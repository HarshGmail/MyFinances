'use client';

import { useUserProfileQuery } from '@/api/query';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { Bot, CheckCircle2, AlertCircle, Loader2, Wallet } from 'lucide-react';

const MCP_BASE_URL = 'https://mcp.my-finances.site';
const MCP_AUTHORIZE_URL = `${MCP_BASE_URL}/oauth/authorize`;
const MCP_HEALTH_URL = `${MCP_BASE_URL}/health`;

type Status = 'loading' | 'warming' | 'connecting' | 'success' | 'error';

async function warmUpServer(): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000); // wait up to 90s for cold start
  try {
    await fetch(MCP_HEALTH_URL, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function ConnectMcpContent() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get('request_id');

  const { data: profile, isLoading, isError } = useUserProfileQuery();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!requestId) {
      setStatus('error');
      setErrorMsg('Invalid authorization request. Please try connecting again from Claude.');
      return;
    }
    if (isError) {
      setStatus('error');
      setErrorMsg('Could not load your profile. Please make sure you are logged in.');
      return;
    }
    if (!isLoading && profile) {
      if (!profile.ingestToken) {
        setStatus('error');
        setErrorMsg('No ingest token found. Please generate one on your Profile page first.');
        return;
      }

      const run = async () => {
        // Step 1: warm up the MCP server (may take ~50s on cold start)
        setStatus('warming');
        try {
          await warmUpServer();
        } catch {
          setStatus('error');
          setErrorMsg('MCP server could not be reached. Please try again in a moment.');
          return;
        }

        // Step 2: submit the ingest token
        setStatus('connecting');
        try {
          const res = await fetch(MCP_AUTHORIZE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request_id: requestId, ingest_token: profile.ingestToken }),
          });
          const data = await res.json();
          if (data.redirect_url) {
            setStatus('success');
            setTimeout(() => {
              window.location.href = data.redirect_url;
            }, 800);
          } else {
            setStatus('error');
            setErrorMsg(data.error ?? 'Authorization failed. Please try again.');
          }
        } catch {
          setStatus('error');
          setErrorMsg('Could not reach the MCP server. Please try again.');
        }
      };

      run();
    }
  }, [profile, isLoading, isError, requestId]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Connection diagram */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs text-zinc-400 font-medium">My Finances</span>
          </div>

          <div className="flex items-center gap-1 mb-4">
            <div
              className={`w-8 h-0.5 transition-colors duration-500 ${status === 'loading' ? 'bg-zinc-700' : 'bg-indigo-500'}`}
            />
            <div
              className={`w-2 h-2 rounded-full transition-colors duration-700 ${status === 'success' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : status === 'loading' ? 'bg-zinc-700' : 'bg-indigo-500'}`}
            />
            <div
              className={`w-8 h-0.5 transition-colors duration-500 ${status === 'loading' ? 'bg-zinc-700' : 'bg-indigo-500'}`}
            />
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center">
              <Bot className="w-7 h-7 text-zinc-300" />
            </div>
            <span className="text-xs text-zinc-400 font-medium">Claude</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-white mb-2">Preparing connection</h1>
              <p className="text-zinc-400 text-sm">Fetching your credentials…</p>
            </>
          )}

          {status === 'warming' && (
            <>
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-white mb-2">Waking up server</h1>
              <p className="text-zinc-400 text-sm">
                The server was sleeping — this takes about 30–60 seconds…
              </p>
            </>
          )}

          {status === 'connecting' && (
            <>
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-white mb-2">Connecting to Claude</h1>
              <p className="text-zinc-400 text-sm">Authorizing access to your finance data…</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-white mb-2">Connected!</h1>
              <p className="text-zinc-400 text-sm">Redirecting you back to Claude…</p>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-white mb-2">Connection failed</h1>
              <p className="text-zinc-400 text-sm mb-5">{errorMsg}</p>
              <div className="flex flex-col gap-2">
                {errorMsg.includes('ingest token') && (
                  <a
                    href="/profile"
                    className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
                  >
                    Go to Profile
                  </a>
                )}
                {!errorMsg.includes('logged in') && (
                  <button
                    onClick={() => window.history.back()}
                    className="w-full py-2 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
                  >
                    Go back
                  </button>
                )}
                {errorMsg.includes('logged in') && (
                  <Link
                    href="/"
                    className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors block text-center"
                  >
                    Log in
                  </Link>
                )}
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-zinc-600 mt-4">
          This grants Claude access to your expenses, stocks, and investments.
          <br />
          Revoke anytime by regenerating your ingest token on the{' '}
          <a href="/profile" className="text-zinc-500 hover:text-zinc-400 underline">
            Profile page
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export default function ConnectMcpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      }
    >
      <ConnectMcpContent />
    </Suspense>
  );
}
