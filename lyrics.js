const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Middleware para parsear JSON
app.use(express.json());

async function getLyrics(track, artist) {
    try {
        const searchResponse = await axios.get(`https://lrclib.net/api/search?track_name=${encodeURIComponent(track)}&artist_name=${encodeURIComponent(artist)}`);
        const syncedLyrics = searchResponse.data[0].syncedLyrics;
        const plainLyrics = searchResponse.data[0].plainLyrics;

        const times = [];
        const lyrics = [];
        let lines = 0;

        syncedLyrics.split("\n").forEach(linea => {
        const match = linea.match(/\[(\d+):(\d+\.\d+)]\s*(.*)/);
        if (match) {
            const minutos = parseInt(match[1], 10);
            const segundos = parseFloat(match[2]);
            times.push(minutos * 60 + segundos);
            lyrics.push(match[3]);
        }
        });
        
        lines = (times.length + lyrics.length) / 2;

        // console.log(times.length);
        // console.log(lyrics.length);

        return {plainLyrics, syncedLyrics, times, lyrics, lines};
    } catch (error) {
        console.error('Error obteniendo la letra:', error.message);
        throw error;
    }
}

// Ruta de búsqueda
app.get('/search', async (req, res) => {
    const { song, artist } = req.query;

    if (!song || !artist) {
        return res.status(400).send("Por favor, proporciona 'song' y 'artist' en la consulta.");
    }

    try {
        const lyricsData = await getLyrics(song, artist);
        res.send(lyricsData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('Funcionando...');
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
