import { useState } from 'react';
import './WalletConnection.css';

interface WalletConnectionProps {
  onConnect: (address: string) => void;
  connectedAddress?: string;
}

export default function WalletConnection({ onConnect, connectedAddress }: WalletConnectionProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      // Check if Talisman is installed
      const { web3Accounts, web3Enable } = await import('@polkadot/extension-dapp');
      
      const extensions = await web3Enable('Universal KYC Passport');
      
      if (extensions.length === 0) {
        throw new Error('No wallet extension found. Please install Talisman.');
      }

      const accounts = await web3Accounts();
      
      if (accounts.length === 0) {
        throw new Error('No accounts found. Please create an account in your wallet.');
      }

      // Use first account
      const address = accounts[0].address;
      onConnect(address);
    } catch (error) {
      console.error('Wallet connection error:', error);
      alert(error instanceof Error ? error.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    onConnect('');
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (connectedAddress) {
    return (
      <div className="wallet-connected">
        <div className="wallet-status">
          <div className="wallet-indicator"></div>
          <span className="wallet-address">{formatAddress(connectedAddress)}</span>
        </div>
        <button onClick={disconnect} className="wallet-disconnect-btn">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connection">
      <button
        onClick={connectWallet}
        disabled={isConnecting}
        className="wallet-connect-btn"
      >
        {isConnecting ? (
          <>
            <span className="spinner-small"></span>
            Connecting...
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12v-2a5 5 0 0 0-5-5H8a5 5 0 0 0-5 5v2" />
              <path d="M3 12h18" />
              <path d="M7 12v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7" />
            </svg>
            Connect Wallet
          </>
        )}
      </button>
    </div>
  );
}

