// Transient toast notifications shown in the corner of the space view.
export default function Notifications({ notifications }) {
  return (
    <div className="notification-container">
      {notifications.map((n) => (
        <div key={n.id} className={`notification-toast ${n.type}`}>
          <span>{n.message}</span>
        </div>
      ))}
    </div>
  );
}
