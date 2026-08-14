import React, { useState, useEffect } from 'react';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import { getCurrentUser, fetchInbox, toggleReadMessage } from '../services/api';
import '../styles/scitrek-ui.css';
import './Inbox.css';

const formatDate = dateStr => {
  const d = new Date(dateStr);
  const pad = n => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const Inbox = () => {
  const [user, setUser] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const [me, msgs] = await Promise.all([getCurrentUser(), fetchInbox()]);
        setUser(me);
        setMessages(msgs);
      } catch (err) {
        console.error('Failed to load inbox', err);
      }
    })();
  }, []);

  if (!user) return <div className="loading">Loading…</div>;

  const unreadCount = messages.filter(m => !m.is_read).length;
  const filteredMessages = messages.filter(message => {
    const matchesFilter = filter === 'all' || (filter === 'unread' ? !message.is_read : message.is_read);
    const searchText = `${message.subject} ${message.body || ''}`.toLowerCase();
    return matchesFilter && searchText.includes(query.toLowerCase());
  });

  const openMessage = async msg => {
    if (!msg.is_read) {
      try {
        await toggleReadMessage(msg.id, true);
      } catch (e) {
        console.error('Could not mark read', e);
      }
    }
    setMessages(ms => ms.map(m => (m.id === msg.id ? { ...m, is_read: true } : m)));
    setSelectedMessage({ ...msg, is_read: true });
  };

  const closeMessageDetail = () => setSelectedMessage(null);
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  return (
    <>
      <StudentProfileBanner
        user={user}
        onLogout={() => setPopupVisible(true)}
        variant="modern"
      />

      <div className="inbox-page st-surface">
        <div className="inbox-card">
          <div className="inbox-header">
            <div>
              <p className="st-kicker">Messages</p>
              <h2>SciTrek Inbox ({unreadCount} Unread)</h2>
              <p>Scan module tips, welcome notes, and classroom updates.</p>
            </div>
            <div className="inbox-summary" aria-label={`${messages.length} total messages`}>
              <strong>{messages.length}</strong>
              <span>Total</span>
            </div>
          </div>

          <div className="inbox-toolbar">
            <label className="inbox-search">
              <span>Search inbox</span>
              <i className="fa fa-search" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search subject or message"
              />
            </label>
            <div className="inbox-filters" aria-label="Inbox filters">
              {['all', 'unread', 'read'].map(option => (
                <button
                  key={option}
                  type="button"
                  className={filter === option ? 'is-active' : ''}
                  onClick={() => setFilter(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="inbox-layout">
            <table className="inbox-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {messages.length === 0 && (
                  <tr>
                    <td colSpan="2">
                      <div className="inbox-empty">No messages yet.</div>
                    </td>
                  </tr>
                )}
                {messages.length > 0 && filteredMessages.length === 0 && (
                  <tr>
                    <td colSpan="2">
                      <div className="inbox-empty">No messages match your filters.</div>
                    </td>
                  </tr>
                )}
                {filteredMessages.map(msg => (
                  <tr
                    key={msg.id}
                    className={`${msg.is_read ? '' : 'unread'} ${selectedMessage?.id === msg.id ? 'selected' : ''}`}
                    onClick={() => openMessage(msg)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openMessage(msg);
                      }
                    }}
                    role="button"
                    aria-label={`${msg.subject}${msg.is_read ? '' : ' unread'}`}
                    tabIndex={0}
                  >
                    <td>
                      <div className="message-subject">
                        <span className="message-dot" aria-hidden="true" />
                        <span>{msg.subject}</span>
                        {!msg.is_read && <span className="badge-unread">Unread</span>}
                      </div>
                      {msg.body && <p className="message-preview">Preview: {msg.body}</p>}
                    </td>
                    <td>{formatDate(msg.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <aside className={`message-detail ${selectedMessage ? 'is-open' : ''}`}>
              {selectedMessage ? (
                <>
                  <button
                    type="button"
                    className="inbox-close"
                    onClick={closeMessageDetail}
                    aria-label="Close message"
                  >
                    <i className="fa fa-times" aria-hidden="true" />
                  </button>
                  <p className="st-kicker">Message detail</p>
                  <h3>{selectedMessage.subject}</h3>
                  <p className="message-date">
                    <strong>Date:</strong> {formatDate(selectedMessage.timestamp)}
                  </p>
                  <p className="message-body">{selectedMessage.body}</p>
                </>
              ) : (
                <div className="message-placeholder">
                  <i className="fa fa-envelope-open-o" aria-hidden="true" />
                  <strong>Select a message</strong>
                  <span>Open a row to read the full note.</span>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      {popupVisible && (
        <Popup
          message="Are you sure you want to logout?"
          onCancel={() => setPopupVisible(false)}
          onConfirm={handleLogout}
        />
      )}
    </>
  );
};

export default Inbox;
