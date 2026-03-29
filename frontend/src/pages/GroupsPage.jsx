import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";

export default function GroupsPage() {
  const { api } = useAuth();
  const { socialContract, address } = useWeb3();
  const [groups,   setGroups]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ name: "", description: "", isPrivate: false });
  const [joining,  setJoining]  = useState({});
  const [memberOf, setMemberOf] = useState({});

  useEffect(() => {
    api.get("/api/groups").then(r => setGroups(r.data.groups || [])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!socialContract || !address || groups.length === 0) return;
    Promise.all(
      groups.map(g => socialContract.groupMember(g.groupId, address).then(v => [g.groupId, v]))
    ).then(results => {
      const map = {};
      results.forEach(([id, v]) => { map[id] = v; });
      setMemberOf(map);
    });
  }, [groups, socialContract, address]);

  const handleCreate = async () => {
    if (!form.name.trim() || !socialContract) return;
    setCreating(true);
    try {
      const { data: ipfsData } = await api.post("/api/upload/json", {
        data: { description: form.description, avatar: "", rules: [] },
      });
      const tx = await socialContract.createGroup(form.name, ipfsData.ipfsHash, form.isPrivate);
      const receipt = await tx.wait();
      const event = receipt.logs
        .map(log => { try { return socialContract.interface.parseLog(log); } catch { return null; } })
        .find(e => e?.name === "GroupCreated");
      const groupId = event ? Number(event.args.groupId) : 0;

      await api.post("/api/groups", {
        groupId, txHash: receipt.hash,
        name: form.name, description: form.description,
        isPrivate: form.isPrivate,
      });

      setForm({ name: "", description: "", isPrivate: false });
      setShowForm(false);
      const { data } = await api.get("/api/groups");
      setGroups(data.groups || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (group) => {
    if (!socialContract) return;
    setJoining(prev => ({ ...prev, [group.groupId]: true }));
    try {
      const tx = memberOf[group.groupId]
        ? await socialContract.leaveGroup(group.groupId)
        : await socialContract.joinGroup(group.groupId);
      await tx.wait();
      setMemberOf(prev => ({ ...prev, [group.groupId]: !prev[group.groupId] }));
      setGroups(prev => prev.map(g => g.groupId === group.groupId
        ? { ...g, memberCount: memberOf[group.groupId] ? g.memberCount - 1 : g.memberCount + 1 }
        : g));
    } catch (err) {
      console.error(err);
    } finally {
      setJoining(prev => ({ ...prev, [group.groupId]: false }));
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-xl text-white">Groups</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm px-4 py-2">
          + New Group
        </button>
      </div>

      {showForm && (
        <div className="card border-brand-600/40 animate-slide-up space-y-3">
          <h2 className="font-display font-semibold text-white">Create a Group</h2>
          <input
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Group name"
            className="input-field"
          />
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={2}
            className="input-field resize-none"
          />
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isPrivate}
              onChange={e => setForm(p => ({ ...p, isPrivate: e.target.checked }))}
              className="rounded"
            />
            Private group (invite only)
          </label>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating || !form.name.trim()} className="btn-primary text-sm">
              {creating ? "Creating on-chain…" : "⛓ Create Group"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card animate-pulse h-20" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-display font-semibold text-white mb-1">No groups yet</p>
          <p className="text-gray-500 text-sm">Create the first decentralized community!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => (
            <div key={group._id} className="card hover:border-dark-500 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900
                                flex items-center justify-center text-white font-display font-bold text-lg shrink-0">
                  {group.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold text-white">{group.name}</h3>
                    {group.isPrivate && <span className="tag text-xs">🔒 Private</span>}
                    {memberOf[group.groupId] && <span className="tag text-xs text-green-400 border-green-700/50">✓ Member</span>}
                  </div>
                  {group.description && (
                    <p className="text-gray-400 text-sm mt-0.5 truncate">{group.description}</p>
                  )}
                  <p className="text-gray-600 text-xs mt-1 font-mono">
                    {group.memberCount} members · on-chain #{group.groupId}
                  </p>
                </div>
                {!group.isPrivate && (
                  <button
                    onClick={() => handleJoin(group)}
                    disabled={joining[group.groupId]}
                    className={memberOf[group.groupId] ? "btn-ghost text-xs px-3 py-1.5" : "btn-primary text-xs px-3 py-1.5"}>
                    {joining[group.groupId] ? "…" : memberOf[group.groupId] ? "Leave" : "Join"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
