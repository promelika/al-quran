import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSurahList, getReciters, getTextEditions } from '../services/api';

const Home = () => {
    const [surahs, setSurahs] = useState([]);
    const [reciters, setReciters] = useState([]);
    const [scripts, setScripts] = useState([]);

    const [selectedReciter, setSelectedReciter] = useState(localStorage.getItem('selectedReciter') || 'ar.alafasy');
    const [selectedScript, setSelectedScript] = useState(localStorage.getItem('selectedScript') || 'quran-tajweed');

    const [showReciterModal, setShowReciterModal] = useState(false);
    const [showScriptModal, setShowScriptModal] = useState(false);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const [surahData, reciterData, scriptData] = await Promise.all([
                getSurahList(),
                getReciters(),
                getTextEditions()
            ]);
            setSurahs(surahData);
            setReciters(reciterData);
            setScripts(scriptData);
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleReciterSelect = (identifier) => {
        setSelectedReciter(identifier);
        localStorage.setItem('selectedReciter', identifier);
        setShowReciterModal(false);
    };

    const getReciterName = (identifier) => {
        const reciter = reciters.find(r => r.identifier === identifier);
        return reciter ? reciter.englishName : 'Mishary Rashid Alafasy';
    };

    const handleScriptSelect = (identifier) => {
        setSelectedScript(identifier);
        localStorage.setItem('selectedScript', identifier);
        setShowScriptModal(false);
    };

    const getScriptName = (identifier) => {
        const script = scripts.find(s => s.identifier === identifier);
        return script ? script.name : 'Tajweed';
    };

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="home-container">
            <header className="main-header">
                <h1 className="title">Al-Quran</h1>
                <p className="subtitle">Recitation & Translation</p>

                <div className="reciter-selector-container" style={{ marginTop: '1rem', gap: '1rem' }}>
                    <button
                        className="reciter-button"
                        onClick={() => setShowReciterModal(true)}
                    >
                        <span className="reciter-label">Reciter:</span>
                        <span className="reciter-name">{getReciterName(selectedReciter)}</span>
                        <span className="reciter-icon">▼</span>
                    </button>

                    <button
                        className="reciter-button"
                        onClick={() => setShowScriptModal(true)}
                    >
                        <span className="reciter-label">Script:</span>
                        <span className="reciter-name">{getScriptName(selectedScript)}</span>
                        <span className="reciter-icon">▼</span>
                    </button>
                </div>
            </header>

            {/* Reciter Selection Modal */}
            {showReciterModal && (
                <div className="modal-overlay" onClick={() => setShowReciterModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Select Reciter</h3>
                            <button className="close-button" onClick={() => setShowReciterModal(false)}>×</button>
                        </div>
                        <div className="reciter-list">
                            {reciters.map((reciter) => (
                                <div
                                    key={reciter.identifier}
                                    className={`reciter-item ${selectedReciter === reciter.identifier ? 'selected' : ''}`}
                                    onClick={() => handleReciterSelect(reciter.identifier)}
                                >
                                    <span className="reciter-item-name">{reciter.englishName}</span>
                                    {selectedReciter === reciter.identifier && <span className="check-mark">✓</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Script Selection Modal */}
            {showScriptModal && (
                <div className="modal-overlay" onClick={() => setShowScriptModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Select Arabic Script</h3>
                            <button className="close-button" onClick={() => setShowScriptModal(false)}>×</button>
                        </div>
                        <div className="reciter-list">
                            {scripts.map((script) => (
                                <div
                                    key={script.identifier}
                                    className={`reciter-item ${selectedScript === script.identifier ? 'selected' : ''}`}
                                    onClick={() => handleScriptSelect(script.identifier)}
                                >
                                    <span className="reciter-item-name">{script.name}</span>
                                    {selectedScript === script.identifier && <span className="check-mark">✓</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="surah-grid">
                {surahs.map((surah) => (
                    <Link
                        to={`/surah/${surah.number}`}
                        key={surah.number}
                        className="surah-card"
                    >
                        <div className="surah-card-header">
                            <div className="surah-info-left">
                                <div className="surah-number">
                                    {surah.number}
                                </div>
                                <div>
                                    <h3 className="surah-english-name">{surah.englishName}</h3>
                                    <p className="surah-english-translation">{surah.englishNameTranslation}</p>
                                </div>
                            </div>
                            <div className="surah-info-right">
                                <span className="surah-arabic-name">{surah.name}</span>
                                <p className="surah-verse-count">{surah.numberOfAyahs} Verses</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default Home;
