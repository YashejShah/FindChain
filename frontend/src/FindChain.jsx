import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, MapPin, Shield, Zap, ChevronRight, Plus, Eye, MessageCircle,
  Bell, User, Home, BarChart3, Award, AlertTriangle, CheckCircle2,
  XCircle, Clock, ArrowRight, Star, TrendingUp, Package, Smartphone,
  Key, Briefcase, FileText, Gem, Dog, Umbrella, Camera, Upload,
  X, Send, ChevronDown, ExternalLink, QrCode, Globe, Lock, Cpu,
  Layers, ArrowUpRight, Menu, Sun, Moon, LogOut, Settings, Filter,
  RefreshCw, ThumbsUp, ThumbsDown, Hash, Wallet, CircleDot
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ethers } from "ethers";
import CONTRACT_ABI from "./contractABI.json";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// ============ HARDHAT TEST ACCOUNTS ============
const ACCOUNTS = {
  owner:   "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",  // Deployer / Admin
  alice:   "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",  // Lost item reporter
  bob:     "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",  // Finder
  charlie: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",  // Community voter
};

// ============ MOCK DATA (with real Hardhat addresses + transaction history) ============
const MOCK_ITEMS = [
  // Resolved: Alice lost iPhone → Bob found it → 92% AI match → Confirmed → 0.49 ETH paid to Bob
  { id: 1, type: "lost", title: "iPhone 15 Pro Max", category: "electronics", description: "Space Black iPhone 15 Pro Max with cracked screen protector, blue Spigen case", location: "Bennett University, Greater Noida", lat: 28.4505, lng: 77.5840, reward: "0.5", status: "resolved", reporter: "0x7099...79C8", reporterName: "Alice", image: "📱", timestamp: Date.now() - 86400000 * 3, similarity: 92 },
  { id: 2, type: "found", title: "Black Smartphone with Blue Case", category: "electronics", description: "Found black smartphone near library entrance, has a blue Spigen case", location: "Bennett Library, Greater Noida", lat: 28.4510, lng: 77.5830, reward: "0", status: "resolved", reporter: "0x3C44...0aa3", reporterName: "Bob", image: "📱", timestamp: Date.now() - 86400000 * 2, similarity: 92 },
  // Resolved: Alice lost wallet → Charlie found it → 87% AI match → Confirmed → 0.245 ETH paid
  { id: 3, type: "lost", title: "Louis Vuitton Wallet", category: "bags", description: "Brown Damier Ebene canvas wallet with initials 'YJ' embossed", location: "Pari Chowk, Greater Noida", lat: 28.4675, lng: 77.5040, reward: "0.25", status: "resolved", reporter: "0x7099...79C8", reporterName: "Alice", image: "👛", timestamp: Date.now() - 86400000 * 7, similarity: 87 },
  { id: 4, type: "found", title: "Brown Designer Wallet", category: "bags", description: "Louis Vuitton style wallet found in auto rickshaw, has initials embossed", location: "Knowledge Park III, Greater Noida", lat: 28.4720, lng: 77.5100, reward: "0", status: "resolved", reporter: "0x90F7...9906", reporterName: "Charlie", image: "👛", timestamp: Date.now() - 86400000 * 6, similarity: 87 },
  // Active: Alice's dog is missing
  { id: 5, type: "lost", title: "Golden Retriever - Max", category: "pets", description: "Male golden retriever, 3yo, red collar with bone tag, very friendly, last seen near park", location: "Surajpur Wetlands, Greater Noida", lat: 28.4870, lng: 77.5230, reward: "0.5", status: "active", reporter: "0x7099...79C8", reporterName: "Alice", image: "🐕", timestamp: Date.now() - 3600000 * 6, similarity: 0 },
  // Disputed: Alice lost MacBook → Charlie found laptop → 75% match → Alice disputed
  { id: 6, type: "lost", title: "MacBook Pro 16\"", category: "electronics", description: "Space Gray M3 MacBook Pro, has a 'Hello World' sticker on lid", location: "Starbucks, GIP Mall, Noida", lat: 28.5672, lng: 77.3218, reward: "1.0", status: "disputed", reporter: "0x7099...79C8", reporterName: "Alice", image: "💻", timestamp: Date.now() - 3600000 * 12, similarity: 75 },
  { id: 7, type: "found", title: "Silver Laptop", category: "electronics", description: "Found a silver laptop left at a cafe table, no stickers visible", location: "Cafe near Sector 18, Noida", lat: 28.5700, lng: 77.3250, reward: "0", status: "disputed", reporter: "0x90F7...9906", reporterName: "Charlie", image: "💻", timestamp: Date.now() - 3600000 * 10, similarity: 75 },
  // Active: Bob found keys
  { id: 8, type: "found", title: "Car Keys with BMW Fob", category: "keys", description: "BMW key fob with house key and gym card attached, found on bench", location: "Alpha 1 Market, Greater Noida", lat: 28.4745, lng: 77.5040, reward: "0", status: "active", reporter: "0x3C44...0aa3", reporterName: "Bob", image: "🔑", timestamp: Date.now() - 3600000 * 3, similarity: 0 },
  // Active: Bob found passport
  { id: 9, type: "found", title: "Indian Passport", category: "documents", description: "Indian passport found near check-in counter, blue cover", location: "IGI Airport Terminal 3, Delhi", lat: 28.5562, lng: 77.1000, reward: "0", status: "active", reporter: "0x3C44...0aa3", reporterName: "Bob", image: "📄", timestamp: Date.now() - 86400000 * 1, similarity: 0 },
  // Matched: AirPods matched with Bob's find → 88% AI match → pending confirmation
  { id: 10, type: "lost", title: "AirPods Pro 2nd Gen", category: "electronics", description: "White AirPods Pro with custom engraving 'YJ' on case", location: "Metro Station, Botanical Garden", lat: 28.5644, lng: 77.3340, reward: "0.15", status: "matched", reporter: "0xf39F...2266", reporterName: "Admin", image: "🎧", timestamp: Date.now() - 3600000 * 8, similarity: 88 },
  { id: 11, type: "found", title: "White Earbuds Case", category: "electronics", description: "Found white Apple AirPods case near platform, has engraving", location: "Noida Sector 52 Metro", lat: 28.5750, lng: 77.3390, reward: "0", status: "matched", reporter: "0x3C44...0aa3", reporterName: "Bob", image: "🎧", timestamp: Date.now() - 3600000 * 5, similarity: 88 },
];

const MOCK_MATCHES = [
  // Resolved matches with reward payouts
  { id: 1, lostId: 1, foundId: 2, score: 92, status: "confirmed", timestamp: Date.now() - 86400000 * 2 },
  { id: 2, lostId: 3, foundId: 4, score: 87, status: "confirmed", timestamp: Date.now() - 86400000 * 5 },
  // Pending match
  { id: 3, lostId: 10, foundId: 11, score: 88, status: "pending", timestamp: Date.now() - 3600000 * 4 },
  // Disputed match
  { id: 4, lostId: 6, foundId: 7, score: 75, status: "disputed", timestamp: Date.now() - 3600000 * 8 },
];

