
async function checkTajweed() {
    const response = await fetch('http://api.alquran.cloud/v1/ayah/1:1/quran-tajweed');
    const data = await response.json();
    console.log('Raw text:', data.data.text);
    console.log('JSON Stringified:', JSON.stringify(data.data.text));
}

checkTajweed();
