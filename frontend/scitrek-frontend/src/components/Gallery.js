import React, { useState, useEffect, useRef } from 'react';
import './Gallery.css';

const slides = [
  {
    id: 1,
    title: 'DNMT3A Enzyme',
    description:
      '“The human DNA cytosine methyltransferase 3A (DNMT3A) is our current focus. This enzyme plays essential roles in early development, and inappropriately, in cancer cells.” – Prof. Norbert Reich',
    mediaType: 'video',
    mediaSrc: '/images/6BRR-camera-spin.mp4',
    extra: (
      <p>
        <strong>Lab Website:</strong>{' '}
        <a
          href="https://reich.chem.ucsb.edu/"
          target="_blank"
          rel="noreferrer"
        >
          Reich Lab at UC Santa Barbara
        </a>
      </p>
    ),
  },
  {
    id: 2,
    title:
      'Dr. Morrissey Works to Harness Immune Cells for Novel Cancer Therapies',
    description:
      '“Morrissey is developing immunotherapies that target a different cell type: macrophages. Macrophages are the scouts, or sentinels, of the immune system… Understanding the signaling pathways that control macrophage behavior is critical for designing new therapies.”',
    mediaType: 'image',
    mediaSrc: '/images/prof_morrissey.jpg',
    extra: (
      <p>
        <strong>Article:</strong>{' '}
        <a
          href="https://doi.org/10.1016/j.ajhg.2020.12.013"
          target="_blank"
          rel="noreferrer"
        >
          Prof. Morrissey honored by the American Cancer Society
        </a>
      </p>
    ),
  },
  {
    id: 3,
    title: 'Cancer Screening is as Good as Treatment',
    description:
      'Improvements in cancer prevention and screening have averted more deaths from five cancer types combined over the past 45 years than treatment advances, according to a modeling study led by researchers at the National Institutes of Health (NIH). The study, published Dec. 5, 2024, in JAMA Oncology, looked at deaths from breast, cervical, colorectal, lung, and prostate cancer that were averted by the combination of prevention, screening, and treatment advances.',
    mediaType: 'image',
    mediaSrc: '/images/cancer_screening.jpg',
    extra: (
      <p>
        <strong>News Article:</strong> In five cancer types, prevention and screening have been major contributors to saving lives
      </p>
    ),
  },
  {
    id: 4,
    title:
      'The Promise of Genomics Cannot be Fully Achieved Without a Diverse Workforce',
    description:
      'Studies have shown that enhancing the diversity of the research workforce fosters innovation and creativity, which arise from the variety of perspectives that emerge when not everyone is thinking in the same way... The field of genomics is affected by the same problematic lack of diversity that plagues and hampers the US research and clinical workforces.',
    mediaType: 'image',
    mediaSrc: '/images/genomic_variation.jpg',
    extra: (
      <p>
        <strong>doi:</strong> 10.1016/j.ajhg.2020.12.013
      </p>
    ),
  },
];

const Gallery = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const intervalRef = useRef(null);
  const slideCount = slides.length;

  // Start or restart the auto-advance timer
  const startAutoAdvance = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setCurrentSlide((prevIndex) => (prevIndex + 1) % slideCount);
    }, 10000);
  };

  useEffect(() => {
    startAutoAdvance();
    return () => clearInterval(intervalRef.current);
  }, [slideCount]);

  // When a dot is clicked, reset the timer and navigate to the selected slide
  const goToSlide = (index) => {
    clearInterval(intervalRef.current);
    setCurrentSlide(index);
    startAutoAdvance();
  };

  return (
    <div className="gallery">
      <div
        className="gallery-content"
        style={{
          width: `${100 * slideCount}%`,
          transform: `translateX(-${currentSlide * (100 / slideCount)}%)`,
        }}
      >
        {slides.map((slide) => (
          <div
            className="gallery-slide"
            key={slide.id}
            style={{ width: `${100 / slideCount}%` }}
          >
            <div className="gallery-text">
              <h2>{slide.title}</h2>
              <p>{slide.description}</p>
              {slide.extra}
            </div>
            <div className="gallery-media">
              {slide.mediaType === 'video' ? (
                <video autoPlay loop muted style={{ maxWidth: '100%' }}>
                  <source src={slide.mediaSrc} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img
                  src={slide.mediaSrc}
                  alt={slide.title}
                  style={{ maxWidth: '100%' }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="carousel-indicators">
        {slides.map((_, index) => (
          <span
            key={index}
            className={`indicator ${currentSlide === index ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default Gallery;