const MOCK_USER = {
  address: ACCOUNTS.alice,
  name: "Alice",
  reputation: 550,
  itemsReported: 5,
  itemsResolved: 2,
  successfulReturns: 0,
  rewardsEarned: "0",
  rewardsPosted: "2.25",
  joinedDaysAgo: 14,
};

const ANALYTICS_DATA = {
  monthly: [
    { month: "Sep", lost: 45, found: 38, resolved: 28 },
    { month: "Oct", lost: 62, found: 55, resolved: 41 },
    { month: "Nov", lost: 78, found: 70, resolved: 56 },
    { month: "Dec", lost: 95, found: 88, resolved: 72 },
    { month: "Jan", lost: 110, found: 102, resolved: 89 },
    { month: "Feb", lost: 130, found: 125, resolved: 108 },
  ],
  categories: [
    { name: "Electronics", value: 35, color: "#00f0ff" },
    { name: "Documents", value: 20, color: "#f59e0b" },
    { name: "Bags", value: 18, color: "#8b5cf6" },
    { name: "Keys", value: 12, color: "#10b981" },
    { name: "Pets", value: 8, color: "#ef4444" },
    { name: "Other", value: 7, color: "#6b7280" },
  ],
  resolutionRate: [
    { day: "Mon", rate: 72 }, { day: "Tue", rate: 78 }, { day: "Wed", rate: 65 },
    { day: "Thu", rate: 82 }, { day: "Fri", rate: 88 }, { day: "Sat", rate: 91 }, { day: "Sun", rate: 85 },
  ],
};

const CATEGORY_ICONS = {
  electronics: Smartphone, documents: FileText, jewelry: Gem, bags: Briefcase,
  clothing: Package, keys: Key, pets: Dog, personal: Umbrella, all: Package,
};

const MOCK_MESSAGES = [
  { id: 1, sender: "finder", text: "Hi! I found what I believe is your iPhone near Bethesda Fountain.", time: "2:30 PM" },
  { id: 2, sender: "owner", text: "Oh that's great! Can you describe the case color?", time: "2:32 PM" },
  { id: 3, sender: "finder", text: "It's a blue Spigen case, and there's a cracked screen protector on it.", time: "2:33 PM" },
  { id: 4, sender: "owner", text: "That's definitely mine! Where can we meet?", time: "2:35 PM" },
];

const NOTIFICATIONS = [
  { id: 1, type: "match", title: "AirPods Match Found!", desc: "Your AirPods Pro have an 88% AI match with Bob's find", time: "4h ago", read: false },
  { id: 2, type: "reward", title: "Reward Paid — iPhone 15", desc: "0.49 ETH released to Bob (0x3C44...0aa3) for iPhone return", time: "2d ago", read: false },
  { id: 3, type: "reward", title: "Reward Paid — Wallet", desc: "0.245 ETH released to Charlie (0x90F7...9906) for wallet return", time: "5d ago", read: true },
  { id: 4, type: "dispute", title: "MacBook Dispute Open", desc: "You disputed the MacBook match — community voting in progress", time: "10h ago", read: false },
  { id: 5, type: "reputation", title: "Reputation +200", desc: "Two successful item returns verified on-chain", time: "5d ago", read: true },
];

