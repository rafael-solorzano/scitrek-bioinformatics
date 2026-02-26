import React from 'react';
import './TeamSection.css';

const teamMembers = [
  {
    id: 1,
    name: 'Dr. Norbert Reich',
    title: 'Principal Investigator',
    image: '/images/norbert_reich.jpg',
  },
  {
    id: 2,
    name: 'Rafael Solorzano',
    title: 'PhD Student Researcher',
    image: '/images/rafael_solorzano.jpg',
  },
  {
    id: 3,
    name: 'Dr. Gulistan Tansik',
    title: 'SciTrek Lead',
    image: '/images/gulistan_tansik.jpg',
  },
  {
    id: 4,
    name: 'Katherine Duong',
    title: 'Undergraduate Researcher',
    image: '/images/508163475_1390561868826848_8944077399625485398_n.jpg',
  },
  {
    id: 5,
    name: 'Andy Subramanian',
    title: 'Undergraduate Researcher',
    image: '/images/1663562562136.jpeg',
  },
  {
    id: 6,
    name: 'Brian Ngan',
    title: 'Undergraduate Researcher',
    image: '/images/IMG_3708.jpg',
  },
];

const TeamSection = () => (
  <section className="team-section">
    <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Meet Our Team</h2>
    <div className="team-container">
      {teamMembers.map((member) => (
        <div className="team-member" key={member.id}>
          <div className="team-photo">
            <img src={member.image} alt={member.name || 'Team member'} />
          </div>
          <div className="team-info">
            <h3>{member.name}</h3>
            <p>{member.title}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default TeamSection;
