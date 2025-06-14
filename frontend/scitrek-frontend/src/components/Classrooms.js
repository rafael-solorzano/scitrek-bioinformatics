// src/components/Classrooms.js
import React, { useState, useEffect } from 'react';
import { getClassrooms, getCurrentUser, addToRoster } from '../services/api';
import './Classrooms.css';

const Classrooms = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [user, setUser]             = useState(null);
  const [joinedIds, setJoinedIds]   = useState([]);
  const [error, setError]           = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        // fetch current student (to get their username & current classroom)
        const me = await getCurrentUser();
        setUser(me);

        // fetch all available classrooms
        const list = await getClassrooms();
        setClassrooms(list);

        // if they’re already in a class, mark it
        if (me.classroom) {
          // NOTE: me.classroom is the name—if you need id you'll have to adjust backend,
          // but we can track joined by name for now:
          const joined = list.find(c => c.name === me.classroom);
          if (joined) setJoinedIds([joined.id]);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load classrooms.');
      }
    };
    load();
  }, []);

  const handleJoin = async classroomId => {
    try {
      await addToRoster(classroomId, user.username);
      setJoinedIds(ids => [...ids, classroomId]);
    } catch (err) {
      console.error(err);
      setError('Failed to join classroom.');
    }
  };

  return (
    <div className="classrooms">
      <h3>Available Classrooms</h3>
      {error && <p className="error">{error}</p>}
      <ul>
        {classrooms.map(room => (
          <li key={room.id}>
            <span className="room-name">{room.name}</span>
            {joinedIds.includes(room.id) ? (
              <button disabled className="joined-btn">
                Joined
              </button>
            ) : (
              <button
                onClick={() => handleJoin(room.id)}
                className="join-btn"
              >
                Join
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Classrooms;
