const BASE_URL = 'https://api.alquran.cloud/v1';

export const getSurahList = async () => {
    try {
        const response = await fetch(`${BASE_URL}/surah`);
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching surah list:', error);
        return [];
    }
};

export const getReciters = async () => {
    try {
        // Fetch audio editions, arabic language, verse by verse format
        const response = await fetch(`${BASE_URL}/edition?format=audio&language=ar&type=versebyverse`);
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching reciters:', error);
        return [];
    }
};

export const getTextEditions = async () => {
    try {
        // Fetch Quran text editions (Arabic)
        const response = await fetch(`${BASE_URL}/edition?format=text&language=ar&type=quran`);
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching text editions:', error);
        return [];
    }
};

export const getSurahDetails = async (number, audioEdition = 'ar.alafasy', scriptEdition = 'quran-tajweed') => {
    try {
        // Fetching Script, Audio (Dynamic), and Albanian translation (Sherif Ahmeti)
        const response = await fetch(`${BASE_URL}/surah/${number}/editions/${scriptEdition},${audioEdition},sq.ahmeti`);
        const data = await response.json();

        // Data structure: data.data is an array of 3 objects (editions)
        // Note: The order *usually* matches the request string, but we should double check identifier if possible,
        // or rely on types. 
        // [0] -> Quran Tajweed (quran-tajweed)
        // [1] -> Audio (variable)
        // [2] -> Albanian Translation (sq.ahmeti)

        // Safer way: find by type or identifier
        const quranData = data.data.find(d => d.edition.identifier === scriptEdition) || data.data[0];
        const audioData = data.data.find(d => d.edition.format === 'audio') || data.data[1];
        const translationData = data.data.find(d => d.edition.identifier === 'sq.ahmeti') || data.data[2];

        const verses = quranData.ayahs.map((ayah, index) => ({
            number: ayah.number,
            numberInSurah: ayah.numberInSurah,
            text: ayah.text,
            audio: audioData.ayahs[index].audio,
            translation: translationData.ayahs[index].text,
            juz: ayah.juz,
            page: ayah.page,
        }));

        return {
            ...quranData, // Surah metadata (name, etc) from the first edition
            verses,
        };

    } catch (error) {
        console.error(`Error fetching surah ${number}:`, error);
        return null;
    }
};
export const getPageDetails = async (pageNumber, audioEdition = 'ar.alafasy', scriptEdition = 'quran-tajweed') => {
    try {
        const [quranRes, audioRes, transRes] = await Promise.all([
            fetch(`${BASE_URL}/page/${pageNumber}/${scriptEdition}`),
            fetch(`${BASE_URL}/page/${pageNumber}/${audioEdition}`),
            fetch(`${BASE_URL}/page/${pageNumber}/sq.ahmeti`)
        ]);

        const [quranJson, audioJson, transJson] = await Promise.all([
            quranRes.json(),
            audioRes.json(),
            transRes.json()
        ]);

        const quranData = quranJson.data;
        const audioData = audioJson.data;
        const translationData = transJson.data;

        if (!quranData || !quranData.ayahs) return null;

        const verses = quranData.ayahs.map((ayah, index) => ({
            number: ayah.number,
            numberInSurah: ayah.numberInSurah,
            text: ayah.text,
            audio: audioData?.ayahs?.[index]?.audio || '',
            translation: translationData?.ayahs?.[index]?.text || '',
            surah: ayah.surah,
            juz: ayah.juz,
            page: ayah.page,
        }));

        return {
            page: pageNumber,
            verses,
        };
    } catch (error) {
        console.error(`Error fetching page ${pageNumber}:`, error);
        return null;
    }
};
