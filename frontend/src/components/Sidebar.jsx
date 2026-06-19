// Right-hand sidebar of the space view: brief description shortcut, chat,
// space info, members, and progress.
export default function Sidebar({
  spaceDesc,
  onShowBriefDescription,
  messages,
  user,
  messagesContainerRef,
  messagesEndRef,
  messageDraft,
  setMessageDraft,
  onSendMessage,
  currentSpace,
  participantNames,
  participants,
  alternatives,
  criteria,
  completion,
  status,
}) {
  return (
    <aside className="sidebar">
      {spaceDesc.trim() ? (
        <section className="sidebar-panel">
          <button
            className="brief-desc-button"
            onClick={onShowBriefDescription}
            type="button"
            style={{ display: "flex", width: "100%", justifyContent: "center" }}
          >
            📋 Brief Description
          </button>
        </section>
      ) : null}
      <section className="sidebar-panel chat-sidebar-panel">
        <div className="section-heading">
          <h3>Chat</h3>
        </div>
        <div className="chat-messages sidebar-chat-messages" ref={messagesContainerRef}>
          {messages.map((msg) => (
            <div className={`chat-message ${msg.author === user?.username ? "is-me" : ""}`} key={msg.id}>
              <span className="chat-author">{msg.author_name || msg.author}</span>
              <span className="chat-content">{msg.content}</span>
              <span className="chat-time">{new Date(msg.created_at).toLocaleTimeString()}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form className="inline-form chat-form" onSubmit={onSendMessage}>
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
          {participantNames.map((p) => (
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
  );
}
