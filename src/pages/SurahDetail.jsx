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
    const [showTranslation, setShowTranslation] = useState(true);
    const [viewMode, setViewMode] = useState('list'); // 'list', 'page', or 'tanzil'

    // State for repetition counts
    const [repetitionCounts, setRepetitionCounts] = useState({});
    const [repetitionProgress, setRepetitionProgress] = useState(1);

    // State for Surah repetition
    const [surahRepetitionTarget, setSurahRepetitionTarget] = useState(1);
    const [surahRepetitionCurrent, setSurahRepetitionCurrent] = useState(1);
    const [ayahRepetitionTarget, setAyahRepetitionTarget] = useState(1);

    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [isScrolled, setIsScrolled] = useState(false);
    const [learnedVerses, setLearnedVerses] = useState({});

    // Recording State
    const [recordingVerse, setRecordingVerse] = useState(null);
    const [recordedAudio, setRecordedAudio] = useState({}); // { verseId: blobUrl }

    // Refs
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
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

    // Load learned verses from local storage
    useEffect(() => {
        const stored = localStorage.getItem('learnedVerses');
        if (stored) {
            setLearnedVerses(JSON.parse(stored));
        }
    }, []);

    // Toggle learned status
    const toggleLearned = (verseNumber) => {
        const key = `${number}:${verseNumber}`;
        const newLearned = { ...learnedVerses, [key]: !learnedVerses[key] };
        setLearnedVerses(newLearned);
        localStorage.setItem('learnedVerses', JSON.stringify(newLearned));
        localStorage.setItem('learnedVerses', JSON.stringify(newLearned));
    };

    // Recording Functions
    const startRecording = async (verseKey) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setRecordedAudio(prev => ({ ...prev, [verseKey]: audioUrl }));

                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setRecordingVerse(verseKey);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access microphone. Please allow permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && recordingVerse) {
            mediaRecorderRef.current.stop();
            setRecordingVerse(null);
        }
    };

    const deleteRecording = (verseKey) => {
        setRecordedAudio(prev => {
            const newState = { ...prev };
            // Optional: revoke object URL to free memory if needed, though React might handle it or it's negligible for short clips
            // URL.revokeObjectURL(newState[verseKey]); 
            delete newState[verseKey];
            return newState;
        });
    };

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

            const targetCount = isPlayingAll
                ? ayahRepetitionTarget
                : (repetitionCounts[playingAudio] || 1);

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

    // Playback Speed Effect
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed, playingAudio]);

    // Scroll Detection Effect
    useEffect(() => {
        const handleScroll = () => {
            const offset = window.scrollY;
            if (offset > 100) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Helper to generate options 1-99
    const repetitionOptions = Array.from({ length: 99 }, (_, i) => i + 1);

    if (loading) return <div className="loading">Loading Surah...</div>;
    if (!surah) return <div className="loading">Surah not found.</div>;

    return (
        <div className="surah-detail-container">
            <div className={`detail-header ${isScrolled ? 'scrolled' : ''}`}>
                <Link to="/" className="back-link">← Back to Surahs</Link>
                <div className="header-content">
                    <h1 className="detail-title">{surah.name}</h1>
                    <p className="detail-subtitle">{surah.englishName} • {surah.numberOfAyahs} Verses</p>

                    <div className="play-all-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
                        <div className="surah-controls" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            background: 'var(--color-bg)',
                            padding: '0.5rem',
                            borderRadius: '50px',
                            border: '1px solid var(--color-border)'
                        }}>
                            <button
                                className={`play-all-button ${isPlayingAll ? 'active' : ''}`}
                                onClick={handlePlayAll}
                                style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                            >
                                {isPlayingAll ? '❚❚ Pause' : '▶ Play All'}
                            </button>

                            <div className="control-divider" style={{ width: '1px', height: '20px', background: 'var(--color-border)' }}></div>

                            <div className="surah-repetition-control" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', border: 'none', padding: 0, background: 'none' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>Ayah:</span>
                                <select
                                    className="repetition-select"
                                    style={{ width: 'auto', padding: '0.2rem', fontSize: '0.8rem' }}
                                    value={ayahRepetitionTarget}
                                    onChange={(e) => setAyahRepetitionTarget(parseInt(e.target.value))}
                                >
                                    <option value={1}>1x</option>
                                    <option value={2}>2x</option>
                                    <option value={3}>3x</option>
                                    <option value={4}>4x</option>
                                    <option value={5}>5x</option>
                                    <option value={10}>10x</option>
                                </select>
                            </div>

                            <div className="surah-repetition-control" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', border: 'none', padding: 0, background: 'none' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>Surah:</span>
                                <select
                                    className="repetition-select"
                                    style={{ width: 'auto', padding: '0.2rem', fontSize: '0.8rem' }}
                                    value={surahRepetitionTarget}
                                    onChange={(e) => setSurahRepetitionTarget(parseInt(e.target.value))}
                                >
                                    <option value={1}>1x</option>
                                    <option value={2}>2x</option>
                                    <option value={3}>3x</option>
                                    <option value={4}>4x</option>
                                    <option value={5}>5x</option>
                                    <option value={10}>Loop</option>
                                </select>
                            </div>

                            <div className="control-divider" style={{ width: '1px', height: '20px', background: 'var(--color-border)' }}></div>

                            <div className="playback-speed-control" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>Speed:</span>
                                <select
                                    className="repetition-select"
                                    style={{ width: 'auto', padding: '0.2rem', fontSize: '0.8rem' }}
                                    value={playbackSpeed}
                                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                                >
                                    <option value={0.5}>0.5x</option>
                                    <option value={0.75}>0.75x</option>
                                    <option value={1}>1x</option>
                                    <option value={1.25}>1.25x</option>
                                    <option value={1.5}>1.5x</option>
                                    <option value={2}>2x</option>
                                </select>
                            </div>

                            <div className="control-divider" style={{ width: '1px', height: '20px', background: 'var(--color-border)' }}></div>

                            <button
                                onClick={() => setShowTranslation(!showTranslation)}
                                style={{
                                    background: showTranslation ? 'var(--color-primary)' : 'var(--color-bg)',
                                    color: showTranslation ? 'white' : 'var(--color-text)',
                                    border: '1px solid var(--color-border)',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '20px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontWeight: '500'
                                }}
                            >
                                {showTranslation ? 'Hide Translation' : 'Show Translation'}
                            </button>

                            <div className="control-divider" style={{ width: '1px', height: '20px', background: 'var(--color-border)' }}></div>

                            <button
                                onClick={() => {
                                    if (viewMode === 'list') setViewMode('page');
                                    else if (viewMode === 'page') setViewMode('tanzil');
                                    else setViewMode('list');
                                }}
                                style={{
                                    background: (viewMode === 'page' || viewMode === 'tanzil') ? 'var(--color-primary)' : 'var(--color-bg)',
                                    color: (viewMode === 'page' || viewMode === 'tanzil') ? 'white' : 'var(--color-text)',
                                    border: '1px solid var(--color-border)',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '20px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontWeight: '500'
                                }}
                            >
                                {viewMode === 'list' ? 'Mus\'haf View' : viewMode === 'page' ? 'Tanzil View' : 'List View'}
                            </button>
                        </div>

                        {isPlayingAll && (surahRepetitionTarget > 1 || ayahRepetitionTarget > 1) && (
                            <div className="surah-repetition-status" style={{
                                color: 'var(--color-primary)',
                                fontWeight: '600',
                                fontSize: '0.8rem',
                                display: 'flex',
                                gap: '1rem',
                                marginTop: '-0.25rem'
                            }}>
                                {surahRepetitionTarget > 1 && <span>Surah: {surahRepetitionCurrent}/{surahRepetitionTarget}</span>}
                                {ayahRepetitionTarget > 1 && <span>Ayah: {repetitionProgress}/{ayahRepetitionTarget}</span>}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className={`verses-list ${viewMode === 'page' ? 'mushaf-layout' : ''}`}>
                <div className="bismillah">
                    بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                </div>

                {viewMode === 'list' ? (
                    surah.verses.map((verse) => (
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

                                    <div
                                        className="learned-checkbox-container"
                                        onClick={(e) => { e.stopPropagation(); toggleLearned(verse.numberInSurah); }}
                                        title="Mark as learned"
                                        style={{
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginTop: '0.25rem'
                                        }}
                                    >
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '4px',
                                            border: '1px solid #000',
                                            backgroundColor: learnedVerses[`${surah.number}:${verse.numberInSurah}`] ? 'var(--color-primary)' : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}>
                                            {learnedVerses[`${surah.number}:${verse.numberInSurah}`] && (
                                                <span style={{ color: 'white', fontSize: '14px', lineHeight: 1 }}>✓</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="recording-controls" style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem', justifyContent: 'center' }}>
                                        {!recordingVerse && !recordedAudio[`${surah.number}:${verse.numberInSurah}`] && (
                                            <button
                                                className="record-button"
                                                onClick={(e) => { e.stopPropagation(); startRecording(`${surah.number}:${verse.numberInSurah}`); }}
                                                title="Record your recitation"
                                            >
                                                🎤
                                            </button>
                                        )}

                                        {recordingVerse === `${surah.number}:${verse.numberInSurah}` && (
                                            <button
                                                className="stop-button"
                                                onClick={(e) => { e.stopPropagation(); stopRecording(); }}
                                                title="Stop recording"
                                            >
                                                ⏹
                                            </button>
                                        )}

                                        {recordedAudio[`${surah.number}:${verse.numberInSurah}`] && (
                                            <>
                                                <button
                                                    className="play-recording-button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const audio = new Audio(recordedAudio[`${surah.number}:${verse.numberInSurah}`]);
                                                        audio.play();
                                                    }}
                                                    title="Play your recording"
                                                >
                                                    👤▶
                                                </button>
                                                <button
                                                    className="delete-recording-button"
                                                    onClick={(e) => { e.stopPropagation(); deleteRecording(`${surah.number}:${verse.numberInSurah}`); }}
                                                    title="Delete recording"
                                                >
                                                    🗑
                                                </button>
                                            </>
                                        )}
                                    </div>

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
                                {showTranslation && <p className="translation-text">{verse.translation}</p>}
                            </div>
                        </div>
                    ))
                ) : viewMode === 'page' ? (
                    <div className="mushaf-container">
                        {surah.verses.map((verse) => (
                            <span
                                key={verse.number}
                                className={`mushaf-verse ${playingAudio === verse.audio ? 'highlight-text' : ''}`}
                                onClick={() => handlePlay(verse.audio)}
                                ref={el => verseRefs.current[verse.audio] = el}
                            >
                                <span className="mushaf-arabic">
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
                ) : (
                    <div className="tanzil-view-container">
                        <div className="tanzil-sidebar">
                            <h3>Tanzil Control</h3>
                            <div className="sidebar-group">
                                <label>Recitation</label>
                                <button className={`play-all-button ${isPlayingAll ? 'active' : ''}`} onClick={handlePlayAll}>
                                    {isPlayingAll ? 'Pause' : 'Play All'}
                                </button>
                            </div>
                            <div className="sidebar-group">
                                <label>Translation</label>
                                <div className="toggle-switch" onClick={() => setShowTranslation(!showTranslation)}>
                                    <div className={`switch ${showTranslation ? 'on' : 'off'}`}></div>
                                    <span>{showTranslation ? 'On' : 'Off'}</span>
                                </div>
                            </div>
                            <div className="sidebar-group">
                                <label>Speed</label>
                                <select className="sidebar-select" value={playbackSpeed} onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}>
                                    <option value={0.5}>0.5x</option>
                                    <option value={1}>1.0x</option>
                                    <option value={1.5}>1.5x</option>
                                    <option value={2}>2.0x</option>
                                </select>
                            </div>
                        </div>
                        <div className="tanzil-content">
                            {surah.verses.map((verse) => (
                                <div
                                    key={verse.number}
                                    className={`tanzil-row ${playingAudio === verse.audio ? 'highlight-tanzil' : ''}`}
                                    onClick={() => handlePlay(verse.audio)}
                                    ref={el => verseRefs.current[verse.audio] = el}
                                >
                                    <div className="tanzil-arabic">
                                        {(!localStorage.getItem('selectedScript') || localStorage.getItem('selectedScript') === 'quran-tajweed')
                                            ? parseTajweed(verse.text)
                                            : verse.text}
                                        <span className="tanzil-number">({verse.numberInSurah})</span>
                                    </div>
                                    {showTranslation && (
                                        <div className="tanzil-translation">
                                            {verse.translation}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SurahDetail;
