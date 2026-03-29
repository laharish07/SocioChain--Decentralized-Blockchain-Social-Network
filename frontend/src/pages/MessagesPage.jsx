import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import { io } from "socket.io-client";
import { Avatar } from "../components/Layout";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Simple XOR encryption for demo (use proper E2E with libsodium in production)
function encryptMessage(text, key) {
  return btoa(text.split("").map((c, i) =>
    String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
  ).join(""));
}
function decryptMessage(encoded, key) {
  try {
    return atob(encoded).split("").map((c, i) =>
      String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join("");
  } catch { return "[encrypted message]"; }
}

export default function MessagesPage() {
  const { address: paramAddress } = useParams();
  const { token, user, api } = useAuth();
  const { address } = useWeb3();
  const navigate = useNavigate();

  const [conversations, setConversations]  = useState([]);
  const [messages,      setMessages]       = useState([]);
  const [activeConvo,   setActiveConvo]    = useState(paramAddress || null);
  const [newMsg,        setNewMsg]         = useState("");
  const [sending,       setSending]        = useState(false);
  const [typing,        setTyping]         = useState(false);
  const [newConvoAddr,  setNewConvoAddr]   = useState("");
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  // Encryption key derived from both addresses (demo only — use asymmetric in prod)
  const encKey = [address, activeConvo].sort().join("").slice(0, 32);

  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on("new_message", (msg) => {
      if (
        (msg.fromAddress === activeConvo && msg.toAddress === address) ||
        (msg.fromAddress === address && msg.toAddress === activeConvo)
      ) {
        setMessages(prev => [...prev, msg]);
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
      loadConversations();
    });

    socket.on("user_typing", ({ address: a }) => {
      if (a === activeConvo) setTyping(true);
    });
    socket.on("user_stop_typing", () => setTyping(false));

    return () => socket.disconnect();
  }, [token, address, activeConvo]);

  useEffect(() => {
    if (activeConvo && socketRef.current) {
      socketRef.current.emit("join_conversation", { otherAddress: activeConvo });
    }
  }, [activeConvo]);

  const loadConversations = async () => {
    try {
      const { data } = await api.get("/api/messages/conversations");
      setConversations(data.conversations || []);
    } catch {}
  };

  const loadMessages = async (addr) => {
    try {
      const { data } = await api.get(`/api/messages/${addr}`);
      setMessages(data.messages || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {}
  };

  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    if (activeConvo) loadMessages(activeConvo);
  }, [activeConvo]);

  useEffect(() => {
    if (paramAddress) setActiveConvo(paramAddress);
  }, [paramAddress]);

  const handleSend = async () => {
    if (!newMsg.trim() || !activeConvo) return;
    setSending(true);
    try {
      const encrypted = encryptMessage(newMsg.trim(), encKey);
      await api.post("/api/messages", {
        toAddress: activeConvo,
        encryptedContent: encrypted,
      });
      setMessages(prev => [...prev, {
        fromAddress: address,
        toAddress:   activeConvo,
        encryptedContent: encrypted,
        createdAt:   new Date(),
        _local: true,
      }]);
      setNewMsg("");
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (socketRef.current && activeConvo) {
      socketRef.current.emit("typing", { toAddress: activeConvo });
      clearTimeout(window._typingTimer);
      window._typingTimer = setTimeout(() => {
        socketRef.current?.emit("stop_typing", { toAddress: activeConvo });
      }, 1500);
    }
  };

  const shortAddr = (a) => a ? `${a.slice(0,6)}…${a.slice(-4)}` : "";

  return (
    <div className="animate-fade-in">
      <h1 className="font-display font-bold text-xl text-white mb-4">Messages</h1>

      <div className="flex gap-4 h-[calc(100vh-160px)] min-h-[500px]">
        {/* Conversation list */}
        <div className="w-64 shrink-0 flex flex-col gap-2 overflow-y-auto">
          {/* New conversation input */}
          <div className="card p-3 space-y-2">
            <p className="text-xs text-gray-500 font-display font-medium">New conversation</p>
            <input
              value={newConvoAddr}
              onChange={e => setNewConvoAddr(e.target.value)}
              placeholder="0x address…"
              className="input-field text-xs py-2"
            />
            <button
              onClick={() => {
                if (newConvoAddr.startsWith("0x")) {
                  setActiveConvo(newConvoAddr.toLowerCase());
                  navigate(`/messages/${newConvoAddr.toLowerCase()}`);
                  setNewConvoAddr("");
                }
              }}
              className="btn-primary text-xs py-2 w-full">
              Start Chat
            </button>
          </div>

          {conversations.map((c, i) => {
            const other = c.lastMessage?.fromAddress === address
              ? c.lastMessage?.toAddress
              : c.lastMessage?.fromAddress;
            const isActive = activeConvo === other;
            return (
              <button key={i}
                onClick={() => { setActiveConvo(other); navigate(`/messages/${other}`); }}
                className={`card p-3 text-left hover:border-brand-600/50 transition-all
                            ${isActive ? "border-brand-600/60 bg-brand-900/10" : ""}`}>
                <div className="flex items-center gap-2">
                  <Avatar address={other} size="w-8 h-8" className="text-xs shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white text-xs font-display font-medium">{shortAddr(other)}</p>
                    <p className="text-gray-500 text-xs truncate">🔒 Encrypted</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Chat window */}
        <div className="flex-1 flex flex-col card p-0 overflow-hidden">
          {activeConvo ? (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-dark-600 flex items-center gap-3 glass">
                <Avatar address={activeConvo} size="w-8 h-8" className="text-xs" />
                <div>
                  <p className="text-white text-sm font-display font-medium">{shortAddr(activeConvo)}</p>
                  <p className="text-green-400 text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    End-to-end encrypted
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => {
                  const isMe = msg.fromAddress === address || msg._local;
                  const text = decryptMessage(msg.encryptedContent, encKey);
                  return (
                    <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${
                        isMe
                          ? "bg-brand-600 text-white rounded-br-sm"
                          : "bg-dark-700 text-gray-200 rounded-bl-sm border border-dark-500"
                      }`}>
                        <p className="leading-relaxed">{text}</p>
                        <p className={`text-xs mt-1 ${isMe ? "text-brand-200" : "text-gray-500"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {typing && (
                  <div className="flex justify-start">
                    <div className="bg-dark-700 border border-dark-500 rounded-2xl rounded-bl-sm px-4 py-2.5">
                      <div className="flex gap-1 items-center h-4">
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-dark-600 flex gap-2">
                <input
                  value={newMsg}
                  onChange={e => { setNewMsg(e.target.value); handleTyping(); }}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Send encrypted message…"
                  className="input-field flex-1 text-sm py-2.5"
                />
                <button onClick={handleSend} disabled={sending || !newMsg.trim()} className="btn-primary text-sm px-4 py-2.5">
                  {sending ? "…" : "Send"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl mb-3">💬</p>
                <p className="font-display font-semibold text-white mb-1">Select a conversation</p>
                <p className="text-gray-500 text-sm">Messages are end-to-end encrypted.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
