import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HTMLFlipBook from 'react-pageflip';
import { getPageDetails } from '../services/api';

const Page = React.forwardRef((props, ref) => {
    const { pageData, playingAudio, handlePlay, parseTajweed } = props;

    return (
        <div className="page mushaf-page-flip" ref={ref} data-density="soft">
            <div className="page-content">
                <div className="page-header">
                    <span className="page-number-top">Faqja {props.number}</span>
                </div>

                <div className="mushaf-container flipbook-container">
                    {pageData ? (
                        pageData.verses.map((verse) => (
                            <span
                                key={verse.number}
                                className={`mushaf-verse ${playingAudio === verse.audio ? 'highlight-text' : ''}`}
                                onClick={() => handlePlay(verse.audio)}
                            >
                                {verse.numberInSurah === 1 && (
                                    <div className="surah-start-marker flipbook-marker">
                                        Sura {verse.surah.name}
                                    </div>
                                )}
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
                        ))
                    ) : (
                        <div className="loading-page">Duke ngarkuar...</div>
                    )}
                </div>

                <div className="page-footer">
                    {/* Footer info if needed */}
                </div>
            </div>
        </div>
    );
});

const MushafFlipbook = () => {
    const [pages, setPages] = useState({}); // { pageNumber: data }
    const [loading, setLoading] = useState(true);
    const [playingAudio, setPlayingAudio] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [dimensions, setDimensions] = useState({ width: 550, height: 733 });

    const flipBook = useRef(null);
    const audioRef = useRef(new Audio());

    const fetchPage = useCallback(async (num) => {
        if (pages[num]) return;
        const data = await getPageDetails(
            num,
            localStorage.getItem('selectedReciter') || 'ar.alafasy',
            localStorage.getItem('selectedScript') || 'quran-tajweed'
        );
        if (data) {
            setPages(prev => ({ ...prev, [num]: data }));
        }
    }, [pages]);

    useEffect(() => {
        // Initial load of first few pages
        const init = async () => {
            await Promise.all([fetchPage(1), fetchPage(2), fetchPage(3)]);
            setLoading(false);
        };
        init();
    }, []);

    useEffect(() => {
        const handleResize = () => {
            const width = Math.min(window.innerWidth * 0.45, 550);
            const height = width * 1.33;
            setDimensions({ width, height });
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const onFlip = (e) => {
        const newPage = e.data + 1;
        setCurrentPage(newPage);
        // Pre-fetch next pages
        fetchPage(newPage + 1);
        fetchPage(newPage + 2);
    };

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

    const parseTajweed = (text) => {
        if (!text) return '';
        return text.split(/\[|\]/).map((part, index) => {
            if (index % 2 === 1) {
                const [colorCode, ...content] = part.split(':');
                const colors = {
                    '#FF0000': '#ef4444',
                    '#008000': '#10b981',
                    '#0000FF': '#3b82f6',
                };
                return <span key={index} style={{ color: colors[`#${colorCode}`] || 'inherit' }}>{content.join(':')}</span>;
            }
            return part;
        });
    };

    if (loading) return <div className="loading">Duke përgatitur Mushafin...</div>;

    const pageArray = Array.from({ length: 604 }, (_, i) => i + 1);

    return (
        <div className="flipbook-page-container">
            <header className="flipbook-header">
                <Link to="/" className="back-link">← Ballina</Link>
                <div className="flipbook-controls">
                    <button onClick={() => flipBook.current.pageFlip().flipNext()} className="nav-button">Para</button>
                    <span className="page-info">Faqja {currentPage} / 604</span>
                    <button onClick={() => flipBook.current.pageFlip().flipPrev()} className="nav-button">Tjetra</button>
                </div>
            </header>

            <div className="flipbook-wrapper">
                <HTMLFlipBook
                    width={dimensions.width}
                    height={dimensions.height}
                    size="fixed"
                    minWidth={315}
                    maxWidth={1000}
                    minHeight={420}
                    maxHeight={1350}
                    maxShadowOpacity={0.5}
                    showCover={false}
                    className="mushaf-flip-book"
                    onFlip={onFlip}
                    ref={flipBook}
                    useMouseEvents={true}
                    startPage={0}
                >
                    {pageArray.map((num) => (
                        <Page
                            key={num}
                            number={num}
                            pageData={pages[num]}
                            playingAudio={playingAudio}
                            handlePlay={handlePlay}
                            parseTajweed={parseTajweed}
                        />
                    ))}
                </HTMLFlipBook>
            </div>
        </div>
    );
};

export default MushafFlipbook;
