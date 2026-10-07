import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPageDetails } from '../services/api';
import parseTajweed from '../utils/tajweedParser';

const MushafPage = () => {
    const { pageNumber } = useParams();
    const navigate = useNavigate();
    const [pageData, setPageData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [playingAudio, setPlayingAudio] = useState(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [fontSize, setFontSize] = useState(2.2);

    const audioRef = useRef(new Audio());
    const verseRefs = useRef({});

    const handleZoomIn = () => setFontSize(prev => Math.min(prev + 0.2, 4.0));
    const handleZoomOut = () => setFontSize(prev => Math.max(prev - 0.2, 1.2));
    const handleResetZoom = () => setFontSize(2.2);

    useEffect(() => {
        const fetchPage = async () => {
            setLoading(true);
            const data = await getPageDetails(
                pageNumber,
                localStorage.getItem('selectedReciter') || 'ar.alafasy',
                localStorage.getItem('selectedScript') || 'quran-tajweed'
            );
            if (data) {
                setPageData(data);
            }
            setLoading(false);
        };
        fetchPage();
    }, [pageNumber]);

    useEffect(() => {
        audioRef.current.playbackRate = playbackSpeed;
    }, [playbackSpeed]);

    const handlePlay = (audioUrl) => {
        if (playingAudio === audioUrl) {
            audioRef.current.pause();
            setPlayingAudio(null);
        } else {
            audioRef.current.src = audioUrl;
            audioRef.current.play();
            setPlayingAudio(audioUrl);
            audioRef.current.onended = () => setPlayingAudio(null);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loader"></div>
                <p>Duke ngarkuar faqen {pageNumber}...</p>
            </div>
        );
    }

    if (!pageData) return <div className="error">Faqja nuk u gjet.</div>;

    const currentPage = parseInt(pageNumber);
    const surahNames = [...new Set(pageData.verses.map(v => v.surah.englishName))].join(' & ');

    return (
        <div className="surah-detail">
            <header className="detail-header scrolled">
                <div className="header-top">
                    <Link to="/" className="back-link">← Ballina</Link>

                    <div className="zoom-controls">
                        <span className="zoom-label">Zmadhimi:</span>
                        <button onClick={handleZoomOut} title="Zvogëlo tekstin" className="zoom-btn">-</button>
                        <span className="zoom-value">{Math.round((fontSize / 2.2) * 100)}%</span>
                        <button onClick={handleZoomIn} title="Rrite tekstin" className="zoom-btn">+</button>
                        <button onClick={handleResetZoom} title="Rikthe madhësinë" className="zoom-reset-btn">↺</button>
                    </div>

                    <div className="page-navigation-controls" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            disabled={currentPage <= 1}
                            onClick={() => navigate(`/page/${currentPage - 1}`)}
                            className="nav-button"
                        >
                            Faqja Para
                        </button>
                        <span className="current-page-display">Faqja {currentPage}</span>
                        <button
                            disabled={currentPage >= 604}
                            onClick={() => navigate(`/page/${currentPage + 1}`)}
                            className="nav-button"
                        >
                            Faqja Tjetër
                        </button>
                    </div>
                </div>

                <div className="compact-controls">
                    <h2 className="surah-title-compact">{surahNames}</h2>
                    <div className="playback-speed-control">
                        <select
                            value={playbackSpeed}
                            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                            className="repetition-select"
                        >
                            <option value={0.5}>0.5x</option>
                            <option value={0.75}>0.75x</option>
                            <option value={1}>1x</option>
                            <option value={1.25}>1.25x</option>
                            <option value={1.5}>1.5x</option>
                            <option value={2}>2x</option>
                        </select>
                    </div>
                </div>
            </header>

            <div className="verses-list mushaf-layout">
                <div className="mushaf-container">
                    {pageData.verses.map((verse) => (
                        <span
                            key={verse.number}
                            className={`mushaf-verse ${playingAudio === verse.audio ? 'highlight-text' : ''}`}
                            onClick={() => handlePlay(verse.audio)}
                            ref={el => verseRefs.current[verse.audio] = el}
                        >
                            {verse.numberInSurah === 1 && (
                                <div className="surah-start-marker" style={{
                                    display: 'block',
                                    textAlign: 'center',
                                    width: '100%',
                                    margin: '2rem 0',
                                    padding: '1rem',
                                    background: 'var(--color-primary-light)',
                                    borderRadius: '8px',
                                    fontSize: '1.5rem',
                                    color: 'var(--color-primary)',
                                    fontWeight: 'bold'
                                }}>
                                    Sura {verse.surah.name}
                                </div>
                            )}
                            <span className="mushaf-arabic" style={{ fontSize: `${fontSize}rem` }}>
                                {(!localStorage.getItem('selectedScript') || localStorage.getItem('selectedScript') === 'quran-tajweed')
                                    ? parseTajweed(verse.text)
                                    : verse.text}
                            </span>
                            <span className="verse-separator">
                                <span className="separator-square">
                                    {verse.numberInSurah.toLocaleString('ar-EG')}
                                </span>
                            </span>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MushafPage;
