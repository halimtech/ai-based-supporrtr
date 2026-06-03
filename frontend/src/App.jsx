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
  const [view, setView] = useState("auth"); // auth, intro, dashboard, room
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [ratingsMap, setRatingsMap] = useState({});
  const [weightsMap, setWeightsMap] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [roomTab, setRoomTab] = useState("vote"); // vote, results, chat
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef(null);

  // Auth form state
  const [authMode, setAuthMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Create room state
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomAlternatives, setRoomAlternatives] = useState([""]);
  const [roomCriteria, setRoomCriteria] = useState([{ name: "", weight: 20 }]);

  // Brief description popup state
  const [showBriefDescription, setShowBriefDescription] = useState(false);

  // Join room state
  const [joinCode, setJoinCode] = useState("");

  // Onboarding modal state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (token) {
      api("/api/me")
        .then((r) => r.json())
        .then((data) => {
          setUser(data);
          setView("dashboard");
          loadRooms();
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
    if (view === "room" && currentRoom) {
      const interval = setInterval(() => {
        loadRoom(currentRoom.id);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [view, currentRoom]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function loadRooms() {
    try {
      const res = await api("/api/rooms");
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch {
      setStatus("Could not load rooms.");
    }
  }

  async function loadRoom(roomId) {
    try {
      const res = await api(`/api/rooms/${roomId}`);
      const data = await res.json();
      setRoomData(data);
      setMessages(data.messages || []);
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
    } catch {
      setStatus("Could not load room.");
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
        loadRooms();
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
    setRooms([]);
    setCurrentRoom(null);
    setRoomData(null);
  }

  function dismissOnboarding() {
    if (dontShowAgain) {
      localStorage.setItem("onboardingDisabled", "1");
    }
    setShowOnboarding(false);
  }

  async function createRoom(e) {
    e.preventDefault();
    const alts = roomAlternatives.map((a) => a.trim()).filter(Boolean);
    const crits = roomCriteria.map((c) => ({ name: c.name.trim(), weight: Number(c.weight) || 0 })).filter((c) => c.name);
    if (!roomName.trim() || !roomTitle.trim() || alts.length === 0 || crits.length === 0) {
      setStatus("Please fill in all fields.");
      return;
    }
    try {
      const res = await api("/api/rooms", {
        method: "POST",
        body: JSON.stringify({ name: roomName.trim(), title: roomTitle.trim(), description: roomDescription.trim(), alternatives: alts, criteria: crits }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.detail || "Could not create room.");
        return;
      }
      setShowCreate(false);
      setRoomName("");
      setRoomTitle("");
      setRoomDescription("");
      setRoomAlternatives([""]);
      setRoomCriteria([{ name: "", weight: 20 }]);
      loadRooms();
      enterRoom(data.room);
    } catch {
      setStatus("Network error while creating room.");
    }
  }

  async function handleJoinRoom(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      const res = await api("/api/rooms/join", {
        method: "POST",
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.detail || "Could not join room.");
        return;
      }
      setJoinCode("");
      loadRooms();
      enterRoom(data.room);
    } catch {
      setStatus("Network error while joining room.");
    }
  }

  function enterRoom(room) {
    setCurrentRoom(room);
    setAnalysis(null);
    setRoomTab("vote");
    // Show brief description popup if the room has a description
    const desc = room.description;
    if (desc && desc.trim()) {
      setShowBriefDescription(true);
    } else {
      setShowBriefDescription(false);
    }
    setView("room");
    loadRoom(room.id);
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!messageDraft.trim() || !currentRoom) return;
    try {
      await api(`/api/rooms/${currentRoom.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: messageDraft.trim() }),
      });
      setMessageDraft("");
      loadRoom(currentRoom.id);
    } catch {
      setStatus("Failed to send message.");
    }
  }

  async function setWeight(criterion, value) {
    if (!currentRoom || !user) return;
    try {
      await api(`/api/rooms/${currentRoom.id}/weights`, {
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
    if (!currentRoom || !user) return;
    try {
      await api(`/api/rooms/${currentRoom.id}/ratings`, {
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
    if (!currentRoom) return;
    setIsSubmitting(true);
    setStatus("Analyzing...");
    try {
      const res = await api(`/api/rooms/${currentRoom.id}/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.detail || "Analysis failed.");
        return;
      }
      setAnalysis(data);
      setRoomTab("results");
      setStatus("Analysis complete.");
    } catch {
      setStatus("Analysis request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const participants = roomData?.members?.map((m) => m.username) || [];
  const alternatives = roomData?.room?.alternatives || [];
  const criteria = roomData?.room?.criteria || [];

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
              <strong>1. Create or join a room</strong>
              <p className="subtitle">Start a decision room and invite others with a simple code.</p>
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
              <strong>4. Discuss in the chat</strong>
              <p className="subtitle">Use the chat tab to talk things through after seeing the results.</p>
            </div>
          </div>
          <button className="primary-button" onClick={() => { setView("dashboard"); loadRooms(); }} type="button">
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
              Create Room
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
                  <strong>1. Create or join a room</strong>
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
                  <p>Use the chat to talk through results and next steps with your team.</p>
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
              <h2>Create a Voting Room</h2>
              <p>Set up the trip decision and invite others with the room code.</p>
            </div>
            <form onSubmit={createRoom} className="create-room-form">
              <div className="two-columns">
                <label className="field">
                  <span>Room Name</span>
                  <input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. Summer Trip 2025" required />
                </label>
                <label className="field">
                  <span>Decision Question</span>
                  <input value={roomTitle} onChange={(e) => setRoomTitle(e.target.value)} placeholder="e.g. Where should we travel?" required />
                </label>
              </div>
              <label className="field">
                <span>Brief Description</span>
                <textarea
                  value={roomDescription}
                  onChange={(e) => setRoomDescription(e.target.value)}
                  placeholder="e.g. We'll be voting about a trip to Egypt. The voting will include budget, food, and accommodation options."
                  rows={3}
                  maxLength={1000}
                  className="description-textarea"
                />
              </label>
              <div className="two-columns">
                <div>
                  <h4>Alternatives</h4>
                  {roomAlternatives.map((alt, idx) => (
                    <div className="inline-form" key={idx}>
                      <input value={alt} onChange={(e) => {
                        const next = [...roomAlternatives];
                        next[idx] = e.target.value;
                        setRoomAlternatives(next);
                      }} placeholder={`Alternative ${idx + 1}`} required />
                      {roomAlternatives.length > 1 ? (
                        <button type="button" className="secondary-button" onClick={() => setRoomAlternatives(roomAlternatives.filter((_, i) => i !== idx))}>Remove</button>
                      ) : null}
                    </div>
                  ))}
                  <button type="button" className="secondary-button" onClick={() => setRoomAlternatives([...roomAlternatives, ""])}>Add Alternative</button>
                </div>
                <div>
                  <h4>Criteria</h4>
                  {roomCriteria.map((c, idx) => (
                    <div className="inline-form" key={idx}>
                      <input value={c.name} onChange={(e) => {
                        const next = [...roomCriteria];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setRoomCriteria(next);
                      }} placeholder="Criterion name" required />
                      <input type="number" min="0" max="100" value={c.weight} onChange={(e) => {
                        const next = [...roomCriteria];
                        next[idx] = { ...next[idx], weight: Number(e.target.value) };
                        setRoomCriteria(next);
                      }} style={{ width: 80 }} required />
                      {roomCriteria.length > 1 ? (
                        <button type="button" className="secondary-button" onClick={() => setRoomCriteria(roomCriteria.filter((_, i) => i !== idx))}>Remove</button>
                      ) : null}
                    </div>
                  ))}
                  <button type="button" className="secondary-button" onClick={() => setRoomCriteria([...roomCriteria, { name: "", weight: 20 }])}>Add Criterion</button>
                </div>
              </div>
              <div className="form-actions">
                <button className="primary-button" type="submit">Create Room</button>
                <button className="secondary-button" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="section-heading">
            <h2>Join a Room</h2>
            <p>Enter the 6-character invite code.</p>
          </div>
          <form className="inline-form" onSubmit={handleJoinRoom}>
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="ROOM CODE" maxLength={20} style={{ textTransform: "uppercase" }} />
            <button className="primary-button" type="submit">Join</button>
          </form>
        </div>

        <div className="panel">
          <div className="section-heading">
            <h2>Your Rooms</h2>
          </div>
          {rooms.length === 0 ? (
            <p className="subtitle">No rooms yet. Create one or join with a code.</p>
          ) : (
            <div className="room-grid">
              {rooms.map((room) => (
                <div className="room-card" key={room.id} onClick={() => enterRoom(room)}>
                  <h3>{room.name}</h3>
                  <p>{room.title}</p>
                  <span className="room-code">{room.code}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {status ? <div className="panel"><p>{status}</p></div> : null}
      </div>
    );
  }

  // Room view
  const roomDesc = roomData?.room?.description || currentRoom?.description || "";

  return (
    <div className="app-shell">
      {/* Brief Description Popup */}
      {showBriefDescription && roomDesc.trim() ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card brief-desc-modal">
            <div className="brief-desc-icon">📋</div>
            <h2>Brief Description</h2>
            <p className="subtitle">{currentRoom?.name}</p>
            <div className="brief-desc-content">
              <p>{roomDesc}</p>
            </div>
            <button className="primary-button" onClick={() => setShowBriefDescription(false)} type="button">
              Click to Continue
            </button>
          </div>
        </div>
      ) : null}

      <header className="topbar">
        <div>
          <p className="eyebrow">Room {currentRoom?.code}</p>
          <h1>{currentRoom?.name}</h1>
          <p className="subtitle">{currentRoom?.title}</p>
        </div>
        <div className="topbar-actions">
          {roomDesc.trim() ? (
            <button className="brief-desc-button" onClick={() => setShowBriefDescription(true)} type="button">
              📋 Brief Description
            </button>
          ) : null}
          <button className="secondary-button" onClick={() => { setView("dashboard"); setCurrentRoom(null); }} type="button">
            Back to Dashboard
          </button>
          <button className="secondary-button" onClick={logout} type="button">
            Logout
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="workspace">
          <nav className="stepper" aria-label="Room tabs">
            {["Vote", "Results", "Chat"].map((label) => (
              <button
                key={label}
                className={`step-chip ${roomTab === label.toLowerCase() ? "is-active" : ""}`}
                onClick={() => setRoomTab(label.toLowerCase())}
                type="button"
              >
                {label}
              </button>
            ))}
          </nav>

          {roomTab === "vote" ? (
            <div className="panel">
              <div className="section-heading">
                <h2>Vote</h2>
                <p>Rate each alternative on every criterion. Your ratings are saved automatically.</p>
              </div>

              {alternatives.length === 0 || criteria.length === 0 ? (
                <p className="subtitle">This room has no alternatives or criteria configured yet.</p>
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
                        How important is each criterion to you? (1 = low, 9 = high)
                      </p>
                      <div className="rating-grid">
                        {criteria.map((criterion) => (
                          <div className="rating-row" key={`weight-${criterion.name}`}>
                            <div>
                              <strong>{criterion.name}</strong>
                            </div>
                            <div className="score-picker">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((score) => {
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
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((score) => {
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

          {roomTab === "results" ? (
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
                  <button className="primary-button" onClick={() => setRoomTab("vote")} type="button">
                    Go to Vote
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {roomTab === "chat" ? (
            <div className="panel chat-panel">
              <div className="section-heading">
                <h2>Discussion</h2>
                <p>Talk about the decision and share your thoughts.</p>
              </div>
              <div className="chat-messages">
                {messages.map((msg) => (
                  <div className={`chat-message ${msg.author === user?.username ? "is-me" : ""}`} key={msg.id}>
                    <span className="chat-author">{msg.author}</span>
                    <span className="chat-content">{msg.content}</span>
                    <span className="chat-time">{new Date(msg.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form className="inline-form chat-form" onSubmit={sendMessage}>
                <input value={messageDraft} onChange={(e) => setMessageDraft(e.target.value)} placeholder="Type a message..." />
                <button className="primary-button" type="submit">Send</button>
              </form>
            </div>
          ) : null}
        </section>

        <aside className="sidebar">
          <section className="sidebar-panel">
            <p className="eyebrow">Room Info</p>
            <h3>{currentRoom?.name}</h3>
            <p className="subtitle">Code: <strong>{currentRoom?.code}</strong></p>
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
