import React from 'react';
import './ResourceSection.css';

const resources = [
  {
    id: 1,
    title: 'NIH NCBI',
    description:
      "The NIH's National Center for Biotechnology Information. Used for biomedical and genetic tools/data.",
    link: 'https://www.ncbi.nlm.nih.gov/',
    image: '/images/NCBI_logo.png',
  },
  {
    id: 2,
    title: 'UniProt',
    description:
      'The Universal Protein Resource. Can be used to find protein sequences and functional information.',
    link: 'https://www.uniprot.org/',
    image: '/images/Uniprot-logo.img.svg.png',
  },
  {
    id: 3,
    title: 'Protein Data Bank (PDB)',
    description:
      'The Protein Data Bank can be used to view the 3D structures of large molecules.',
    link: 'https://www.rcsb.org/',
    image: '/images/PDB_logo.png',
  },
];

const ResourceSection = () => (
  <section className="ft-resources">
    <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
      Bioinformatics Resources
    </h2>
    <div className="ft-resource-container">
      {resources.map((resource) => (
        <div className="ft-resource" key={resource.id}>
          <div className="ft-resource-photo">
            <img src={resource.image} alt={resource.title} />
          </div>
          <div className="ft-resource-info">
            <h3>
              <a href={resource.link} target="_blank" rel="noreferrer">
                {resource.title}
              </a>
            </h3>
            <p>{resource.description}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default ResourceSection;
