import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";

export default function SettingsPage() {
  const { user, api, refreshUser } = useAuth();
  const { address, socialContract, tokenContract } = useWeb3();

  const [form, setForm] = useState({
    username:  user?.username  || "",
    bio:       user?.bio       || "",
    website:   user?.website   || "",
  });
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [permAddr,   setPermAddr]   = useState("");
  const [permAction, setPermAction] = useState(null);
  const [revokeAddr, setRevokeAddr] = useState("");
  const [socBalance, setSocBalance] = useState(null);
  const [tab,        setTab]        = useState("profile");

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update off-chain metadata
      await api.patch("/api/users/profile", form);
      // Upload updated profile JSON to IPFS and update on-chain
      if (socialContract) {
        const { data } = await api.post("/api/upload/json", {
          data: { ...form, updatedAt: Date.now() },
        });
        const tx = await socialContract.updateProfile(data.ipfsHash);
        await tx.wait();
      }
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleGrantPermission = async () => {
    if (!permAddr.startsWith("0x") || !socialContract) return;
    setPermAction("granting");
    try {
      const tx = await socialContract.grantDataPermission(permAddr);
      await tx.wait();
      setPermAddr("");
      alert(`✅ Data access granted to ${permAddr}`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setPermAction(null);
    }
  };

  const handleRevokePermission = async () => {
    if (!revokeAddr.startsWith("0x") || !socialContract) return;
    setPermAction("revoking");
    try {
      const tx = await socialContract.revokeDataPermission(revokeAddr);
      await tx.wait();
      setRevokeAddr("");
      alert(`✅ Data access revoked from ${revokeAddr}`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setPermAction(null);
    }
  };

  const loadSocBalance = async () => {
    if (!tokenContract || !address) return;
    const bal = await tokenContract.balanceOf(address);
    setSocBalance((Number(bal) / 1e18).toFixed(4));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="font-display font-bold text-xl text-white">Settings</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-dark-700 rounded-xl p-1">
        {[
          { key: "profile",  label: "👤 Profile" },
          { key: "privacy",  label: "🔒 Privacy" },
          { key: "wallet",   label: "💰 Wallet" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-display font-medium transition-all
                        ${tab === t.key ? "bg-dark-500 text-white" : "text-gray-500 hover:text-gray-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === "profile" && (
        <div className="card space-y-4 animate-fade-in">
          <h2 className="font-display font-semibold text-white">Profile Settings</h2>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Username</label>
            <input
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              className="input-field"
              placeholder="your_username"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Bio</label>
            <textarea
              value={form.bio}
              onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              className="input-field resize-none"
              rows={3}
              placeholder="Tell the world about yourself…"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Website</label>
            <input
              value={form.website}
              onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
              className="input-field"
              placeholder="https://yoursite.com"
            />
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
            {saving ? "Saving on-chain…" : saved ? "✓ Saved!" : "Save Changes"}
          </button>
          {saved && <p className="text-green-400 text-xs">Profile updated on Ethereum + IPFS</p>}
        </div>
      )}

      {/* Privacy tab */}
      {tab === "privacy" && (
        <div className="space-y-4 animate-fade-in">
          <div className="card">
            <h2 className="font-display font-semibold text-white mb-1">Data Permissions</h2>
            <p className="text-gray-400 text-sm mb-4">
              Control which addresses can access your data. Permissions are stored on-chain.
            </p>

            <div className="space-y-2 mb-4">
              <label className="text-xs text-gray-500">Grant access to address</label>
              <div className="flex gap-2">
                <input
                  value={permAddr}
                  onChange={e => setPermAddr(e.target.value)}
                  placeholder="0x…"
                  className="input-field flex-1 text-sm"
                />
                <button onClick={handleGrantPermission} disabled={!!permAction} className="btn-primary text-sm px-4">
                  {permAction === "granting" ? "…" : "Grant"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-500">Revoke access from address</label>
              <div className="flex gap-2">
                <input
                  value={revokeAddr}
                  onChange={e => setRevokeAddr(e.target.value)}
                  placeholder="0x…"
                  className="input-field flex-1 text-sm"
                />
                <button onClick={handleRevokePermission} disabled={!!permAction}
                  className="btn-ghost text-sm px-4 border-red-800/40 hover:border-red-600 hover:text-red-400">
                  {permAction === "revoking" ? "…" : "Revoke"}
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="font-display font-semibold text-white mb-2">Privacy Info</h2>
            <ul className="space-y-2 text-sm text-gray-400">
              {[
                "Your posts are stored as IPFS hashes on Ethereum — permanent and immutable.",
                "Direct messages are end-to-end encrypted before leaving your browser.",
                "Your wallet address is your identity — no name or email required.",
                "You can delete posts (soft delete on-chain), but the IPFS content may remain.",
                "Anonymous mode: don't set a username to appear as your wallet address only.",
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-brand-400 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Wallet tab */}
      {tab === "wallet" && (
        <div className="space-y-4 animate-fade-in">
          <div className="card">
            <h2 className="font-display font-semibold text-white mb-3">Wallet</h2>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center font-mono text-xs text-gray-400">
                {address?.slice(2,4).toUpperCase()}
              </div>
              <div>
                <p className="text-white text-sm font-mono">{address}</p>
                <p className="text-gray-500 text-xs">Connected wallet</p>
              </div>
            </div>

            <div className="bg-dark-700 border border-dark-500 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs mb-1">SOC Token Balance</p>
                <p className="font-display font-bold text-2xl text-white">
                  {socBalance !== null ? `${socBalance} SOC` : "—"}
                </p>
              </div>
              <button onClick={loadSocBalance} className="btn-ghost text-xs px-3 py-1.5">Refresh</button>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs text-gray-500 font-display font-medium">How to earn SOC tokens</p>
              <ul className="space-y-1.5 text-sm text-gray-400">
                <li className="flex gap-2"><span className="text-brand-400">+1</span> For each like your post receives</li>
                <li className="flex gap-2"><span className="text-brand-400">+5</span> For your first post each day</li>
                <li className="flex gap-2"><span className="text-brand-400">+10</span> For receiving a tip from another user</li>
              </ul>
            </div>
          </div>

          <div className="card">
            <h2 className="font-display font-semibold text-white mb-2">Contract Addresses</h2>
            <div className="space-y-2 font-mono text-xs">
              <div>
                <p className="text-gray-500">SocioChain (Social)</p>
                <p className="text-gray-300 break-all">{import.meta.env.VITE_CONTRACT_SOCIAL || "Not configured"}</p>
              </div>
              <div>
                <p className="text-gray-500">SocToken (SOC)</p>
                <p className="text-gray-300 break-all">{import.meta.env.VITE_CONTRACT_TOKEN || "Not configured"}</p>
              </div>
              <div>
                <p className="text-gray-500">Network Chain ID</p>
                <p className="text-gray-300">{import.meta.env.VITE_CHAIN_ID || "31337"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