// ============ MAIN APP ============
export default function FindChainApp() {
  const [page, setPage] = useState("home");
  const [theme, setTheme] = useState("dark");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [matchFilter, setMatchFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [animateIn, setAnimateIn] = useState(false);

  const getContract = async (needsSigner = false) => {
    if (typeof window.ethereum === "undefined") throw new Error("MetaMask not installed");
    const provider = new ethers.BrowserProvider(window.ethereum);
    if (needsSigner) {
      const signer = await provider.getSigner();
      return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    }
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  };

  const connectWallet = async () => {
    if (isConnected) { setIsConnected(false); setWalletAddress(""); return; }
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
          // Auto-register if not registered
          try {
            const contract = await getContract(true);
            const profile = await contract.getUserProfile(accounts[0]);
            if (!profile.isRegistered) {
              const tx = await contract.registerUser();
              await tx.wait();
            }
          } catch (regErr) {
            // Ignore if already registered or contract not deployed
            console.log("Registration check:", regErr.message);
          }
        }
      } catch (err) { alert("Wallet connection rejected"); }
    } else {
      alert("MetaMask not detected. Please install MetaMask to connect your wallet.");
    }
  };

  useEffect(() => {
    setAnimateIn(false);
    const t = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(t);
  }, [page]);

  const isDark = theme === "dark";
  const accent = "#00f0ff";
  const accent2 = "#f59e0b";

  const bg = isDark ? "#06060f" : "#f8f9fc";
  const cardBg = isDark ? "rgba(15, 15, 30, 0.8)" : "rgba(255,255,255,0.9)";
  const cardBorder = isDark ? "rgba(0, 240, 255, 0.1)" : "rgba(0,0,0,0.08)";
  const textPrimary = isDark ? "#e8eaed" : "#1a1a2e";
  const textSecondary = isDark ? "#8892a4" : "#666680";
  const surfaceHover = isDark ? "rgba(0, 240, 255, 0.05)" : "rgba(0,0,0,0.03)";

  const filteredItems = MOCK_ITEMS.filter(item => {
    if (matchFilter !== "all" && item.type !== matchFilter) return false;
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const styles = {
    app: {
      minHeight: "100vh",
      background: isDark
        ? `radial-gradient(ellipse at 20% 0%, rgba(0,240,255,0.03) 0%, transparent 50%),
           radial-gradient(ellipse at 80% 100%, rgba(245,158,11,0.02) 0%, transparent 50%),
           ${bg}`
        : bg,
      color: textPrimary,
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      position: "relative",
      overflow: "hidden",
    },
    gridBg: {
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: "none",
      backgroundImage: isDark
        ? `linear-gradient(rgba(0,240,255,0.02) 1px, transparent 1px),
           linear-gradient(90deg, rgba(0,240,255,0.02) 1px, transparent 1px)`
        : "none",
      backgroundSize: "60px 60px",
    },
    nav: {
      position: "sticky", top: 0, zIndex: 50,
      backdropFilter: "blur(20px) saturate(180%)",
      background: isDark ? "rgba(6,6,15,0.85)" : "rgba(248,249,252,0.9)",
      borderBottom: `1px solid ${cardBorder}`,
      padding: "0 24px",
    },
    navInner: {
      maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center",
      justifyContent: "space-between", height: 64,
    },
    logo: {
      display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
      fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px",
    },
    logoIcon: {
      width: 36, height: 36, borderRadius: 10,
      background: `linear-gradient(135deg, ${accent}, ${accent2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: `0 0 20px ${accent}40`,
    },
    navLinks: {
      display: "flex", gap: 4, alignItems: "center",
    },
    navLink: (active) => ({
      padding: "8px 16px", borderRadius: 10, cursor: "pointer",
      fontSize: 14, fontWeight: active ? 600 : 400,
      color: active ? accent : textSecondary,
      background: active ? (isDark ? "rgba(0,240,255,0.08)" : "rgba(0,200,255,0.08)") : "transparent",
      transition: "all 0.2s ease",
      display: "flex", alignItems: "center", gap: 6,
      border: "none", outline: "none",
    }),
    section: {
      maxWidth: 1280, margin: "0 auto", padding: "32px 24px",
      position: "relative", zIndex: 1,
      opacity: animateIn ? 1 : 0,
      transform: animateIn ? "translateY(0)" : "translateY(12px)",
      transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
    },
    card: {
      background: cardBg, backdropFilter: "blur(16px)",
      border: `1px solid ${cardBorder}`, borderRadius: 16,
      padding: 24, transition: "all 0.25s ease",
    },
    cardHover: {
      borderColor: isDark ? "rgba(0,240,255,0.25)" : "rgba(0,200,255,0.3)",
      boxShadow: isDark ? `0 8px 32px rgba(0,240,255,0.08)` : `0 8px 32px rgba(0,0,0,0.08)`,
      transform: "translateY(-2px)",
    },
    badge: (color) => ({
      padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: `${color}18`, color: color, letterSpacing: "0.3px",
      textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 4,
    }),
    btn: (primary) => ({
      padding: primary ? "12px 28px" : "10px 20px",
      borderRadius: 12, cursor: "pointer", border: "none",
      fontWeight: 600, fontSize: primary ? 15 : 13,
      background: primary
        ? `linear-gradient(135deg, ${accent}, #0088aa)`
        : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
      color: primary ? "#000" : textPrimary,
      display: "inline-flex", alignItems: "center", gap: 8,
      transition: "all 0.2s ease",
      boxShadow: primary ? `0 4px 20px ${accent}30` : "none",
    }),
    input: {
      width: "100%", padding: "12px 16px", borderRadius: 12,
      border: `1px solid ${cardBorder}`, outline: "none",
      background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
      color: textPrimary, fontSize: 14, transition: "border-color 0.2s",
      fontFamily: "inherit",
    },
    statCard: {
      background: cardBg, backdropFilter: "blur(16px)",
      border: `1px solid ${cardBorder}`, borderRadius: 16,
      padding: "20px 24px", flex: 1, minWidth: 200,
    },
    heroGlow: {
      position: "absolute", width: 500, height: 500, borderRadius: "50%",
      background: `radial-gradient(circle, ${accent}08, transparent 70%)`,
      filter: "blur(60px)", pointerEvents: "none",
    },
  };

  // ============ COMPONENTS ============

  const GlowingOrb = ({ top, left, color, size = 300 }) => (
    <div style={{
      position: "absolute", top, left, width: size, height: size,
      borderRadius: "50%", background: `radial-gradient(circle, ${color}06, transparent 70%)`,
      filter: "blur(80px)", pointerEvents: "none", zIndex: 0,
    }} />
  );

  const StatCard = ({ icon: Icon, label, value, change, color }) => (
    <div style={styles.statCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={20} color={color} />
        </div>
        {change && (
          <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: 2 }}>
            <TrendingUp size={12} /> {change}
          </span>
        )}
      </div>
      <div style={{ marginTop: 16, fontSize: 28, fontWeight: 800, letterSpacing: "-1px" }}>{value}</div>
      <div style={{ fontSize: 13, color: textSecondary, marginTop: 2 }}>{label}</div>
    </div>
  );

  const ItemCard = ({ item }) => {
    const [hovered, setHovered] = useState(false);
    const CatIcon = CATEGORY_ICONS[item.category] || Package;
    const statusColors = { active: "#10b981", matched: accent2, resolved: "#8b5cf6", disputed: "#ef4444" };

    return (
      <div
        style={{
          ...styles.card,
          ...(hovered ? styles.cardHover : {}),
          cursor: "pointer", position: "relative", overflow: "hidden",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => { setSelectedItem(item); setPage("detail"); }}
      >
        {item.similarity > 0 && (
          <div style={{
            position: "absolute", top: 12, right: 12,
            background: `linear-gradient(135deg, ${accent}, #0088aa)`,
            color: "#000", padding: "4px 10px", borderRadius: 8,
            fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4,
          }}>
            <Cpu size={12} /> {item.similarity}% AI Match
          </div>
        )}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 14,
            background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, flexShrink: 0,
            border: `1px solid ${cardBorder}`,
          }}>
            {item.image}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
              <span style={styles.badge(item.type === "lost" ? "#ef4444" : "#10b981")}>
                {item.type === "lost" ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                {item.type}
              </span>
              <span style={styles.badge(statusColors[item.status])}>{item.status}</span>
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{item.title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: textSecondary, lineHeight: 1.5,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.description}
            </p>
            <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: textSecondary, display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin size={12} color={accent} /> {item.location}
              </span>
              {item.reward !== "0" && (
                <span style={{ fontSize: 12, color: accent2, display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                  <Wallet size={12} /> {item.reward} ETH
                </span>
              )}
              <span style={{ fontSize: 12, color: textSecondary, display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={12} /> {Math.floor((Date.now() - item.timestamp) / 3600000)}h ago
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MatchCard = ({ match }) => {
    const lost = MOCK_ITEMS.find(i => i.id === match.lostId);
    const found = MOCK_ITEMS.find(i => i.id === match.foundId);
    if (!lost || !found) return null;

    return (
      <div style={{ ...styles.card, borderLeft: `3px solid ${accent}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <span style={styles.badge(match.status === "confirmed" ? "#10b981" : accent2)}>
            {match.status === "confirmed" ? <CheckCircle2 size={10} /> : <Clock size={10} />}
            {match.status}
          </span>
          <div style={{
            background: `linear-gradient(135deg, ${accent}20, ${accent}05)`,
            borderRadius: 10, padding: "6px 14px",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Cpu size={14} color={accent} />
            <span style={{ fontSize: 18, fontWeight: 800, color: accent }}>{match.score}%</span>
            <span style={{ fontSize: 11, color: textSecondary }}>similarity</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 150, padding: 12, borderRadius: 12, background: isDark ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)" }}>
            <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Lost</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{lost.title}</div>
            <div style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>{lost.location}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: `linear-gradient(135deg, ${accent}, ${accent2})`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Zap size={16} color="#000" />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 150, padding: 12, borderRadius: 12, background: isDark ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.1)" }}>
            <div style={{ fontSize: 10, color: "#10b981", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Found</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{found.title}</div>
            <div style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>{found.location}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {match.status === "pending" && (
            <>
              <button style={styles.btn(true)} onClick={() => setShowChat(true)}>
                <MessageCircle size={14} /> Contact Finder
              </button>
              <button style={styles.btn(false)}>
                <CheckCircle2 size={14} /> Confirm Match
              </button>
              <button style={{ ...styles.btn(false), color: "#ef4444" }}>
                <XCircle size={14} /> Dispute
              </button>
            </>
          )}
          {match.status === "confirmed" && (
            <button style={styles.btn(true)}>
              <CheckCircle2 size={14} /> Resolved — Reward Released
            </button>
          )}
        </div>
      </div>
    );
  };

  // ============ PAGES ============

  const HomePage = () => {
    const stats = [
      { n: "2,847", l: "Items Recovered" },
      { n: "94%", l: "AI Match Rate" },
      { n: "12.5 ETH", l: "Rewards Paid" },
      { n: "15K+", l: "Active Users" },
    ];

    const features = [
      { icon: Cpu, title: "AI Visual Matching", desc: "ResNet50-powered image analysis automatically finds matches between lost and found items with up to 98% accuracy", color: accent },
      { icon: Shield, title: "Blockchain Trust", desc: "Ethereum smart contracts ensure transparent ownership verification, tamper-proof records, and automated escrow rewards", color: "#8b5cf6" },
      { icon: Globe, title: "IPFS Decentralized Storage", desc: "Images and metadata stored on IPFS — no single point of failure, censorship-resistant, and permanently available", color: "#10b981" },
      { icon: Award, title: "Reputation System", desc: "On-chain reputation scores incentivize honest behavior and build community trust over time", color: accent2 },
      { icon: Lock, title: "Escrow Rewards", desc: "Post bounties that are locked in smart contracts and automatically released when items are verified and returned", color: "#ef4444" },
      { icon: Layers, title: "Community Governance", desc: "DAO-style dispute resolution where high-reputation community members vote on contested matches", color: "#6366f1" },
    ];

    return (
      <>
        {/* Hero */}
        <div style={{ position: "relative", overflow: "hidden" }}>
          <GlowingOrb top="-200px" left="-100px" color={accent} size={600} />
          <GlowingOrb top="100px" left="60%" color={accent2} size={400} />
          <div style={{ ...styles.section, textAlign: "center", paddingTop: 80, paddingBottom: 60 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 18px",
              borderRadius: 24, border: `1px solid ${accent}25`,
              background: `${accent}08`, marginBottom: 24, fontSize: 13, color: accent, fontWeight: 500,
            }}>
              <Zap size={14} /> Powered by AI + Ethereum + IPFS
            </div>
            <h1 style={{
              fontSize: "clamp(36px, 6vw, 68px)", fontWeight: 900, lineHeight: 1.1,
              margin: "0 0 20px", letterSpacing: "-2px",
              background: isDark
                ? `linear-gradient(135deg, #fff 0%, ${accent} 50%, ${accent2} 100%)`
                : `linear-gradient(135deg, #1a1a2e 0%, ${accent} 100%)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Lost Something?<br />AI Will Find It.
            </h1>
            <p style={{
              fontSize: 18, color: textSecondary, maxWidth: 600, margin: "0 auto 40px",
              lineHeight: 1.7,
            }}>
              The first decentralized lost-and-found platform that uses computer vision
              to automatically match your lost items — secured by blockchain, powered by AI.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button style={styles.btn(true)} onClick={() => setPage("report")}>
                <Plus size={16} /> Report Lost Item
              </button>
              <button style={styles.btn(false)} onClick={() => setPage("browse")}>
                <Search size={16} /> Browse Found Items
              </button>
            </div>

            {/* Stats Banner */}
            <div style={{
              display: "flex", gap: 0, marginTop: 60, borderRadius: 20, overflow: "hidden",
              border: `1px solid ${cardBorder}`, background: cardBg, backdropFilter: "blur(16px)",
              flexWrap: "wrap",
            }}>
              {stats.map((s, i) => (
                <div key={i} style={{
                  flex: 1, minWidth: 140, padding: "24px 20px",
                  borderRight: i < stats.length - 1 ? `1px solid ${cardBorder}` : "none",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: accent, letterSpacing: "-1px" }}>{s.n}</div>
                  <div style={{ fontSize: 13, color: textSecondary, marginTop: 4 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div style={styles.section}>
          <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: "center", marginBottom: 8, letterSpacing: "-1px" }}>
            How FindChain Works
          </h2>
          <p style={{ textAlign: "center", color: textSecondary, marginBottom: 48, fontSize: 16 }}>
            Three steps to recover your belongings
          </p>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              { step: "01", title: "Report & Upload", desc: "Upload photos and describe your lost/found item. Our AI extracts visual features and stores everything on IPFS.", icon: Camera, color: accent },
              { step: "02", title: "AI Matches", desc: "ResNet50 computer vision compares visual features, categories, and locations to find potential matches automatically.", icon: Cpu, color: accent2 },
              { step: "03", title: "Verify & Recover", desc: "Confirm matches on-chain, communicate securely, and release escrowed rewards upon verified return.", icon: Shield, color: "#10b981" },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, minWidth: 260 }}>
                <div style={{ ...styles.card, height: "100%", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -10, right: -5, fontSize: 80, fontWeight: 900, color: `${s.color}08` }}>{s.step}</div>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: `${s.color}12`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
                  }}>
                    <s.icon size={22} color={s.color} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: textSecondary, lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div style={styles.section}>
          <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: "center", marginBottom: 48, letterSpacing: "-1px" }}>
            Built Different
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {features.map((f, i) => (
              <div key={i} style={styles.card}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${f.color}12`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
                }}>
                  <f.icon size={20} color={f.color} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: textSecondary, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ ...styles.section, textAlign: "center", paddingBottom: 80 }}>
          <div style={{
            ...styles.card, padding: "48px 32px", position: "relative", overflow: "hidden",
            borderImage: `linear-gradient(135deg, ${accent}30, ${accent2}30) 1`,
          }}>
            <GlowingOrb top="-100px" left="20%" color={accent} size={300} />
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, position: "relative" }}>
              Ready to Find What's Lost?
            </h2>
            <p style={{ color: textSecondary, marginBottom: 28, fontSize: 16, position: "relative" }}>
              Join thousands of users already recovering their belongings with AI.
            </p>
            <button style={{ ...styles.btn(true), position: "relative" }} onClick={connectWallet}>
              <Wallet size={16} /> Connect Wallet & Get Started
            </button>
          </div>
        </div>
      </>
    );
  };

  const BrowsePage = () => (
    <div style={styles.section}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>Browse Items</h1>
          <p style={{ color: textSecondary, margin: "4px 0 0", fontSize: 14 }}>{filteredItems.length} items found</p>
        </div>
        <button style={styles.btn(true)} onClick={() => setPage("report")}>
          <Plus size={15} /> Report Item
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: textSecondary }} />
          <input
            placeholder="Search items..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ ...styles.input, paddingLeft: 40 }}
          />
        </div>
        {["all", "lost", "found"].map(f => (
          <button key={f} onClick={() => setMatchFilter(f)}
            style={{
              ...styles.btn(false),
              background: matchFilter === f ? `${accent}15` : "transparent",
              color: matchFilter === f ? accent : textSecondary,
              border: `1px solid ${matchFilter === f ? accent + "30" : cardBorder}`,
            }}>
            {f === "all" ? "All" : f === "lost" ? "🔴 Lost" : "🟢 Found"}
          </button>
        ))}
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{ ...styles.input, width: "auto", minWidth: 140, cursor: "pointer" }}
        >
          <option value="all">All Categories</option>
          {Object.keys(CATEGORY_ICONS).filter(c => c !== "all").map(c => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Items Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
        {filteredItems.map(item => <ItemCard key={item.id} item={item} />)}
      </div>
      {filteredItems.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: textSecondary }}>
          <Search size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <p>No items match your filters</p>
        </div>
      )}
    </div>
  );

  const MatchesPage = () => (
    <div style={styles.section}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4, letterSpacing: "-0.5px" }}>AI Matches</h1>
      <p style={{ color: textSecondary, marginBottom: 28, fontSize: 14 }}>
        Matches detected by our ResNet50 visual similarity engine
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {MOCK_MATCHES.map(m => <MatchCard key={m.id} match={m} />)}
      </div>
    </div>
  );

  const ReportPage = () => {
    const [reportType, setReportType] = useState("lost");
    const [formData, setFormData] = useState({ title: "", description: "", category: "electronics", location: "", reward: "0" });
    const [imagePreview, setImagePreview] = useState(null);
    const [fileName, setFileName] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const fileInputRef = useRef(null);

    const handleFile = (file) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) { alert("Please upload an image file (PNG, JPG)"); return; }
      if (file.size > 10 * 1024 * 1024) { alert("File too large. Max 10MB."); return; }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
      if (!isConnected) { alert("Please connect your wallet first"); return; }
      if (!imagePreview) { alert("Please upload an item photo"); return; }
      if (!formData.title.trim()) { alert("Please enter an item title"); return; }
      if (!formData.description.trim()) { alert("Please enter a description"); return; }
      if (!formData.location.trim()) { alert("Please enter a location"); return; }

      setSubmitted(true);
      try {
        const contract = await getContract(true);
        const ipfsImageHash = "Qm" + Array.from(crypto.getRandomValues(new Uint8Array(22))).map(b => b.toString(16).padStart(2, "0")).join("");
        const ipfsMetaHash = "Qm" + Array.from(crypto.getRandomValues(new Uint8Array(22))).map(b => b.toString(16).padStart(2, "0")).join("");
        const lat = Math.round(28.45 * 1e6);
        const lng = Math.round(77.58 * 1e6);

        let tx;
        if (reportType === "lost") {
          const rewardWei = formData.reward && parseFloat(formData.reward) > 0
            ? ethers.parseEther(formData.reward)
            : 0n;
          tx = await contract.reportLostItem(
            formData.title, formData.description, formData.category,
            ipfsImageHash, ipfsMetaHash, formData.location, lat, lng,
            { value: rewardWei }
          );
        } else {
          tx = await contract.reportFoundItem(
            formData.title, formData.description, formData.category,
            ipfsImageHash, ipfsMetaHash, formData.location, lat, lng
          );
        }
        await tx.wait();
        alert(`Item reported on-chain! Tx: ${tx.hash.slice(0, 10)}...`);
        setImagePreview(null); setFileName("");
        setFormData({ title: "", description: "", category: "electronics", location: "", reward: "0" });
      } catch (err) {
        console.error(err);
        if (err.message?.includes("user rejected")) {
          alert("Transaction rejected in wallet");
        } else if (err.message?.includes("Not registered")) {
          alert("Please register first — reconnect your wallet");
        } else {
          alert("Transaction failed: " + (err.reason || err.message || "Unknown error"));
        }
      }
      setSubmitted(false);
    };

    return (
      <div style={styles.section}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 28, letterSpacing: "-0.5px" }}>
          Report {reportType === "lost" ? "Lost" : "Found"} Item
        </h1>
        <div style={{ maxWidth: 640 }}>
          {/* Type Toggle */}
          <div style={{
            display: "flex", gap: 0, borderRadius: 14, overflow: "hidden",
            border: `1px solid ${cardBorder}`, marginBottom: 28, background: cardBg,
          }}>
            {["lost", "found"].map(t => (
              <button key={t} onClick={() => setReportType(t)}
                style={{
                  flex: 1, padding: "14px 20px", border: "none", cursor: "pointer",
                  fontWeight: 600, fontSize: 15, fontFamily: "inherit",
                  background: reportType === t
                    ? (t === "lost" ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)")
                    : "transparent",
                  color: reportType === t ? (t === "lost" ? "#ef4444" : "#10b981") : textSecondary,
                  transition: "all 0.2s",
                }}>
                {t === "lost" ? "🔴 I Lost Something" : "🟢 I Found Something"}
              </button>
            ))}
          </div>

          <div style={styles.card}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Image Upload */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: "block" }}>
                  Item Photo *
                </label>
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }}
                  onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                  style={{
                    border: `2px dashed ${isDragging ? accent : cardBorder}`, borderRadius: 14, padding: imagePreview ? 16 : 40,
                    textAlign: "center", cursor: "pointer",
                    background: isDragging ? "rgba(0,240,255,0.06)" : (isDark ? "rgba(0,240,255,0.02)" : "rgba(0,0,0,0.01)"),
                    transition: "all 0.2s",
                  }}>
                  {imagePreview ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <img src={imagePreview} alt="Preview" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10 }} />
                      <div style={{ textAlign: "left" }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{fileName}</p>
                        <p style={{ margin: 0, fontSize: 12, color: "#10b981", marginTop: 4 }}>Ready for AI feature extraction</p>
                        <button onClick={(e) => { e.stopPropagation(); setImagePreview(null); setFileName(""); }} style={{
                          background: "none", border: "none", color: "#ef4444", fontSize: 12, cursor: "pointer", padding: 0, marginTop: 4,
                        }}>Remove</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} color={isDragging ? accent : textSecondary} style={{ marginBottom: 12 }} />
                      <p style={{ margin: 0, fontWeight: 600, marginBottom: 4 }}>Click to upload or drag & drop</p>
                      <p style={{ margin: 0, fontSize: 12, color: textSecondary }}>
                        PNG, JPG up to 10MB — AI will auto-extract visual features
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: "block" }}>Item Title *</label>
                <input style={styles.input} placeholder="e.g. Black iPhone 15 Pro with blue case"
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: "block" }}>Description *</label>
                <textarea style={{ ...styles.input, minHeight: 100, resize: "vertical" }}
                  placeholder="Provide detailed description — color, brand, distinguishing marks, contents..."
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              {/* Category & Location Row */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: "block" }}>Category</label>
                  <select style={{ ...styles.input, cursor: "pointer" }}
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {Object.keys(CATEGORY_ICONS).filter(c => c !== "all").map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: "block" }}>
                    <MapPin size={13} style={{ display: "inline", verticalAlign: "middle" }} /> Location *
                  </label>
                  <input style={styles.input} placeholder="Where was it lost/found?"
                    value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
              </div>

              {/* Reward (only for lost) */}
              {reportType === "lost" && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: "block" }}>
                    <Wallet size={13} style={{ display: "inline", verticalAlign: "middle" }} /> Reward (ETH)
                  </label>
                  <input style={styles.input} placeholder="0.00" type="number" step="0.01"
                    value={formData.reward} onChange={e => setFormData({...formData, reward: e.target.value})} />
                  <p style={{ fontSize: 12, color: textSecondary, marginTop: 6 }}>
                    Reward is locked in smart contract escrow and released automatically upon verified return
                  </p>
                </div>
              )}

              {submitted && (
                <div style={{
                  padding: "14px 20px", borderRadius: 12, marginBottom: 8,
                  background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)",
                  display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600, color: "#10b981",
                }}>
                  <CheckCircle2 size={18} /> Item reported successfully! AI matching will begin shortly.
                </div>
              )}
              <button onClick={handleSubmit} disabled={submitted}
                style={{ ...styles.btn(true), justifyContent: "center", padding: "14px 28px", marginTop: 8, opacity: submitted ? 0.5 : 1 }}>
                <Shield size={16} />
                {submitted ? "Submitting..." : (reportType === "lost" ? "Report Lost Item & Lock Reward" : "Report Found Item")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DashboardPage = () => (
    <div style={styles.section}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24, letterSpacing: "-0.5px" }}>Analytics Dashboard</h1>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <StatCard icon={Package} label="Total Items" value="2,847" change="+12%" color={accent} />
        <StatCard icon={CheckCircle2} label="Resolved" value="2,180" change="+8%" color="#10b981" />
        <StatCard icon={Cpu} label="AI Match Rate" value="94.2%" change="+2.1%" color={accent2} />
        <StatCard icon={Wallet} label="Rewards Paid" value="12.5 ETH" change="+0.8" color="#8b5cf6" />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 20 }}>
        {/* Monthly Trend */}
        <div style={styles.card}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={ANALYTICS_DATA.monthly}>
              <defs>
                <linearGradient id="lostGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="foundGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke={textSecondary} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={textSecondary} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: isDark ? "#1a1a2e" : "#fff", border: `1px solid ${cardBorder}`, borderRadius: 10, fontSize: 13 }} />
              <Area type="monotone" dataKey="lost" stroke="#ef4444" fill="url(#lostGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="found" stroke="#10b981" fill="url(#foundGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="resolved" stroke={accent} fill="url(#resolvedGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 12 }}>
            {[{ c: "#ef4444", l: "Lost" }, { c: "#10b981", l: "Found" }, { c: accent, l: "Resolved" }].map((x, i) => (
              <span key={i} style={{ fontSize: 12, color: textSecondary, display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: x.c }} /> {x.l}
              </span>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div style={styles.card}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Items by Category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={ANALYTICS_DATA.categories} cx="50%" cy="50%" outerRadius={90} innerRadius={55}
                dataKey="value" paddingAngle={3} strokeWidth={0}>
                {ANALYTICS_DATA.categories.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: isDark ? "#1a1a2e" : "#fff", border: `1px solid ${cardBorder}`, borderRadius: 10, fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
            {ANALYTICS_DATA.categories.map((c, i) => (
              <span key={i} style={{ fontSize: 12, color: textSecondary, display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} /> {c.name} ({c.value}%)
              </span>
            ))}
          </div>
        </div>

        {/* Resolution Rate */}
        <div style={styles.card}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Weekly Resolution Rate</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ANALYTICS_DATA.resolutionRate}>
              <XAxis dataKey="day" stroke={textSecondary} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={textSecondary} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: isDark ? "#1a1a2e" : "#fff", border: `1px solid ${cardBorder}`, borderRadius: 10, fontSize: 13 }} />
              <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                {ANALYTICS_DATA.resolutionRate.map((_, i) => (
                  <Cell key={i} fill={accent} opacity={0.7 + (i * 0.04)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div style={styles.card}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Recent Activity</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: CheckCircle2, color: "#10b981", text: "iPhone 15 returned — 0.49 ETH paid to Bob (0x3C44)", time: "2d ago" },
              { icon: CheckCircle2, color: "#10b981", text: "Wallet returned — 0.245 ETH paid to Charlie (0x90F7)", time: "5d ago" },
              { icon: AlertTriangle, color: "#ef4444", text: "Alice (0x7099) disputed MacBook match — vote open", time: "10h ago" },
              { icon: Award, color: accent2, text: "Alice (0x7099) earned +200 reputation", time: "5d ago" },
              { icon: Cpu, color: accent, text: "AI matched AirPods Pro — 88% score — awaiting confirmation", time: "4h ago" },
              { icon: Wallet, color: "#8b5cf6", text: "Bob (0x3C44) found Indian Passport at JFK Terminal 4", time: "1d ago" },
            ].map((a, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                borderBottom: i < 5 ? `1px solid ${cardBorder}` : "none",
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: `${a.color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <a.icon size={16} color={a.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{a.text}</div>
                  <div style={{ fontSize: 11, color: textSecondary }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const ProfilePage = () => (
    <div style={styles.section}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 28, letterSpacing: "-0.5px" }}>Your Profile</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>
        {/* Profile Card */}
        <div style={styles.card}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%", margin: "0 auto 16px",
              background: `linear-gradient(135deg, ${accent}, ${accent2})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 30px ${accent}30`,
            }}>
              <User size={32} color="#000" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "monospace", color: accent }}>
              {MOCK_USER.address.slice(0, 10)}...{MOCK_USER.address.slice(-8)}
            </div>
            <div style={{ fontSize: 12, color: textSecondary, marginTop: 4 }}>
              Joined {MOCK_USER.joinedDaysAgo} days ago
            </div>
          </div>

          {/* Reputation Bar */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Reputation Score</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: accent }}>{MOCK_USER.reputation}</span>
            </div>
            <div style={{
              height: 8, borderRadius: 4, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: 4, width: `${(MOCK_USER.reputation / 10000) * 100}%`,
                background: `linear-gradient(90deg, ${accent}, ${accent2})`,
                transition: "width 1s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: textSecondary }}>0</span>
              <span style={{ fontSize: 10, color: textSecondary }}>10,000</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Items Reported", value: MOCK_USER.itemsReported, color: accent },
              { label: "Items Resolved", value: MOCK_USER.itemsResolved, color: "#10b981" },
              { label: "Successful Returns", value: MOCK_USER.successfulReturns, color: accent2 },
              { label: "Rewards Earned", value: `${MOCK_USER.rewardsEarned} ETH`, color: "#8b5cf6" },
            ].map((s, i) => (
              <div key={i} style={{
                padding: 14, borderRadius: 12,
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                border: `1px solid ${cardBorder}`, textAlign: "center",
              }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* QR Tag Generator */}
        <div style={styles.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, background: `${accent2}12`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <QrCode size={20} color={accent2} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Preventive QR Tags</h3>
              <p style={{ margin: 0, fontSize: 12, color: textSecondary }}>Generate tags for your valuables</p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: textSecondary, lineHeight: 1.6, marginBottom: 20 }}>
            Create blockchain-linked QR tags for your valuables. If someone finds your item,
            they can scan the tag to initiate return — with your contact info protected by the smart contract.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input style={styles.input} placeholder="Item name (e.g., MacBook Pro)" />
            <input style={styles.input} placeholder="Category" />
            <button style={{ ...styles.btn(true), justifyContent: "center" }}>
              <QrCode size={15} /> Generate QR Tag
            </button>
          </div>
          <div style={{
            marginTop: 20, padding: 24, borderRadius: 12, textAlign: "center",
            background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
            border: `2px dashed ${cardBorder}`,
          }}>
            <div style={{
              width: 120, height: 120, margin: "0 auto", borderRadius: 12,
              background: `linear-gradient(135deg, ${accent}08, ${accent2}08)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `1px solid ${cardBorder}`,
            }}>
              <QrCode size={56} color={textSecondary} style={{ opacity: 0.3 }} />
            </div>
            <p style={{ fontSize: 12, color: textSecondary, marginTop: 12 }}>
              Your QR code will appear here
            </p>
          </div>
        </div>

        {/* Your Items */}
        <div style={{ ...styles.card, gridColumn: "1 / -1" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Your Reported Items</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
            {MOCK_ITEMS.filter(i => i.reporter.startsWith("0x7099")).map(item => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const DetailPage = () => {
    if (!selectedItem) return <div style={styles.section}><p>No item selected</p></div>;
    const item = selectedItem;
    const matchedItem = MOCK_ITEMS.find(i =>
      i.id !== item.id && i.category === item.category && i.type !== item.type
    );

    return (
      <div style={styles.section}>
        <button style={{ ...styles.btn(false), marginBottom: 20 }} onClick={() => setPage("browse")}>
          ← Back to Browse
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>
          {/* Item Details */}
          <div style={styles.card}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <span style={styles.badge(item.type === "lost" ? "#ef4444" : "#10b981")}>{item.type}</span>
              <span style={styles.badge(item.status === "active" ? "#10b981" : "#f59e0b")}>{item.status}</span>
            </div>
            <div style={{
              width: "100%", height: 200, borderRadius: 14,
              background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 64, marginBottom: 20, border: `1px solid ${cardBorder}`,
            }}>
              {item.image}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{item.title}</h2>
            <p style={{ fontSize: 14, color: textSecondary, lineHeight: 1.7, marginBottom: 20 }}>{item.description}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { icon: MapPin, label: "Location", value: item.location, color: accent },
                { icon: Hash, label: "Category", value: item.category, color: "#8b5cf6" },
                { icon: Clock, label: "Reported", value: new Date(item.timestamp).toLocaleDateString(), color: textSecondary },
                { icon: User, label: "Reporter", value: item.reporter, color: textSecondary },
              ].map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <d.icon size={16} color={d.color} />
                  <span style={{ fontSize: 12, color: textSecondary, minWidth: 70 }}>{d.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{d.value}</span>
                </div>
              ))}
              {item.reward !== "0" && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 10,
                  background: `${accent2}10`, border: `1px solid ${accent2}20`,
                }}>
                  <Wallet size={16} color={accent2} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: accent2 }}>{item.reward} ETH Reward</span>
                  <span style={{ fontSize: 11, color: textSecondary }}>Locked in escrow</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Match Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {matchedItem && (
              <div style={{ ...styles.card, borderLeft: `3px solid ${accent}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <Cpu size={18} color={accent} />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>AI Match Detected</h3>
                </div>
                <div style={{
                  textAlign: "center", padding: 20, borderRadius: 12,
                  background: `${accent}06`, border: `1px solid ${accent}15`, marginBottom: 16,
                }}>
                  <div style={{ fontSize: 42, fontWeight: 900, color: accent }}>{item.similarity || 85}%</div>
                  <div style={{ fontSize: 13, color: textSecondary }}>Visual Similarity Score</div>
                  <div style={{
                    height: 6, borderRadius: 3, marginTop: 12,
                    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 3,
                      width: `${item.similarity || 85}%`,
                      background: `linear-gradient(90deg, ${accent}, ${accent2})`,
                    }} />
                  </div>
                </div>
                <div style={{
                  padding: 16, borderRadius: 12,
                  background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  border: `1px solid ${cardBorder}`,
                }}>
                  <div style={{ fontSize: 11, color: textSecondary, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>
                    Potential Match
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12, fontSize: 24,
                      background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {matchedItem.image}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{matchedItem.title}</div>
                      <div style={{ fontSize: 12, color: textSecondary }}>{matchedItem.location}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button style={{ ...styles.btn(true), flex: 1, justifyContent: "center" }}
                    onClick={() => setShowChat(true)}>
                    <MessageCircle size={14} /> Contact
                  </button>
                  <button style={{ ...styles.btn(false), flex: 1, justifyContent: "center" }}
                    onClick={async () => {
                      if (!isConnected) { alert("Connect wallet first"); return; }
                      try {
                        const contract = await getContract(true);
                        const matchData = MOCK_MATCHES.find(m => m.lostId === item.id || m.foundId === item.id);
                        if (matchData) {
                          const tx = await contract.confirmMatch(matchData.id);
                          await tx.wait();
                          alert(`Match confirmed on-chain! Tx: ${tx.hash.slice(0, 10)}...`);
                        } else {
                          alert("No on-chain match found for this item");
                        }
                      } catch (err) {
                        alert("Confirm failed: " + (err.reason || err.message || "Unknown error"));
                      }
                    }}>
                    <CheckCircle2 size={14} /> Confirm
                  </button>
                </div>
              </div>
            )}

            {/* Blockchain Record */}
            <div style={styles.card}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Shield size={18} color="#8b5cf6" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Blockchain Record</h3>
              </div>
              {[
                { label: "Item ID", value: `#${item.id}` },
                { label: "IPFS Hash", value: "Qm7x9K2...4f8dE" },
                { label: "Tx Hash", value: "0xa3f7...9c2b" },
                { label: "Block", value: "#19,847,293" },
                { label: "Status", value: item.status },
              ].map((r, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", padding: "8px 0",
                  borderBottom: i < 4 ? `1px solid ${cardBorder}` : "none",
                }}>
                  <span style={{ fontSize: 12, color: textSecondary }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MapPage = () => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true }).setView([28.50, 77.40], 11);
      mapInstanceRef.current = map;

      L.tileLayer(
        isDark
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        { attribution: '&copy; <a href="https://carto.com/">CARTO</a>', maxZoom: 19 }
      ).addTo(map);

      MOCK_ITEMS.forEach(item => {
        const icon = L.divIcon({
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          html: `<div style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;background:${item.type === "lost" ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)"};border:2px solid ${item.type === "lost" ? "#ef4444" : "#10b981"};box-shadow:0 0 12px ${item.type === "lost" ? "#ef444450" : "#10b98150"};cursor:pointer">${item.image}</div>`,
        });
        const marker = L.marker([item.lat, item.lng], { icon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family:DM Sans,sans-serif;min-width:180px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:22px">${item.image}</span>
              <strong style="font-size:14px">${item.title}</strong>
            </div>
            <div style="font-size:12px;color:#666;margin-bottom:4px">${item.location}</div>
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
              <span style="font-size:10px;font-weight:700;text-transform:uppercase;padding:2px 8px;border-radius:4px;color:#fff;background:${item.type === "lost" ? "#ef4444" : "#10b981"}">${item.type}</span>
              <span style="font-size:11px;color:#888">${item.status}</span>
            </div>
            ${item.reward !== "0" ? `<div style="font-size:12px;font-weight:600;color:#f59e0b">Reward: ${item.reward} ETH</div>` : ""}
          </div>
        `);
      });

      setTimeout(() => map.invalidateSize(), 200);
      return () => { map.remove(); mapInstanceRef.current = null; };
    }, []);

    return (
      <div style={styles.section}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4, letterSpacing: "-0.5px" }}>Map View</h1>
        <p style={{ color: textSecondary, marginBottom: 24, fontSize: 14 }}>Items reported near you</p>
        <div style={{ ...styles.card, height: 500, position: "relative", overflow: "hidden", borderRadius: 16 }}>
          <div ref={mapRef} style={{ height: "100%", width: "100%", borderRadius: 16 }} />

          <div style={{
            position: "absolute", bottom: 16, right: 16, zIndex: 1000,
            display: "flex", gap: 8,
          }}>
            {[
              { color: "#ef4444", label: "Lost" },
              { color: "#10b981", label: "Found" },
            ].map((l, i) => (
              <span key={i} style={{
                ...styles.badge(l.color), background: cardBg,
                backdropFilter: "blur(8px)", border: `1px solid ${cardBorder}`,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} /> {l.label}
              </span>
            ))}
          </div>

          <div style={{
            position: "absolute", top: 16, left: 16, zIndex: 1000,
            background: cardBg, backdropFilter: "blur(8px)",
            padding: "10px 16px", borderRadius: 12,
            border: `1px solid ${cardBorder}`, fontSize: 12, color: textSecondary,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Globe size={14} color={accent} />
            Showing {MOCK_ITEMS.length} items • Click markers for details
          </div>
        </div>
      </div>
    );
  };

  // ============ CHAT OVERLAY ============
  const ChatOverlay = () => {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState(MOCK_MESSAGES);

    return (
      <div style={{
        position: "fixed", bottom: 20, right: 20, width: 380, maxHeight: 500,
        background: isDark ? "rgba(10,10,20,0.95)" : "rgba(255,255,255,0.98)",
        backdropFilter: "blur(20px)", borderRadius: 20,
        border: `1px solid ${cardBorder}`, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        zIndex: 100, display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid ${cardBorder}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: `linear-gradient(135deg, ${accent}, ${accent2})`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Lock size={14} color="#000" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Encrypted Chat</div>
              <div style={{ fontSize: 11, color: "#10b981" }}>● Online</div>
            </div>
          </div>
          <button onClick={() => setShowChat(false)} style={{
            background: "none", border: "none", cursor: "pointer", color: textSecondary, padding: 4,
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{
              alignSelf: msg.sender === "owner" ? "flex-end" : "flex-start",
              maxWidth: "80%",
            }}>
              <div style={{
                padding: "10px 14px", borderRadius: 14,
                background: msg.sender === "owner"
                  ? `linear-gradient(135deg, ${accent}, #0088aa)`
                  : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                color: msg.sender === "owner" ? "#000" : textPrimary,
                fontSize: 13, lineHeight: 1.5,
              }}>
                {msg.text}
              </div>
              <div style={{ fontSize: 10, color: textSecondary, marginTop: 4, textAlign: msg.sender === "owner" ? "right" : "left" }}>
                {msg.time}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: 12, borderTop: `1px solid ${cardBorder}`, display: "flex", gap: 8 }}>
          <input
            style={{ ...styles.input, borderRadius: 20, paddingLeft: 16 }}
            placeholder="Type a message..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && message.trim()) {
                setMessages([...messages, { id: Date.now(), sender: "owner", text: message, time: "Now" }]);
                setMessage("");
              }
            }}
          />
          <button style={{
            width: 40, height: 40, borderRadius: "50%",
            background: `linear-gradient(135deg, ${accent}, #0088aa)`,
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
          onClick={() => {
            if (message.trim()) {
              setMessages([...messages, { id: Date.now(), sender: "owner", text: message, time: "Now" }]);
              setMessage("");
            }
          }}>
            <Send size={16} color="#000" />
          </button>
        </div>
      </div>
    );
  };

  // ============ NOTIFICATION PANEL ============
  const NotificationPanel = () => (
    <div style={{
      position: "absolute", top: 60, right: 20, width: 360,
      background: isDark ? "rgba(10,10,20,0.97)" : "rgba(255,255,255,0.98)",
      backdropFilter: "blur(20px)", borderRadius: 16,
      border: `1px solid ${cardBorder}`, boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
      zIndex: 60, overflow: "hidden",
    }}>
      <div style={{
        padding: "16px 20px", borderBottom: `1px solid ${cardBorder}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Notifications</h3>
        <span style={{ fontSize: 12, color: accent, cursor: "pointer", fontWeight: 500 }}>Mark all read</span>
      </div>
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        {NOTIFICATIONS.map(n => {
          const icons = { match: Cpu, reward: Wallet, dispute: AlertTriangle, reputation: Award };
          const colors = { match: accent, reward: "#8b5cf6", dispute: "#ef4444", reputation: accent2 };
          const Icon = icons[n.type];
          return (
            <div key={n.id} style={{
              padding: "14px 20px", borderBottom: `1px solid ${cardBorder}`,
              background: !n.read ? `${accent}04` : "transparent",
              cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start",
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: `${colors[n.type]}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Icon size={16} color={colors[n.type]} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: !n.read ? 700 : 500 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>{n.desc}</div>
                <div style={{ fontSize: 11, color: textSecondary, marginTop: 4 }}>{n.time}</div>
              </div>
              {!n.read && (
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", background: accent,
                  flexShrink: 0, marginTop: 4,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ============ RENDER ============
  const pages = {
    home: HomePage, browse: BrowsePage, matches: MatchesPage,
    report: ReportPage, dashboard: DashboardPage, profile: ProfilePage,
    detail: DetailPage, map: MapPage,
  };
  const PageComponent = pages[page] || HomePage;

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "browse", label: "Browse", icon: Search },
    { id: "matches", label: "Matches", icon: Zap },
    { id: "map", label: "Map", icon: MapPin },
    { id: "dashboard", label: "Analytics", icon: BarChart3 },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div style={styles.app}>
      <div style={styles.gridBg} />

      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.logo} onClick={() => setPage("home")}>
            <div style={styles.logoIcon}>
              <Layers size={18} color="#000" strokeWidth={3} />
            </div>
            <span>Find<span style={{ color: accent }}>Chain</span></span>
          </div>

          <div style={{ ...styles.navLinks, display: "flex" }}>
            {navItems.map(n => (
              <button key={n.id} style={styles.navLink(page === n.id)}
                onClick={() => setPage(n.id)}>
                <n.icon size={15} /> <span style={{ display: "inline" }}>{n.label}</span>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setTheme(isDark ? "light" : "dark")}
              style={{ ...styles.btn(false), padding: 10, borderRadius: 10 }}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowNotifications(!showNotifications)}
                style={{ ...styles.btn(false), padding: 10, borderRadius: 10, position: "relative" }}>
                <Bell size={16} />
                <div style={{
                  position: "absolute", top: 6, right: 6,
                  width: 8, height: 8, borderRadius: "50%", background: "#ef4444",
                }} />
              </button>
              {showNotifications && <NotificationPanel />}
            </div>
            <button style={styles.btn(true)} onClick={connectWallet}>
              <Wallet size={14} />
              {isConnected ? (walletAddress ? `${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}` : "0x7099...79C8") : "Connect"}
            </button>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <PageComponent />

      {/* Chat Overlay */}
      {showChat && <ChatOverlay />}

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div style={{ position: "fixed", inset: 0, zIndex: 55 }}
          onClick={() => setShowNotifications(false)} />
      )}
    </div>
  );
}
