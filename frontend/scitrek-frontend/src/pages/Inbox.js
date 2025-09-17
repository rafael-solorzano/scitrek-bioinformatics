import React, { useState, useEffect } from 'react';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import { getCurrentUser, fetchInbox, toggleReadMessage } from '../services/api';
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
      <StudentProfileBanner user={user} onLogout={() => setPopupVisible(true)} />

      <div className="inbox-page">
        <div className="inbox-card">
          <div className="inbox-header">
            <h2>SciTrek Inbox ({unreadCount} Unread)</h2>
          </div>

          <table className="inbox-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {messages.map(msg => (
                <tr
                  key={msg.id}
                  className={msg.is_read ? '' : 'unread'}
                  onClick={() => openMessage(msg)}
                >
                  <td>
                    {msg.subject}
                    {!msg.is_read && <span className="badge-unread"> Unread</span>}
                  </td>
                  <td>{formatDate(msg.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedMessage && (
          <div className="message-detail">
            <button
              type="button"
              className="inbox-close"
              onClick={closeMessageDetail}
              aria-label="Close message"
            >
              <i className="fa fa-times" aria-hidden="true" />
            </button>
            <h3>{selectedMessage.subject}</h3>
            <p>
              <strong>Date:</strong> {formatDate(selectedMessage.timestamp)}
            </p>
            <p>{selectedMessage.body}</p>
          </div>
        )}
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
