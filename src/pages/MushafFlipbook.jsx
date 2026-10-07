import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HTMLFlipBook from 'react-pageflip';
import { getPageDetails } from '../services/api';
import parseTajweed from '../utils/tajweedParser';

const CoverPage = React.forwardRef((props, ref) => {
    return (
        <div className="page mushaf-cover-flip" ref={ref} data-density="hard">
            <div className="cover-content">
                <div className="cover-outer-border">
                    <div className="cover-inner-border">
                        <div className="cover-header-ornament">❖ ❖ ❖</div>

                        <div className="cover-center-block">
                            <div className="cover-main-title">
                                الْقُرْآنُ الْكَرِيمُ
                            </div>

                            <div className="cover-sub-title">
                                KUR'ANI FISNIK
                            </div>

                            <div className="cover-emblem">
                                <div className="emblem-star">۝</div>
                            </div>
                        </div>

                        <div className="cover-footer-block">
                            <div className="cover-footer-text">
                                MUSHAF-I MADHËRUAR
                            </div>
                            <div className="cover-footer-ornament">❖ ❖ ❖</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const Page = React.forwardRef((props, ref) => {
    const { pageData, playingAudio, handlePlay, fontSize } = props;

    return (
        <div className="page mushaf-page-flip" ref={ref} data-density="soft">
            <div className="page-content">
                <div className="page-header">
                    <span className="page-number-top">Faqja {props.number}</span>
                </div>

                <div 
                    className="mushaf-container flipbook-container"
                    onWheel={(e) => e.stopPropagation()}
                >
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
    const [currentPage, setCurrentPage] = useState(0); // 0 is cover
    const [dimensions, setDimensions] = useState({ width: 550, height: 733 });
    const [zoomScale, setZoomScale] = useState(1.0);

    const flipBook = useRef(null);
    const audioRef = useRef(new Audio());

    const handleZoomIn = () => setZoomScale(prev => Math.min(parseFloat((prev + 0.15).toFixed(2)), 2.2));
    const handleZoomOut = () => setZoomScale(prev => Math.max(parseFloat((prev - 0.15).toFixed(2)), 0.6));
    const handleResetZoom = () => setZoomScale(1.0);

    const fetchPage = async (num) => {
        if (!num || num > 604) return;
        const selectedReciter = localStorage.getItem('selectedReciter') || 'ar.alafasy';
        const selectedScript = localStorage.getItem('selectedScript') || 'quran-tajweed';
        const data = await getPageDetails(num, selectedReciter, selectedScript);
        if (data) {
            setPages(prev => ({ ...prev, [num]: data }));
        }
    };

    useEffect(() => {
        // Initial load of first 3 pages
        const init = async () => {
            setLoading(true);
            const selectedReciter = localStorage.getItem('selectedReciter') || 'ar.alafasy';
            const selectedScript = localStorage.getItem('selectedScript') || 'quran-tajweed';
            const [p1, p2, p3] = await Promise.all([
                getPageDetails(1, selectedReciter, selectedScript),
                getPageDetails(2, selectedReciter, selectedScript),
                getPageDetails(3, selectedReciter, selectedScript)
            ]);
            const initialPages = {};
            if (p1) initialPages[1] = p1;
            if (p2) initialPages[2] = p2;
            if (p3) initialPages[3] = p3;
            setPages(initialPages);
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
        const pageIndex = e.data; // 0 = Cover, 1 = Page 1, 2 = Page 2...
        setCurrentPage(pageIndex);
        if (pageIndex > 0) {
            fetchPage(pageIndex);
            fetchPage(pageIndex + 1);
            fetchPage(pageIndex + 2);
        }
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

    if (loading) return <div className="loading">Duke përgatitur Mushafin...</div>;

    const pageArray = Array.from({ length: 604 }, (_, i) => i + 1);

    const scaledWidth = Math.round(dimensions.width * zoomScale);
    const scaledHeight = Math.round(dimensions.height * zoomScale);
    const scaledFontSize = parseFloat((1.8 * zoomScale).toFixed(2));

    return (
        <div className="flipbook-page-container">
            <header className="flipbook-header">
                <Link to="/" className="back-link">← Ballina</Link>
                
                <div className="zoom-controls">
                    <span className="zoom-label">Zmadhimi i Librit:</span>
                    <button onClick={handleZoomOut} title="Zvogëlo librin & tekstin" className="zoom-btn">-</button>
                    <span className="zoom-value">{Math.round(zoomScale * 100)}%</span>
                    <button onClick={handleZoomIn} title="Rrite librin & tekstin" className="zoom-btn">+</button>
                    <button onClick={handleResetZoom} title="Rikthe madhësinë" className="zoom-reset-btn">↺</button>
                </div>

                <div className="flipbook-controls">
                    <button onClick={() => flipBook.current?.pageFlip().flipNext()} className="nav-button">Para</button>
                    <span className="page-info">{currentPage === 0 ? 'Kopertina' : `Faqja ${currentPage} / 604`}</span>
                    <button onClick={() => flipBook.current?.pageFlip().flipPrev()} className="nav-button">Tjetra</button>
                </div>
            </header>

            <div className="flipbook-wrapper">
                <HTMLFlipBook
                    key={zoomScale}
                    width={scaledWidth}
                    height={scaledHeight}
                    size="fixed"
                    minWidth={200}
                    maxWidth={2000}
                    minHeight={260}
                    maxHeight={2600}
                    maxShadowOpacity={0.6}
                    showCover={true}
                    className="mushaf-flip-book"
                    onFlip={onFlip}
                    ref={flipBook}
                    useMouseEvents={true}
                    startPage={currentPage}
                >
                    <CoverPage key="cover-page" />
                    {pageArray.map((num) => (
                        <Page
                            key={num}
                            number={num}
                            pageData={pages[num]}
                            playingAudio={playingAudio}
                            handlePlay={handlePlay}
                            fontSize={scaledFontSize}
                        />
                    ))}
                </HTMLFlipBook>
            </div>
        </div>
    );
};

export default MushafFlipbook;
