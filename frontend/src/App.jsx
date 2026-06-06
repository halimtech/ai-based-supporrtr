import { useEffect, useState, useRef } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://localhost:8000");

function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

function ratingKey(participant, alternative, criterion) {
  return `${participant}__${alternative}__${criterion}`;
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [view, setView] = useState("auth"); // auth, intro, dashboard, space
  const [spaces, setSpaces] = useState([]);
  const [currentSpace, setCurrentSpace] = useState(null);
  const [spaceData, setSpaceData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [ratingsMap, setRatingsMap] = useState({});
  const [weightsMap, setWeightsMap] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [spaceTab, setSpaceTab] = useState("introduction"); // introduction, vote, results, consensus
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef(null);

  // Auth form state
  const [authMode, setAuthMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Create space state
  const [showCreate, setShowCreate] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const [spaceTitle, setSpaceTitle] = useState("");
  const [spaceDescription, setSpaceDescription] = useState("");
  const [spaceAlternatives, setSpaceAlternatives] = useState([""]);
  const [spaceCriteria, setSpaceCriteria] = useState([{ name: "", weight: 20 }]);

  // Brief description popup state
  const [showBriefDescription, setShowBriefDescription] = useState(false);

  // Edit space state
  const [showEditSpace, setShowEditSpace] = useState(false);
  const [editSpaceDescription, setEditSpaceDescription] = useState("");

  // Join space state
  const [joinCode, setJoinCode] = useState("");

  // Onboarding modal state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const prevCountsRef = useRef({ messages: 0, members: 0, ratings: 0 });

  // Away brief
  const [showAwayBrief, setShowAwayBrief] = useState(false);
  const [awayBriefData, setAwayBriefData] = useState(null);

  useEffect(() => {
    if (token) {
      api("/api/me")
        .then((r) => r.json())
        .then((data) => {
          setUser(data);
          setView("dashboard");
          loadSpaces();
        })
        .catch(() => {
          logout();
        });
    }
  }, [token]);

  useEffect(() => {
    if (view === "dashboard") {
      const disabled = localStorage.getItem("onboardingDisabled") === "1";
      setShowOnboarding(!disabled);
    }
  }, [view]);

  useEffect(() => {
    if (view === "space" && currentSpace) {
      const interval = setInterval(() => {
        loadSpace(currentSpace.id);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [view, currentSpace]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function addNotification(message, type = "info") {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }

  async function loadSpaces() {
    try {
      const res = await api("/api/spaces");
      const data = await res.json();
      setSpaces(data.spaces || []);
    } catch {
      setStatus("Could not load voting spaces.");
    }
  }

  async function loadSpace(spaceId) {
    try {
      const res = await api(`/api/spaces/${spaceId}`);
      const data = await res.json();
      setSpaceData(data);
      const newMessages = data.messages || [];
      setMessages(newMessages);
      const nextMap = {};
      (data.ratings || []).forEach((r) => {
        nextMap[ratingKey(r.participant, r.alternative, r.criterion)] = r.value;
      });
      setRatingsMap(nextMap);
      const nextWeights = {};
      (data.weights || []).forEach((w) => {
        nextWeights[w.criterion] = w.value;
      });
      setWeightsMap(nextWeights);

      // Detect changes for notifications
      const prev = prevCountsRef.current;
      const newMembers = (data.members || []).length;
      const newRatingsCount = (data.ratings || []).length;
      if (prev.messages > 0 && newMessages.length > prev.messages) {
        const latest = newMessages[newMessages.length - 1];
        if (latest.author !== user?.username) {
          addNotification(`New message from ${latest.author}`, "info");
        }
      }
      if (prev.members > 0 && newMembers > prev.members) {
        addNotification("A new member joined the voting space", "success");
      }
      if (prev.ratings > 0 && newRatingsCount > prev.ratings) {
        addNotification("New ratings were submitted", "info");
      }
      prevCountsRef.current = { messages: newMessages.length, members: newMembers, ratings: newRatingsCount };
    } catch {
      setStatus("Could not load voting space.");
    }
  }

  async function handleAuth(e) {
    e.preventDefault();
    setAuthError("");
    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await api(endpoint, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.detail || "Something went wrong.");
        return;
      }
      const t = data.user.token;
      localStorage.setItem("token", t);
      setToken(t);
      setUser({ id: data.user.id, username: data.user.username });
      if (authMode === "register") {
        localStorage.setItem("justRegistered", "1");
        setView("intro");
      } else {
        setView("dashboard");
        loadSpaces();
      }
    } catch {
      setAuthError("Network error.");
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setView("auth");
    setSpaces([]);
    setCurrentSpace(null);
    setSpaceData(null);
  }

  function dismissOnboarding() {
    if (dontShowAgain) {
      localStorage.setItem("onboardingDisabled", "1");
    }
    setShowOnboarding(false);
  }

  async function createSpace(e) {
    e.preventDefault();
    const alts = spaceAlternatives.map((a) => a.trim()).filter(Boolean);
    const crits = spaceCriteria.map((c) => ({ name: c.name.trim(), weight: Number(c.weight) || 0 })).filter((c) => c.name);
    if (!spaceName.trim() || !spaceTitle.trim() || alts.length === 0 || crits.length === 0) {
      setStatus("Please fill in all fields.");
      return;
    }
    try {
      const res = await api("/api/spaces", {
        method: "POST",
        body: JSON.stringify({ name: spaceName.trim(), title: spaceTitle.trim(), description: spaceDescription.trim(), alternatives: alts, criteria: crits }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.detail || "Could not create voting space.");
        return;
      }
      setShowCreate(false);
      setSpaceName("");
      setSpaceTitle("");
      setSpaceDescription("");
      setSpaceAlternatives([""]);
      setSpaceCriteria([{ name: "", weight: 20 }]);
      loadSpaces();
      enterSpace(data.space);
    } catch {
      setStatus("Network error while creating voting space.");
    }
  }

  async function handleJoinSpace(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      const res = await api("/api/spaces/join", {
        method: "POST",
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.detail || "Could not join voting space.");
        return;
      }
      setJoinCode("");
      loadSpaces();
      enterSpace(data.space);
    } catch {
      setStatus("Network error while joining voting space.");
    }
  }

  async function fetchAwayBrief(spaceId) {
    try {
      const res = await api(`/api/spaces/${spaceId}/activity`);
      if (res.ok) {
        const data = await res.json();
        const hasActivity = data.new_messages > 0 || data.new_members > 0 || data.new_ratings > 0;
        if (hasActivity) {
          setAwayBriefData(data);
          setShowAwayBrief(true);
        }
      }
    } catch {
      // ignore
    }
  }

  function enterSpace(space) {
    setCurrentSpace(space);
    setAnalysis(null);
    setSpaceTab("introduction");
    const desc = space.description;
    if (desc && desc.trim()) {
      setShowBriefDescription(true);
    } else {
      setShowBriefDescription(false);
    }
    setView("space");
    loadSpace(space.id);
    fetchAwayBrief(space.id);
    // Reset notification prev counts so we don't get flooded on re-enter
    prevCountsRef.current = { messages: 0, members: 0, ratings: 0 };
  }

  async function handleUpdateSpace(e) {
    e.preventDefault();
    if (!currentSpace) return;
    try {
      const res = await api(`/api/spaces/${currentSpace.id}`, {
        method: "PUT",
        body: JSON.stringify({ description: editSpaceDescription.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.detail || "Could not update voting space.");
        return;
      }
      setShowEditSpace(false);
      setStatus("Space updated.");
      const updatedSpace = data.space;
      setCurrentSpace((prev) => ({ ...prev, description: updatedSpace.description }));
      setSpaceData((prev) => (prev ? { ...prev, space: { ...prev.space, description: updatedSpace.description } } : prev));
    } catch {
      setStatus("Network error while updating voting space.");
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!messageDraft.trim() || !currentSpace) return;
    try {
      await api(`/api/spaces/${currentSpace.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: messageDraft.trim() }),
      });
      setMessageDraft("");
      loadSpace(currentSpace.id);
    } catch {
      setStatus("Failed to send message.");
    }
  }

  async function setWeight(criterion, value) {
    if (!currentSpace || !user) return;
    try {
      await api(`/api/spaces/${currentSpace.id}/weights`, {
        method: "POST",
        body: JSON.stringify({ criterion, value }),
      });
      setWeightsMap((prev) => ({ ...prev, [criterion]: value }));
      setAnalysis(null);
    } catch {
      setStatus("Failed to save weight.");
    }
  }

  async function setRating(alternative, criterion, value) {
    if (!currentSpace || !user) return;
    try {
      await api(`/api/spaces/${currentSpace.id}/ratings`, {
        method: "POST",
        body: JSON.stringify({ alternative, criterion, value }),
      });
      setRatingsMap((prev) => ({ ...prev, [ratingKey(user.username, alternative, criterion)]: value }));
      setAnalysis(null);
    } catch {
      setStatus("Failed to save rating.");
    }
  }

  async function runAnalysis() {
    if (!currentSpace) return;
    setIsSubmitting(true);
    setStatus("Analyzing...");
    try {
      const res = await api(`/api/spaces/${currentSpace.id}/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.detail || "Analysis failed.");
        return;
      }
      setAnalysis(data);
      setSpaceTab("results");
      setStatus("Analysis complete.");
      addNotification("Analysis complete! Results are ready.", "success");
    } catch {
      setStatus("Analysis request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const participants = spaceData?.members?.map((m) => m.username) || [];
  const alternatives = spaceData?.space?.alternatives || [];
  const criteria = spaceData?.space?.criteria || [];

  const completion =
    participants.length && alternatives.length && criteria.length
      ? Math.round(
          (Object.keys(ratingsMap).length /
            (participants.length * alternatives.length * criteria.length)) *
            100
        )
      : 0;

  const myWeightsCount = criteria.length;
  const myWeightsDone = criteria.filter((c) => weightsMap[c.name] !== undefined).length;
  const myRatingsCount = alternatives.length * criteria.length;
  const myRatingsDone = alternatives.reduce(
    (sum, alt) =>
      sum + criteria.filter((c) => ratingsMap[ratingKey(user?.username, alt, c.name)] !== undefined).length,
    0
  );
  const myTotalCount = myWeightsCount + myRatingsCount;
  const myTotalDone = myWeightsDone + myRatingsDone;

  if (view === "auth") {
    return (
      <div className="app-shell auth-shell">
        <div className="auth-card">
          <h1>Core Delight</h1>
          <p className="subtitle">Decide together. Fair and structured.</p>
          <form className="auth-form" onSubmit={handleAuth}>
            <div className="auth-toggle">
              <button type="button" className={authMode === "login" ? "is-active" : ""} onClick={() => setAuthMode("login")}>
                Login
              </button>
              <button type="button" className={authMode === "register" ? "is-active" : ""} onClick={() => setAuthMode("register")}>
                Register
              </button>
            </div>
            <label className="field">
              <span>Username</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {authError ? <p className="auth-error">{authError}</p> : null}
            <button className="primary-button" type="submit">
              {authMode === "login" ? "Login" : "Register"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (view === "intro") {
    return (
      <div className="app-shell auth-shell">
        <div className="auth-card" style={{ maxWidth: 560 }}>
          <h1>Welcome to Core Delight</h1>
          <p className="subtitle">Make better group decisions, together.</p>
          <div className="intro-content" style={{ display: "grid", gap: 18 }}>
            <div className="intro-step">
              <strong>1. Create or join a voting space</strong>
              <p className="subtitle">Start a voting space and invite others with a simple code.</p>
            </div>
            <div className="intro-step">
              <strong>2. Vote on criteria and alternatives</strong>
              <p className="subtitle">Everyone sets their own weights and rates each option privately.</p>
            </div>
            <div className="intro-step">
              <strong>3. See the group result</strong>
              <p className="subtitle">Our algorithm finds the fairest option and shows consensus insights.</p>
            </div>
            <div className="intro-step">
              <strong>4. Discuss in the discussion panel</strong>
              <p className="subtitle">Use the discussion panel to talk things through after seeing the results.</p>
            </div>
          </div>
          <button className="primary-button" onClick={() => { setView("dashboard"); loadSpaces(); }} type="button">
            Get Started
          </button>
        </div>
      </div>
    );
  }

  if (view === "dashboard") {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Decision Support</p>
            <h1>Core Delight</h1>
            <p className="subtitle">Welcome, {user?.username}.</p>
          </div>
          <div className="topbar-actions">
            <button className="secondary-button" onClick={() => setShowCreate(true)} type="button">
              Create Voting Space
            </button>
            <button className="secondary-button" onClick={logout} type="button">
              Logout
            </button>
          </div>
        </header>

        {showOnboarding ? (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal-card">
              <h2>Welcome to Core Delight</h2>
              <p className="subtitle">A simple way for teams to make fair, structured decisions together.</p>

              <div className="onboarding-steps">
                <div className="onboarding-step">
                  <strong>1. Create or join a voting space</strong>
                  <p>Set up a decision topic and invite teammates with a 6-character code.</p>
                </div>
                <div className="onboarding-step">
                  <strong>2. Vote</strong>
                  <p>Everyone privately rates each option on the criteria that matter. Set your own weights to reflect what you care about.</p>
                </div>
                <div className="onboarding-step">
                  <strong>3. Run the analysis</strong>
                  <p>The algorithm calculates the fairest group choice and shows how much consensus you have.</p>
                </div>
                <div className="onboarding-step">
                  <strong>4. Discuss</strong>
                  <p>Use the discussion panel to talk through results and next steps with your team.</p>
                </div>
              </div>

              <div className="modal-actions">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                  />
                  Don't show this again
                </label>
                <button className="secondary-button" onClick={dismissOnboarding} type="button">
                  Skip
                </button>
                <button className="primary-button" onClick={dismissOnboarding} type="button">
                  Got it
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showCreate ? (
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="section-heading">
              <h2>Create a Voting Space</h2>
              <p>Set up the trip decision and invite others with the voting space code.</p>
            </div>
            <form onSubmit={createSpace} className="create-room-form">
              <div className="two-columns">
                <label className="field">
                  <span>Voting Space Name</span>
                  <input value={spaceName} onChange={(e) => setSpaceName(e.target.value)} placeholder="e.g. Summer Trip 2025" required />
                </label>
                <label className="field">
                  <span>Decision Question</span>
                  <input value={spaceTitle} onChange={(e) => setSpaceTitle(e.target.value)} placeholder="e.g. Where should we travel?" required />
                </label>
              </div>
              <label className="field">
                <span>Brief Description</span>
                <textarea
                  value={spaceDescription}
                  onChange={(e) => setSpaceDescription(e.target.value)}
                  placeholder="e.g. We'll be voting about a trip to Egypt. The voting will include budget, food, and accommodation options."
                  rows={3}
                  maxLength={1000}
                  className="description-textarea"
                />
              </label>
              <div className="two-columns">
                <div>
                  <h4>Alternatives</h4>
                  {spaceAlternatives.map((alt, idx) => (
                    <div className="inline-form" key={idx}>
                      <input value={alt} onChange={(e) => {
                        const next = [...spaceAlternatives];
                        next[idx] = e.target.value;
                        setSpaceAlternatives(next);
                      }} placeholder={`Alternative ${idx + 1}`} required />
                      {spaceAlternatives.length > 1 ? (
                        <button type="button" className="secondary-button" onClick={() => setSpaceAlternatives(spaceAlternatives.filter((_, i) => i !== idx))}>Remove</button>
                      ) : null}
                    </div>
                  ))}
                  <button type="button" className="secondary-button" onClick={() => setSpaceAlternatives([...spaceAlternatives, ""])}>Add Alternative</button>
                </div>
                <div>
                  <h4>Criteria</h4>
                  {spaceCriteria.map((c, idx) => (
                    <div className="inline-form" key={idx}>
                      <input value={c.name} onChange={(e) => {
                        const next = [...spaceCriteria];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setSpaceCriteria(next);
                      }} placeholder="Criterion name" required />
                      <input type="number" min="0" max="100" value={c.weight} onChange={(e) => {
                        const next = [...spaceCriteria];
                        next[idx] = { ...next[idx], weight: Number(e.target.value) };
                        setSpaceCriteria(next);
                      }} style={{ width: 80 }} required />
                      {spaceCriteria.length > 1 ? (
                        <button type="button" className="secondary-button" onClick={() => setSpaceCriteria(spaceCriteria.filter((_, i) => i !== idx))}>Remove</button>
                      ) : null}
                    </div>
                  ))}
                  <button type="button" className="secondary-button" onClick={() => setSpaceCriteria([...spaceCriteria, { name: "", weight: 20 }])}>Add Criterion</button>
                </div>
              </div>
              <div className="form-actions">
                <button className="primary-button" type="submit">Create Space</button>
                <button className="secondary-button" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="section-heading">
            <h2>Join a Voting Space</h2>
            <p>Enter the 6-character invite code.</p>
          </div>
          <form className="inline-form" onSubmit={handleJoinSpace}>
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="VOTING SPACE CODE" maxLength={20} style={{ textTransform: "uppercase" }} />
            <button className="primary-button" type="submit">Join</button>
          </form>
        </div>

        <div className="panel">
          <div className="section-heading">
            <h2>Your Voting Spaces</h2>
          </div>
          {spaces.length === 0 ? (
            <p className="subtitle">No voting spaces yet. Create one or join with a code.</p>
          ) : (
            <div className="space-grid">
              {spaces.map((space) => (
                <div className="space-card" key={space.id} onClick={() => enterSpace(space)}>
                  <h3>{space.name}</h3>
                  <p>{space.title}</p>
                  <span className="space-code">{space.code}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {status ? <div className="panel"><p>{status}</p></div> : null}
      </div>
    );
  }

  // Space view
  const spaceDesc = spaceData?.space?.description || currentSpace?.description || "";

  return (
    <div className="app-shell">
      {/* Notifications */}
      <div className="notification-container">
        {notifications.map((n) => (
          <div key={n.id} className={`notification-toast ${n.type}`}>
            <span>{n.message}</span>
          </div>
        ))}
      </div>

      {/* Away Brief Popup */}
      {showAwayBrief && awayBriefData ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card brief-desc-modal">
            <div className="brief-desc-icon">🔔</div>
            <h2>While you were away</h2>
            <p className="subtitle">{currentSpace?.name}</p>
            <ul className="away-brief-list">
              {awayBriefData.new_messages > 0 ? (
                <li>📨 {awayBriefData.new_messages} new message{awayBriefData.new_messages > 1 ? "s" : ""}</li>
              ) : null}
              {awayBriefData.new_members > 0 ? (
                <li>👤 {awayBriefData.new_members} new member{awayBriefData.new_members > 1 ? "s" : ""} joined</li>
              ) : null}
              {awayBriefData.new_ratings > 0 ? (
                <li>⭐ {awayBriefData.new_ratings} new rating{awayBriefData.new_ratings > 1 ? "s" : ""} submitted</li>
              ) : null}
              {awayBriefData.new_messages === 0 && awayBriefData.new_members === 0 && awayBriefData.new_ratings === 0 ? (
                <li>Nothing new since your last visit.</li>
              ) : null}
            </ul>
            <button className="primary-button" onClick={() => setShowAwayBrief(false)} type="button">
              Got it
            </button>
          </div>
        </div>
      ) : null}

      {/* Brief Description Popup */}
      {showBriefDescription && spaceDesc.trim() ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card brief-desc-modal">
            <div className="brief-desc-icon">📋</div>
            <h2>Brief Description</h2>
            <p className="subtitle">{currentSpace?.name}</p>
            <div className="brief-desc-content">
              <p>{spaceDesc}</p>
            </div>
            <button className="primary-button" onClick={() => setShowBriefDescription(false)} type="button">
              Click to Continue
            </button>
          </div>
        </div>
      ) : null}

      {/* Edit Space Modal */}
      {showEditSpace && currentSpace?.creator_id === user?.id ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h2>Edit Voting Space</h2>
            <p className="subtitle">Update the brief description for {currentSpace?.name}.</p>
            <form onSubmit={handleUpdateSpace} className="create-room-form" style={{ gap: 18 }}>
              <label className="field">
                <span>Brief Description</span>
                <textarea
                  value={editSpaceDescription}
                  onChange={(e) => setEditSpaceDescription(e.target.value)}
                  placeholder="e.g. We'll be voting about a trip to Egypt..."
                  rows={4}
                  maxLength={1000}
                  className="description-textarea"
                />
              </label>
              <div className="form-actions">
                <button className="primary-button" type="submit">Save Changes</button>
                <button className="secondary-button" type="button" onClick={() => setShowEditSpace(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <header className="topbar">
        <div>
          <p className="eyebrow">Voting Space {currentSpace?.code}</p>
          <h1>{currentSpace?.name}</h1>
          <p className="subtitle">{currentSpace?.title}</p>
        </div>
        <div className="topbar-actions">
          {currentSpace?.creator_id === user?.id ? (
            <button
              className="secondary-button"
              onClick={() => {
                setEditSpaceDescription(spaceDesc);
                setShowEditSpace(true);
              }}
              type="button"
            >
              ✏️ Edit Voting Space
            </button>
          ) : null}
          <button className="secondary-button" onClick={() => { setView("dashboard"); setCurrentSpace(null); }} type="button">
            Back to Dashboard
          </button>
          <button className="secondary-button" onClick={logout} type="button">
            Logout
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="workspace">
          <nav className="stepper" aria-label="Space tabs">
            {["Introduction", "Vote", "Results", "Consensus Phase"].map((label) => (
              <button
                key={label}
                className={`step-chip ${spaceTab === label.toLowerCase().replace(" phase", "") ? "is-active" : ""}`}
                onClick={() => setSpaceTab(label.toLowerCase().replace(" phase", ""))}
                type="button"
              >
                {label}
              </button>
            ))}
          </nav>

          {spaceTab === "introduction" ? (
            <div className="panel">
              <div className="section-heading">
                <h2>Introduction</h2>
                <p>Overview of the voting space before you start voting.</p>
              </div>
              <div className="welcome-banner">
                <p className="welcome-text">
                  Hello! You are here to decide on the trip — <strong>{currentSpace?.title}</strong>. Here are your options and the criteria we will use to evaluate them.
                </p>
              </div>
              <div className="intro-panel">
                {spaceDesc.trim() ? (
                  <div className="intro-card">
                    <h4>Description</h4>
                    <p>{spaceDesc}</p>
                  </div>
                ) : null}
                <div className="intro-card status-card">
                  <h4>What's Happening in This Voting Space</h4>
                  <div className="status-grid">
                    <div>
                      <span>Members</span>
                      <strong>{participants.length}</strong>
                    </div>
                    <div>
                      <span>Options</span>
                      <strong>{alternatives.length}</strong>
                    </div>
                    <div>
                      <span>Criteria</span>
                      <strong>{criteria.length}</strong>
                    </div>
                    <div>
                      <span>Voting Progress</span>
                      <strong>{completion}%</strong>
                    </div>
                  </div>
                </div>
                <div className="intro-card">
                  <h4>Decision Question</h4>
                  <p>{currentSpace?.title || "No question set."}</p>
                </div>
                <div className="intro-card">
                  <h4>Alternatives</h4>
                  <ul>
                    {alternatives.length === 0 ? <li>No alternatives configured.</li> : alternatives.map((alt) => <li key={alt}>{alt}</li>)}
                  </ul>
                </div>
                <div className="intro-card">
                  <h4>Criteria</h4>
                  <ul>
                    {criteria.length === 0 ? <li>No criteria configured.</li> : criteria.map((c) => <li key={c.name}>{c.name} <span style={{ color: "var(--muted)" }}>(default weight: {c.weight}%)</span></li>)}
                  </ul>
                </div>
                <div className="intro-card">
                  <h4>Members</h4>
                  <p>{participants.join(", ") || "No members yet."}</p>
                </div>
                <div className="intro-card">
                  <h4>How it works</h4>
                  <p>
                    1. Review the alternatives and criteria above.<br />
                    2. In the <strong>Vote</strong> tab, set your personal weights and rate each alternative on every criterion using a 1–5 scale.<br />
                    3. Once everyone has voted, run the analysis in the <strong>Vote</strong> tab.<br />
                    4. Check the <strong>Results</strong> tab for the group recommendation and consensus status.<br />
                    5. Use the <strong>Consensus Phase</strong> tab to discuss and refine your ratings if needed.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {spaceTab === "vote" ? (
            <div className="panel">
              <div className="section-heading">
                <h2>Vote</h2>
                <p>Rate each alternative on every criterion. Your ratings are saved automatically.</p>
              </div>

              {alternatives.length === 0 || criteria.length === 0 ? (
                <p className="subtitle">This voting space has no alternatives or criteria configured yet.</p>
              ) : (
                <>
                  <div className="vote-progress">
                    <p>
                      Your progress: <strong>{myTotalDone}</strong> / {myTotalCount} submitted (weights + ratings)
                    </p>
                  </div>

                  <div className="rating-stack">
                    <article className="rating-block">
                      <div className="rating-block-header">
                        <h3>Your Criteria Weights</h3>
                        <span>{user?.username}</span>
                      </div>
                      <p className="subtitle" style={{ marginBottom: 12 }}>
                        How important is each criterion to you? (1 = low, 5 = high)
                      </p>
                      <div className="rating-grid">
                        {criteria.map((criterion) => (
                          <div className="rating-row" key={`weight-${criterion.name}`}>
                            <div>
                              <strong>{criterion.name}</strong>
                            </div>
                            <div className="score-picker">
                              {[1, 2, 3, 4, 5].map((score) => {
                                const selected = weightsMap[criterion.name] === score;
                                return (
                                  <button
                                    key={score}
                                    className={`score-button ${selected ? "is-selected" : ""}`}
                                    onClick={() => setWeight(criterion.name, score)}
                                    type="button"
                                  >
                                    {score}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>

                    {alternatives.map((alternative) => (
                      <article className="rating-block" key={alternative}>
                        <div className="rating-block-header">
                          <h3>{alternative}</h3>
                          <span>{user?.username}</span>
                        </div>
                        <div className="rating-grid">
                          {criteria.map((criterion) => (
                            <div className="rating-row" key={`${alternative}-${criterion.name}`}>
                              <div>
                                <strong>{criterion.name}</strong>
                                <p>{criterion.weight}% default weight</p>
                              </div>
                              <div className="score-picker">
                                {[1, 2, 3, 4, 5].map((score) => {
                                  const selected =
                                    ratingsMap[ratingKey(user?.username, alternative, criterion.name)] === score;
                                  return (
                                    <button
                                      key={score}
                                      className={`score-button ${selected ? "is-selected" : ""}`}
                                      onClick={() => setRating(alternative, criterion.name, score)}
                                      type="button"
                                    >
                                      {score}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                  <button className="primary-button" onClick={runAnalysis} type="button" disabled={isSubmitting}>
                    {isSubmitting ? "Analyzing..." : "Run Analysis"}
                  </button>
                </>
              )}
            </div>
          ) : null}

          {spaceTab === "results" ? (
            <div className="panel">
              <div className="section-heading">
                <h2>Results</h2>
                <p>Group decision analysis based on all submitted ratings.</p>
              </div>
              {analysis ? (
                <>
                  {typeof analysis.consensusReached === "boolean" ? (
                    <div className={`vote-progress ${analysis.consensusReached ? "consensus-ok" : "consensus-bad"}`}>
                      <p>
                        <strong>{analysis.consensusReached ? "Consensus reached" : "No consensus reached"}</strong>
                        {analysis.topDeviator ? ` — Top deviator: ${analysis.topDeviator}` : ""}
                        {typeof analysis.entropy === "number" ? ` — Entropy: ${analysis.entropy.toFixed(4)}` : ""}
                      </p>
                    </div>
                  ) : null}
                  <section className="winner-band">
                    <div>
                      <p className="eyebrow">Recommended Option</p>
                      <h2>{analysis.topChoice.alternative}</h2>
                    </div>
                    <div className="winner-stats">
                      <div>
                        <span>Group Score</span>
                        <strong>{analysis.topChoice.avgScore.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span>Acceptability</span>
                        <strong>{analysis.topChoice.acceptabilityNormalized}</strong>
                      </div>
                    </div>
                  </section>

                  <section className="result-grid">
                    <div className="result-column">
                      <h3>Why this option leads</h3>
                      <ul className="clean-list">
                        {analysis.insights.map((insight) => (
                          <li key={insight}>{insight}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="result-column">
                      <h3>Ranking</h3>
                      <div className="ranking-list">
                        {analysis.results.map((result, index) => (
                          <div className="ranking-row" key={result.alternative}>
                            <div className="ranking-meta">
                              <span>{index + 1}</span>
                              <strong>{result.alternative}</strong>
                            </div>
                            <div className="ranking-bar">
                              <div
                                className="ranking-fill"
                                style={{ width: `${result.acceptabilityNormalized * 100}%` }}
                              />
                            </div>
                            <span>{result.acceptabilityNormalized}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="result-column">
                    <h3>Next Moderation Steps</h3>
                    <ul className="clean-list">
                      {analysis.consensusSteps.map((stepLine) => (
                        <li key={stepLine}>{stepLine}</li>
                      ))}
                    </ul>
                  </section>
                </>
              ) : (
                <div className="empty-state">
                  <p>Run the analysis from the Vote tab to see results here.</p>
                  <button className="primary-button" onClick={() => setSpaceTab("vote")} type="button">
                    Go to Vote
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {spaceTab === "consensus" ? (
            <div className="panel">
              <div className="section-heading">
                <h2>Consensus Phase</h2>
                <p>Review the consensus status, discuss, and adjust your ratings to align the group.</p>
              </div>
              {analysis ? (
                <div className="consensus-panel">
                  {analysis.consensusReached ? (
                    <div className="consensus-ok-card">
                      <h4>✅ Consensus Reached</h4>
                      <p>The group is well-aligned. Entropy: {analysis.entropy?.toFixed(4)}.</p>
                    </div>
                  ) : (
                    <div className="deviator-card">
                      <h4>⚠️ Consensus Not Reached</h4>
                      <p>Top deviator: <strong>{analysis.topDeviator || "Unknown"}</strong>. Entropy: {analysis.entropy?.toFixed(4)}.</p>
                      <p style={{ marginTop: 8 }}>Consider discussing the differences and adjusting your ratings to improve alignment.</p>
                    </div>
                  )}

                  <div className="intro-card">
                    <h4>Moderation Steps</h4>
                    <ul className="clean-list">
                      {analysis.consensusSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="intro-card">
                    <h4>Quick Re-vote</h4>
                    <p className="subtitle" style={{ marginBottom: 12 }}>
                      Adjust your ratings below to help the group reach consensus.
                    </p>
                    <div className="rating-stack">
                      <article className="rating-block">
                        <div className="rating-block-header">
                          <h3>Your Criteria Weights</h3>
                          <span>{user?.username}</span>
                        </div>
                        <div className="rating-grid">
                          {criteria.map((criterion) => (
                            <div className="rating-row" key={`consensus-weight-${criterion.name}`}>
                              <div>
                                <strong>{criterion.name}</strong>
                              </div>
                              <div className="score-picker">
                                {[1, 2, 3, 4, 5].map((score) => {
                                  const selected = weightsMap[criterion.name] === score;
                                  return (
                                    <button
                                      key={score}
                                      className={`score-button ${selected ? "is-selected" : ""}`}
                                      onClick={() => setWeight(criterion.name, score)}
                                      type="button"
                                    >
                                      {score}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>

                      {alternatives.map((alternative) => (
                        <article className="rating-block" key={`consensus-${alternative}`}>
                          <div className="rating-block-header">
                            <h3>{alternative}</h3>
                            <span>{user?.username}</span>
                          </div>
                          <div className="rating-grid">
                            {criteria.map((criterion) => (
                              <div className="rating-row" key={`consensus-${alternative}-${criterion.name}`}>
                                <div>
                                  <strong>{criterion.name}</strong>
                                  <p>{criterion.weight}% default weight</p>
                                </div>
                                <div className="score-picker">
                                  {[1, 2, 3, 4, 5].map((score) => {
                                    const selected =
                                      ratingsMap[ratingKey(user?.username, alternative, criterion.name)] === score;
                                    return (
                                      <button
                                        key={score}
                                        className={`score-button ${selected ? "is-selected" : ""}`}
                                        onClick={() => setRating(alternative, criterion.name, score)}
                                        type="button"
                                      >
                                        {score}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                    <button className="primary-button" onClick={runAnalysis} type="button" disabled={isSubmitting} style={{ marginTop: 16 }}>
                      {isSubmitting ? "Analyzing..." : "Re-run Analysis"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No analysis available yet. Run the analysis from the Vote tab first.</p>
                  <button className="primary-button" onClick={() => setSpaceTab("vote")} type="button">
                    Go to Vote
                  </button>
                </div>
              )}
            </div>
          ) : null}

        </section>

        <aside className="sidebar">
          {spaceDesc.trim() ? (
            <section className="sidebar-panel">
              <button
                className="brief-desc-button"
                onClick={() => setShowBriefDescription(true)}
                type="button"
                style={{ display: 'flex', width: '100%', justifyContent: 'center' }}
              >
                📋 Brief Description
              </button>
            </section>
          ) : null}
          <section className="sidebar-panel discussion-sidebar-panel">
            <div className="section-heading">
              <h3>Discussion</h3>
            </div>
            <div className="discussion-messages sidebar-discussion-messages">
              {messages.map((msg) => (
                <div className={`discussion-message ${msg.author === user?.username ? "is-me" : ""}`} key={msg.id}>
                  <span className="discussion-author">{msg.author}</span>
                  <span className="discussion-content">{msg.content}</span>
                  <span className="discussion-time">{new Date(msg.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="inline-form discussion-form" onSubmit={sendMessage}>
              <input value={messageDraft} onChange={(e) => setMessageDraft(e.target.value)} placeholder="Type a message..." />
              <button className="primary-button" type="submit">Send</button>
            </form>
          </section>

          <section className="sidebar-panel">
            <p className="eyebrow">Voting Space Info</p>
            <h3>{currentSpace?.name}</h3>
            <p className="subtitle">Code: <strong>{currentSpace?.code}</strong></p>
            <p className="subtitle">Share this code to invite others.</p>
          </section>

          <section className="sidebar-panel">
            <h3>Members</h3>
            <div className="chip-list">
              {participants.map((p) => (
                <span className="editable-chip" key={p}>{p}</span>
              ))}
            </div>
          </section>

          <section className="sidebar-panel">
            <div className="progress-head">
              <h3>Group Voting Progress</h3>
              <span>{completion}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${completion}%` }} />
            </div>
            <dl className="stats-list">
              <div>
                <dt>Members</dt>
                <dd>{participants.length}</dd>
              </div>
              <div>
                <dt>Options</dt>
                <dd>{alternatives.length}</dd>
              </div>
              <div>
                <dt>Criteria</dt>
                <dd>{criteria.length}</dd>
              </div>
            </dl>
          </section>

          <section className="sidebar-panel">
            <h3>Status</h3>
            <p>{status || "Ready"}</p>
          </section>
        </aside>
      </main>
    </div>
  );
}

export default App;
