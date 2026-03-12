'use client';

import { useEffect, useState } from 'react';
import { useConnect, useAccount, useDisconnect } from 'wagmi';

export function DebugWallet() {
  const [providerInfo, setProviderInfo] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const { connectors, connect, error, isPending } = useConnect();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  useEffect(() => {
    addLog('=== Wallet Debug Page Loaded ===');

    // Check window.ethereum
    const win = window as any;
    if (win.ethereum) {
      addLog('window.ethereum: FOUND');
      addLog(`  - isMetaMask: ${win.ethereum.isMetaMask}`);
      addLog(`  - isCoinbaseWallet: ${win.ethereum.isCoinbaseWallet}`);
      addLog(`  - isBraveWallet: ${win.ethereum.isBraveWallet}`);
      addLog(`  - isTrust: ${win.ethereum.isTrust}`);
      addLog(`  - providers count: ${win.ethereum.providers?.length || 'N/A'}`);
      setProviderInfo({
        isMetaMask: win.ethereum.isMetaMask,
        isCoinbaseWallet: win.ethereum.isCoinbaseWallet,
        isBraveWallet: win.ethereum.isBraveWallet,
        isTrust: win.ethereum.isTrust,
        providersCount: win.ethereum.providers?.length,
      });
    } else {
      addLog('window.ethereum: NOT FOUND - No wallet extension detected');
      setProviderInfo(null);
    }

    addLog(`Connectors available: ${connectors.length}`);
    connectors.forEach((c, i) => {
      addLog(`  Connector ${i}: ${c.name} (id: ${c.id}, type: ${c.type})`);
    });
  }, []);

  useEffect(() => {
    if (error) {
      addLog(`ERROR: ${error.name} - ${error.message}`);
      addLog(`  Error details: ${JSON.stringify({
        code: (error as any).code,
        details: (error as any).details
      })}`);
    }
  }, [error]);

  const handleConnect = async () => {
    addLog('=== Connect button clicked ===');
    const connector = connectors[0];
    if (!connector) {
      addLog('No connector available');
      return;
    }

    addLog(`Connecting to: ${connector.name} (id: ${connector.id})`);

    try {
      const result = await connect({ connector });
      addLog(`Connect result: ${JSON.stringify(result)}`);
    } catch (e: any) {
      addLog(`Connect error: ${e.name} - ${e.message}`);
      addLog(`  Stack: ${e.stack}`);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Wallet Debug</h1>

      <div className="mb-6 p-4 bg-zinc-100 dark:bg-zinc-800 rounded">
        <h2 className="font-semibold mb-2">Provider Detection</h2>
        {providerInfo ? (
          <pre className="text-sm font-mono">
            {JSON.stringify(providerInfo, null, 2)}
          </pre>
        ) : (
          <p className="text-red-500">No wallet provider detected</p>
        )}
      </div>

      <div className="mb-6 p-4 bg-zinc-100 dark:bg-zinc-800 rounded">
        <h2 className="font-semibold mb-2">Connection Status</h2>
        <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
        <p>Address: {address || 'N/A'}</p>
        <p>Chain: {chain?.name || chain?.id || 'N/A'}</p>
      </div>

      <div className="mb-6">
        <button
          onClick={handleConnect}
          disabled={!connectors.length || isPending}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isPending ? 'Connecting...' : `Connect (${connectors.length} available)`}
        </button>
        {address && (
          <button
            onClick={() => disconnect()}
            className="ml-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Disconnect
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-500 rounded">
          <h2 className="font-semibold text-red-500 mb-2">Error</h2>
          <p className="text-sm">{error.message}</p>
          <p className="text-xs font-mono mt-2">
            Code: {(error as any).code}<br/>
            Details: {(error as any).details}
          </p>
        </div>
      )}

      <div className="mb-6 p-4 bg-black text-green-400 rounded font-mono text-xs max-h-96 overflow-auto">
        <h2 className="font-semibold mb-2">Debug Logs</h2>
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}
