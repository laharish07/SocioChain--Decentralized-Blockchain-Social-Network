import { useWeb3 } from "../context/Web3Context";
import { useAuth } from "../context/AuthContext";

export default function LandingPage() {
  const { isConnected, connect, connecting, error: web3Error, wrongNetwork, switchNetwork } = useWeb3();
  const { login, authLoading, authError } = useAuth();

  const features = [
    { icon: "🔗", title: "Blockchain-Backed",   desc: "Posts stored as IPFS hashes on Ethereum — censorship-resistant and permanent." },
    { icon: "🔐", title: "Wallet Auth",          desc: "No email, no password. Sign in with MetaMask using cryptographic signatures." },
    { icon: "🗂️", title: "You Own Your Data",   desc: "Grant and revoke data access permissions on-chain. Your data, your rules." },
    { icon: "💰", title: "Earn SOC Tokens",      desc: "Get rewarded with governance tokens for quality content and engagement." },
    { icon: "🛡️", title: "DAO Moderation",       desc: "Community-led content moderation via on-chain voting. No central authority." },
    { icon: "🌐", title: "IPFS Storage",          desc: "Media stored on IPFS — decentralized, fast, and tamper-proof." },
  ];

  return (
    <div className="min-h-screen mesh-bg">
      {/* Header */}
      <header className="glass border-b border-dark-600 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold font-display text-sm">DS</div>
            <span className="font-display font-bold text-lg gradient-text">SocioChain</span>
          </div>
          <span className="text-xs font-mono text-gray-500 border border-dark-600 px-3 py-1 rounded-full">
            Ethereum · IPFS · DAO
          </span>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6">
        <div className="text-center pt-24 pb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-brand-900/30 border border-brand-700/40 rounded-full px-4 py-1.5 text-xs font-mono text-brand-300 mb-8">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Deployed on Ethereum Testnet
          </div>

          <h1 className="font-display font-bold text-5xl md:text-7xl leading-tight mb-6">
            Social Media{" "}
            <span className="gradient-text">Without</span>
            <br />
            the Middleman
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            A fully decentralized social network built on Ethereum. Your data lives on IPFS,
            your identity is your wallet, and governance is on-chain.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!isConnected ? (
              <button onClick={connect} disabled={connecting} className="btn-primary text-base px-8 py-3 glow-brand">
                {connecting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting…
                  </span>
                ) : "🦊 Connect MetaMask"}
              </button>
            ) : wrongNetwork ? (
              <button onClick={switchNetwork} className="btn-primary text-base px-8 py-3 bg-amber-600 hover:bg-amber-500">
                ⚠️ Switch to Hardhat Network
              </button>
            ) : (
              <button onClick={login} disabled={authLoading} className="btn-primary text-base px-8 py-3 glow-brand">
                {authLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing message…
                  </span>
                ) : "✍️ Sign In with Wallet"}
              </button>
            )}
            <a href="https://github.com" className="btn-ghost text-base px-8 py-3">View Source ↗</a>
          </div>

          {(web3Error || authError) && (
            <p className="mt-4 text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-2 inline-block">
              ⚠ {web3Error || authError}
            </p>
          )}

          {isConnected && !wrongNetwork && (
            <p className="mt-4 text-green-400 text-xs font-mono">
              ✓ Connected: wallet detected — click "Sign In" to authenticate
            </p>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-5 pb-24 animate-slide-up">
          {features.map((f) => (
            <div key={f.title} className="card hover:border-brand-600/50 transition-all duration-300 group">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-display font-semibold text-white mb-2 group-hover:text-brand-300 transition-colors">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Tech stack */}
        <div className="border-t border-dark-600 py-10 text-center">
          <p className="text-gray-600 text-xs font-mono mb-4">BUILT WITH</p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-gray-500 text-sm">
            {["Ethereum", "Solidity", "Hardhat", "IPFS", "React", "ethers.js", "Node.js", "MongoDB"].map(t => (
              <span key={t} className="font-mono">{t}</span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
