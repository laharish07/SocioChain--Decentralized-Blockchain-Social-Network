import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import SocioChainABI from "../abi/SocioChain.json";
import SocTokenABI  from "../abi/SocToken.json";

const Web3Context = createContext(null);

const SOCIAL_CONTRACT = import.meta.env.VITE_CONTRACT_SOCIAL;
const TOKEN_CONTRACT  = import.meta.env.VITE_CONTRACT_TOKEN;
const TARGET_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 31337);

export function Web3Provider({ children }) {
  const [provider,       setProvider]       = useState(null);
  const [signer,         setSigner]         = useState(null);
  const [address,        setAddress]        = useState(null);
  const [chainId,        setChainId]        = useState(null);
  const [socialContract, setSocialContract] = useState(null);
  const [tokenContract,  setTokenContract]  = useState(null);
  const [connecting,     setConnecting]     = useState(false);
  const [error,          setError]          = useState(null);

  const isConnected   = !!address;
  const wrongNetwork  = isConnected && chainId !== TARGET_CHAIN_ID;

  const initContracts = useCallback((_signer) => {
    if (!SOCIAL_CONTRACT || !TOKEN_CONTRACT) return;
    setSocialContract(new ethers.Contract(SOCIAL_CONTRACT, SocioChainABI.abi, _signer));
    setTokenContract(new ethers.Contract(TOKEN_CONTRACT, SocTokenABI.abi,  _signer));
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask not found — please install it from metamask.io");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const _provider = new ethers.BrowserProvider(window.ethereum);
      await _provider.send("eth_requestAccounts", []);
      const _signer  = await _provider.getSigner();
      const _address = await _signer.getAddress();
      const network  = await _provider.getNetwork();

      setProvider(_provider);
      setSigner(_signer);
      setAddress(_address.toLowerCase());
      setChainId(Number(network.chainId));
      initContracts(_signer);
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  }, [initContracts]);

  const disconnect = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
    setSocialContract(null);
    setTokenContract(null);
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) disconnect();
      else { setAddress(accounts[0].toLowerCase()); connect(); }
    };
    const handleChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged",    handleChainChanged);

    // Auto-reconnect if already connected
    window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
      if (accounts.length > 0) connect();
    });

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged",    handleChainChanged);
    };
  }, [connect, disconnect]);

  const switchNetwork = useCallback(async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${TARGET_CHAIN_ID.toString(16)}` }],
      });
    } catch (err) {
      if (err.code === 4902) {
        // Add local hardhat network
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: `0x${TARGET_CHAIN_ID.toString(16)}`,
            chainName: "Hardhat Local",
            rpcUrls: ["http://127.0.0.1:8545"],
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          }],
        });
      }
    }
  }, []);

  const signMessage = useCallback(async (message) => {
    if (!signer) throw new Error("Not connected");
    return signer.signMessage(message);
  }, [signer]);

  return (
    <Web3Context.Provider value={{
      provider, signer, address, chainId,
      socialContract, tokenContract,
      isConnected, wrongNetwork,
      connecting, error,
      connect, disconnect, switchNetwork, signMessage,
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export const useWeb3 = () => {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 must be inside Web3Provider");
  return ctx;
};
