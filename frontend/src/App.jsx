import { useEffect, useState, useRef } from "react";
import { api, ratingKey } from "./lib/api";
import RatingPanel from "./components/RatingPanel";
import IntroView from "./components/IntroView";
import Sidebar from "./components/Sidebar";
import Notifications from "./components/Notifications";
import OnboardingModal from "./components/modals/OnboardingModal";
import EditProfileModal from "./components/modals/EditProfileModal";
import CreateSpaceForm from "./components/modals/CreateSpaceForm";
import EditSpaceModal from "./components/modals/EditSpaceModal";
import EditConfigModal from "./components/modals/EditConfigModal";
import BriefDescriptionModal from "./components/modals/BriefDescriptionModal";
import AwayBriefModal from "./components/modals/AwayBriefModal";

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
  const [spaceTab, setSpaceTab] = useState("introduction"); // introduction, vote, consensus, results
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messagesInitialScrollRef = useRef(false);

  // Auth form state
  const [authMode, setAuthMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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

  // Edit profile state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState("");

  // Edit alternatives/criteria state
  const [showEditConfig, setShowEditConfig] = useState(false);
  const [editAlternatives, setEditAlternatives] = useState([]);
  const [editCriteria, setEditCriteria] = useState([]);

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
          setUser({ id: data.id, username: data.username, name: data.name });
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
    if (messagesContainerRef.current && messages.length > 0) {
      const container = messagesContainerRef.current;
      const threshold = 100;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
      if (!messagesInitialScrollRef.current || isNearBottom) {
        container.scrollTop = container.scrollHeight;
        messagesInitialScrollRef.current = true;
      }
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
          const authorName = latest.author_name || latest.author;
          addNotification(`New message from ${authorName}`, "info");
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
    const body = authMode === "register" ? { username, password, name: name || username } : { username, password };
    try {
      const res = await api(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.detail || "Something went wrong.");
        return;
      }
      const t = data.user.token;
      localStorage.setItem("token", t);
      setToken(t);
      setUser({ id: data.user.id, username: data.user.username, name: data.user.name });
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

  async function handleUpdateProfile(e) {
    e.preventDefault();
    try {
      const res = await api("/api/me", {
        method: "PUT",
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.detail || "Could not update profile.");
        return;
      }
      setUser((prev) => ({ ...prev, name: data.name }));
      setShowEditProfile(false);
      setStatus("Profile updated.");
    } catch {
      setStatus("Network error while updating profile.");
    }
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
    // Reset messages scroll so we scroll to bottom on first load
    messagesInitialScrollRef.current = false;
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

  async function handleUpdateConfig(e) {
    e.preventDefault();
    if (!currentSpace) return;
    const alts = editAlternatives.map((a) => a.trim()).filter(Boolean);
    const crits = editCriteria.map((c) => ({ name: c.name.trim(), weight: Number(c.weight) || 0 })).filter((c) => c.name);
    if (alts.length === 0 || crits.length === 0) {
      setStatus("Please provide at least one alternative and one criterion.");
      return;
    }
    try {
      const res = await api(`/api/spaces/${currentSpace.id}`, {
        method: "PUT",
        body: JSON.stringify({ alternatives: alts, criteria: crits }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.detail || "Could not update voting space.");
        return;
      }
      setShowEditConfig(false);
      setStatus("Space updated.");
      loadSpace(currentSpace.id);
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
      setSpaceTab("consensus");
      setStatus("Analysis complete.");
      addNotification("Analysis complete! Consensus Phase is ready.", "success");
    } catch {
      setStatus("Analysis request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const participants = spaceData?.members?.map((m) => m.username) || [];
  const memberDisplayMap = (spaceData?.members || []).reduce((map, m) => {
    map[m.username] = m.name || m.username;
    return map;
  }, {});
  const displayName = (username) => memberDisplayMap[username] || username;
  const participantNames = spaceData?.members?.map((m) => m.name || m.username) || [];
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
            {authMode === "register" ? (
              <label className="field">
                <span>Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your display name" required />
              </label>
            ) : null}
            <label className="field">
              <span>Username</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {authError ? <p className="auth-error shake">{authError}</p> : null}
            <button className="primary-button" type="submit">
              {authMode === "login" ? "Login" : "Register"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (view === "intro") {
    return <IntroView onGetStarted={() => { setView("dashboard"); loadSpaces(); }} />;
  }

  if (view === "dashboard") {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Decision Support</p>
            <h1>Core Delight</h1>
            <p className="subtitle">Welcome, {user?.name || user?.username}.</p>
          </div>
          <div className="topbar-actions">
            <button
              className="secondary-button"
              onClick={() => { setEditName(user?.name || user?.username || ""); setShowEditProfile(true); }}
              type="button"
            >
              Edit Profile
            </button>
            <button className="secondary-button" onClick={() => setShowCreate(true)} type="button">
              Create Voting Space
            </button>
            <button className="secondary-button" onClick={logout} type="button">
              Logout
            </button>
          </div>
        </header>

        {showOnboarding ? (
          <OnboardingModal
            dontShowAgain={dontShowAgain}
            setDontShowAgain={setDontShowAgain}
            onDismiss={dismissOnboarding}
          />
        ) : null}

        {showEditProfile ? (
          <EditProfileModal
            editName={editName}
            setEditName={setEditName}
            onSubmit={handleUpdateProfile}
            onClose={() => setShowEditProfile(false)}
          />
        ) : null}

        {showCreate ? (
          <CreateSpaceForm
            spaceName={spaceName}
            setSpaceName={setSpaceName}
            spaceTitle={spaceTitle}
            setSpaceTitle={setSpaceTitle}
            spaceDescription={spaceDescription}
            setSpaceDescription={setSpaceDescription}
            spaceAlternatives={spaceAlternatives}
            setSpaceAlternatives={setSpaceAlternatives}
            spaceCriteria={spaceCriteria}
            setSpaceCriteria={setSpaceCriteria}
            onSubmit={createSpace}
            onCancel={() => setShowCreate(false)}
          />
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
    <div className="app-shell space-view">
      <Notifications notifications={notifications} />

      {showAwayBrief && awayBriefData ? (
        <AwayBriefModal
          data={awayBriefData}
          spaceName={currentSpace?.name}
          onClose={() => setShowAwayBrief(false)}
        />
      ) : null}

      {showBriefDescription && spaceDesc.trim() ? (
        <BriefDescriptionModal
          spaceName={currentSpace?.name}
          description={spaceDesc}
          onClose={() => setShowBriefDescription(false)}
        />
      ) : null}

      {showEditSpace ? (
        <EditSpaceModal
          value={editSpaceDescription}
          setValue={setEditSpaceDescription}
          spaceName={currentSpace?.name}
          onSubmit={handleUpdateSpace}
          onClose={() => setShowEditSpace(false)}
        />
      ) : null}

      {showEditConfig ? (
        <EditConfigModal
          alternatives={editAlternatives}
          setAlternatives={setEditAlternatives}
          criteria={editCriteria}
          setCriteria={setEditCriteria}
          spaceName={currentSpace?.name}
          onSubmit={handleUpdateConfig}
          onClose={() => setShowEditConfig(false)}
        />
      ) : null}

      <header className="topbar">
        <div>
          <p className="eyebrow">Voting Space {currentSpace?.code}</p>
          <h1>{currentSpace?.name}</h1>
          <p className="subtitle">{currentSpace?.title}</p>
        </div>
        <div className="topbar-actions">
          {currentSpace ? (
            <>
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
              <button
                className="secondary-button"
                onClick={() => {
                  setEditAlternatives([...alternatives]);
                  setEditCriteria(criteria.map((c) => ({ ...c })));
                  setShowEditConfig(true);
                }}
                type="button"
              >
                ✏️ Edit Alternatives & Criteria
              </button>
            </>
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
            {["Introduction", "Vote", "Consensus Phase", "Results"].map((label) => (
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
                  <p>{participantNames.join(", ") || "No members yet."}</p>
                </div>
                <div className="intro-card">
                  <h4>How it works</h4>
                  <p>
                    1. Review the alternatives and criteria above.<br />
                    2. In the <strong>Vote</strong> tab, set how important each criterion is to you and rate every option from <strong>Strongly Disliked</strong> to <strong>Strongly Preferred</strong>.<br />
                    3. Once everyone has voted, run the analysis in the <strong>Vote</strong> tab.<br />
                    4. Check the <strong>Consensus Phase</strong> tab for the consensus status and refine your ratings if needed.<br />
                    5. Check the <strong>Results</strong> tab for the group recommendation and ranking.
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

                  <RatingPanel
                    criteria={criteria}
                    alternatives={alternatives}
                    weightsMap={weightsMap}
                    ratingsMap={ratingsMap}
                    username={user?.username}
                    ownerLabel={user?.name || user?.username}
                    onWeight={setWeight}
                    onRating={setRating}
                    weightsHint={'How important is each criterion to you? Pick a label from "Not Important" to "Essential".'}
                  />
                  <button className="primary-button" onClick={runAnalysis} type="button" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className="loading-dots">Analyzing<span>.</span><span>.</span><span>.</span></span>
                    ) : (
                      "Run Analysis"
                    )}
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
                    <div className={`vote-progress ${analysis.consensusReached ? "consensus-ok pulse-green" : "consensus-bad pulse-red"}`}>
                      <p>
                        <strong>{analysis.consensusReached ? "The group agrees 🎉" : "The group hasn't agreed yet"}</strong>
                        {typeof analysis.agreementStrength === "number"
                          ? ` — Agreement strength: ${analysis.agreementStrength}% (a clear decision needs ${analysis.agreementThreshold ?? 50}%)`
                          : ""}
                        {analysis.topDeviator ? ` — Most different opinion: ${displayName(analysis.topDeviator)}` : ""}
                      </p>
                    </div>
                  ) : null}
                  <section className="winner-band bounce">
                    <div>
                      <p className="eyebrow">Recommended Option</p>
                      <h2>{analysis.topChoice.alternative}</h2>
                      <p className="winner-explainer">
                        In {Math.round(analysis.topChoice.acceptabilityNormalized * 100)}% of tested
                        scenarios, <strong>{analysis.topChoice.alternative}</strong> is the group's top choice.
                      </p>
                    </div>
                    <div className="winner-stats">
                      <div>
                        <span>Group Score</span>
                        <strong>{analysis.topChoice.avgScore.toFixed(2)} / 5</strong>
                        <small className="stat-hint">Average rating the group gave this option</small>
                      </div>
                      <div>
                        <span>Top-Choice Confidence</span>
                        <strong>{Math.round(analysis.topChoice.acceptabilityNormalized * 100)}%</strong>
                        <small className="stat-hint">How often it comes out on top</small>
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
                      <p className="subtitle" style={{ marginBottom: 12 }}>
                        How often each option is the group's top choice.
                      </p>
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
                            <span>{Math.round(result.acceptabilityNormalized * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="result-column">
                    <h3>Suggested Next Steps</h3>
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
                <p>See how close the group is to agreeing, talk it through, and update your ratings to get closer.</p>
              </div>
              {analysis !== undefined ? (
                <div className="consensus-panel">
                  <div className="intro-card">
                    <h4>What "agreement" means here</h4>
                    <p>
                      Agreement strength shows how strongly the group leans towards one option. The group has
                      a clear, settled decision once it reaches <strong>50%</strong> or more.
                      Below that, opinions are still split and it's worth talking it through.
                    </p>
                  </div>
                  {analysis ? (
                    <>
                      {analysis.consensusReached ? (
                        <div className="consensus-ok-card">
                          <h4>✅ The group agrees</h4>
                          <p>Everyone is well-aligned. Agreement strength: {analysis.agreementStrength}% (a clear decision needs {analysis.agreementThreshold ?? 50}%).</p>
                        </div>
                      ) : (
                        <div className="deviator-card">
                          <h4>⚠️ The group hasn't agreed yet</h4>
                          <p>Agreement strength: <strong>{analysis.agreementStrength}%</strong> (a clear decision needs {analysis.agreementThreshold ?? 50}%). Most different opinion: <strong>{displayName(analysis.topDeviator) || "Unknown"}</strong>.</p>
                          <p style={{ marginTop: 8 }}>Try discussing where opinions differ and updating your ratings to get closer together.</p>
                        </div>
                      )}

                      <div className="intro-card">
                        <h4>What to do next</h4>
                        <ul className="clean-list">
                          {analysis.consensusSteps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <div className="intro-card">
                      <h4>Results need refreshing</h4>
                      <p>You've updated your ratings. Press <strong>Re-run Analysis</strong> at the bottom to see the latest agreement strength and group result.</p>
                    </div>
                  )}

                  <div className="intro-card">
                    <h4>Quick Re-vote</h4>
                    <p className="subtitle" style={{ marginBottom: 12 }}>
                      Adjust your ratings below to help the group reach consensus.
                    </p>
                    <RatingPanel
                      criteria={criteria}
                      alternatives={alternatives}
                      weightsMap={weightsMap}
                      ratingsMap={ratingsMap}
                      username={user?.username}
                      ownerLabel={user?.name || user?.username}
                      onWeight={setWeight}
                      onRating={setRating}
                      keyPrefix="consensus-"
                    />
                    <button className="primary-button" onClick={runAnalysis} type="button" disabled={isSubmitting} style={{ marginTop: 16 }}>
                      {isSubmitting ? (
                        <span className="loading-dots">Analyzing<span>.</span><span>.</span><span>.</span></span>
                      ) : (
                        "Re-run Analysis"
                      )}
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

        <Sidebar
          spaceDesc={spaceDesc}
          onShowBriefDescription={() => setShowBriefDescription(true)}
          messages={messages}
          user={user}
          messagesContainerRef={messagesContainerRef}
          messagesEndRef={messagesEndRef}
          messageDraft={messageDraft}
          setMessageDraft={setMessageDraft}
          onSendMessage={sendMessage}
          currentSpace={currentSpace}
          participantNames={participantNames}
          participants={participants}
          alternatives={alternatives}
          criteria={criteria}
          completion={completion}
          status={status}
        />
      </main>
    </div>
  );
}

export default App;
