import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSurahDetails } from '../services/api';
import parseTajweed from '../utils/tajweedParser';

const SurahDetail = () => {
    const { number } = useParams();
    const [surah, setSurah] = useState(null);
    const [loading, setLoading] = useState(true);
    const [playingAudio, setPlayingAudio] = useState(null);
    const [isPlayingAll, setIsPlayingAll] = useState(false);

    // State for repetition counts
    const [repetitionCounts, setRepetitionCounts] = useState({});
    const [repetitionProgress, setRepetitionProgress] = useState(1);

    // State for Surah repetition
    const [surahRepetitionTarget, setSurahRepetitionTarget] = useState(1);
    const [surahRepetitionCurrent, setSurahRepetitionCurrent] = useState(1);

    // Refs
    const audioRef = useRef(new Audio());
    const activeVerseRef = useRef(null);
    const verseRefs = useRef({});
    const currentRepetition = useRef(1);

    // Fetch Surah Data
    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            const selectedReciter = localStorage.getItem('selectedReciter') || 'ar.alafasy';
            const selectedScript = localStorage.getItem('selectedScript') || 'quran-tajweed';
            const data = await getSurahDetails(number, selectedReciter, selectedScript);
            setSurah(data);
            setLoading(false);
        };
        fetchDetails();

        // Cleanup on unmount or surah change
        return () => {
            audioRef.current.pause();
            setPlayingAudio(null);
            setIsPlayingAll(false);
            currentRepetition.current = 1;
            setRepetitionProgress(1);
            setSurahRepetitionCurrent(1);
            setSurahRepetitionTarget(1);
        };
    }, [number]);

    // Handle Play/Pause for individual verse
    const handlePlay = (audioUrl) => {
        // If playing all, stop it to switch to manual control
        if (isPlayingAll) setIsPlayingAll(false);

        if (playingAudio === audioUrl) {
            audioRef.current.pause();
            setPlayingAudio(null);
        } else {
            // New verse started, reset repetition
            currentRepetition.current = 1;
            setRepetitionProgress(1);
            audioRef.current.src = audioUrl;
            audioRef.current.play();
            setPlayingAudio(audioUrl);
        }
    };

    // Start "Play All"
    const handlePlayAll = () => {
        if (!surah || !surah.verses.length) return;
        setIsPlayingAll(!isPlayingAll);

        if (!isPlayingAll) {
            // Start from the first verse if nothing is playing, or continue current
            const startingAudio = playingAudio || surah.verses[0].audio;
            if (startingAudio !== playingAudio) {
                // Determine if we should reset repetition. logic: 
                // If we are resuming the SAME verse, maybe we shouldn't reset?
                // But for simplicity, if we start Play All, let's reset or just let it flow.
                // If starting fresh:
                currentRepetition.current = 1;
                setRepetitionProgress(1);
            }
            // Logic for surah repetition reset: if starting from beginning (or near it), maybe reset?
            // Let's reset if it's the first verse, otherwise keep.
            if (startingAudio === surah.verses[0].audio) {
                setSurahRepetitionCurrent(1);
            }

            audioRef.current.src = startingAudio;
            audioRef.current.play();
            setPlayingAudio(startingAudio);
        } else {
            audioRef.current.pause();
            // optional: reset playingAudio if we want to stop completely
            // setPlayingAudio(null); 
        }
    };

    // Audio Event Listeners (Sequential Playback)
    useEffect(() => {
        const handleEnded = () => {
            if (!playingAudio) return;

            const targetCount = repetitionCounts[playingAudio] || 1;

            if (currentRepetition.current < targetCount) {
                // Repeat same verse
                currentRepetition.current += 1;
                setRepetitionProgress(currentRepetition.current);
                audioRef.current.currentTime = 0;
                audioRef.current.play();
                return;
            }

            // Finished repetitions for this verse
            currentRepetition.current = 1; // Reset for next usage
            setRepetitionProgress(1);

            if (isPlayingAll && surah) {
                // Find current index
                const currentIndex = surah.verses.findIndex(v => v.audio === playingAudio);
                if (currentIndex !== -1 && currentIndex < surah.verses.length - 1) {
                    // Play next
                    const nextVerse = surah.verses[currentIndex + 1];
                    audioRef.current.src = nextVerse.audio;
                    audioRef.current.play();
                    setPlayingAudio(nextVerse.audio);
                } else {
                    // Finished last verse of Surah
                    // Check for Surah Repetition
                    if (surahRepetitionCurrent < surahRepetitionTarget) {
                        setSurahRepetitionCurrent(prev => prev + 1);
                        // Loop back to first verse
                        const firstVerse = surah.verses[0];
                        audioRef.current.src = firstVerse.audio;
                        audioRef.current.play();
                        setPlayingAudio(firstVerse.audio);
                    } else {
                        // Really finished everything
                        setIsPlayingAll(false);
                        setPlayingAudio(null);
                        setSurahRepetitionCurrent(1);
                    }
                }
            } else {
                setPlayingAudio(null);
            }
        };

        audioRef.current.addEventListener('ended', handleEnded);
        return () => {
            audioRef.current.removeEventListener('ended', handleEnded);
        };
    }, [isPlayingAll, playingAudio, surah, repetitionCounts, surahRepetitionTarget, surahRepetitionCurrent]);

    // Auto-scroll Effect
    useEffect(() => {
        if (playingAudio && verseRefs.current[playingAudio]) {
            verseRefs.current[playingAudio].scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [playingAudio]);

    // Helper to generate options 1-99
    const repetitionOptions = Array.from({ length: 99 }, (_, i) => i + 1);

    if (loading) return <div className="loading">Loading Surah...</div>;
    if (!surah) return <div className="loading">Surah not found.</div>;

    return (
        <div className="surah-detail-container">
            <div className="detail-header">
                <Link to="/" className="back-link">← Back to Surahs</Link>
                <div className="header-content">
                    <h1 className="detail-title">{surah.name}</h1>
                    <p className="detail-subtitle">{surah.englishName} • {surah.numberOfAyahs} Verses</p>

                    <div className="play-all-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                        <div className="surah-controls" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button
                                className={`play-all-button ${isPlayingAll ? 'active' : ''}`}
                                onClick={handlePlayAll}
                            >
                                {isPlayingAll ? '❚❚ Pause Recitation' : '▶ Play Full Surah'}
                            </button>

                            <div className="surah-repetition-control" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>Repeat Surah:</span>
                                <select
                                    className="repetition-select"
                                    style={{ width: 'auto' }}
                                    value={surahRepetitionTarget}
                                    onChange={(e) => setSurahRepetitionTarget(parseInt(e.target.value))}
                                >
                                    {repetitionOptions.map(num => (
                                        <option key={num} value={num}>x{num}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {isPlayingAll && surahRepetitionTarget > 1 && (
                            <div className="surah-repetition-status" style={{
                                color: 'var(--color-primary)',
                                fontWeight: '600',
                                backgroundColor: 'var(--color-primary-light)',
                                padding: '0.5rem 1rem',
                                borderRadius: '20px',
                                fontSize: '0.9rem'
                            }}>
                                Surah Loop: {surahRepetitionCurrent} / {surahRepetitionTarget}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="verses-list">
                <div className="bismillah">
                    بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                </div>

                {surah.verses.map((verse) => (
                    <div
                        key={verse.number}
                        className={`verse-container ${playingAudio === verse.audio ? 'highlight-verse' : ''}`}
                        ref={el => verseRefs.current[verse.audio] = el}
                    >
                        <div className="verse-actions">
                            <span className="verse-number">{verse.numberInSurah}</span>
                            <div className="audio-controls">
                                <button
                                    className={`play-button ${playingAudio === verse.audio ? 'playing' : ''}`}
                                    onClick={() => handlePlay(verse.audio)}
                                >
                                    {playingAudio === verse.audio ? '❚❚' : '▶'}
                                </button>

                                <select
                                    className="repetition-select"
                                    value={repetitionCounts[verse.audio] || 1}
                                    onChange={(e) => setRepetitionCounts({
                                        ...repetitionCounts,
                                        [verse.audio]: parseInt(e.target.value)
                                    })}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {repetitionOptions.map(num => (
                                        <option key={num} value={num}>x{num}</option>
                                    ))}
                                </select>

                                {playingAudio === verse.audio && (repetitionCounts[verse.audio] || 1) > 1 && (
                                    <div className="repetition-counter">
                                        {repetitionProgress} / {repetitionCounts[verse.audio]}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="verse-content">
                            <p className="arabic-text">
                                {(!localStorage.getItem('selectedScript') || localStorage.getItem('selectedScript') === 'quran-tajweed')
                                    ? parseTajweed(verse.text)
                                    : verse.text}
                            </p>
                            <p className="translation-text">{verse.translation}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SurahDetail;
