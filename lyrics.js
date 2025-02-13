const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

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
        const filteredLyrics = lyrics.filter(line => line.trim() !== "");

        return {plainLyrics, syncedLyrics, times, filteredLyrics, lines};
    } catch (error) {
        console.error('Error obteniendo la letra:', error.message);
        throw error;
    }
}


const getChordsAndLyrics = async (song, artist) => {
    try {
        const formattedArtist = artist.toLowerCase().replace(/ /g, "-");
        const formattedSong = song.toLowerCase().replace(/ /g, "-");
        const url = `https://www.cifraclub.com/${formattedArtist}/${formattedSong}/`;

        console.log(`Accediendo a: ${url}`);

        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const chordsAndLyrics = $('pre').text().trim();

        if (!chordsAndLyrics) {
            throw new Error("No se encontraron acordes ni letra.");
        }

        return chordsAndLyrics;

    } catch (error) {
        console.error("Error al obtener los acordes:", error.message);
        throw new Error("No se pudo obtener los acordes y la letra.");
    }
};

// Ruta para obtener acordes y letra
app.get('/chords', async (req, res) => {
    const { song, artist } = req.query;
    if (!song || !artist) {
        return res.status(400).json({ error: "Debes proporcionar 'song' y 'artist'" });
    }

    try {
        const data = await getChordsAndLyrics(song, artist);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta de búsqueda
app.get('/search', async (req, res) => {
    const { song, artist } = req.query;

    if (!song || !artist) {
        return res.status(400).send("Por favor, proporciona 'song' y 'artist' en la consulta.");
    }

    try {
        const lyricsData = await getLyrics(song, artist);
        // res.send(lyricsData);
        res.send(lyricsData.plainLyrics);
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
