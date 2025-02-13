const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());

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

function formatChordsAndLyrics(rawText) {
    const lines = rawText.split("\n");
    let formattedText = "";
    let lastChordsLine = "";

    for (let line of lines) {
        if (line.trim() === "") {
            formattedText += "\n"; // Mantiene los espacios entre secciones
            continue;
        }

        // Detecta si es una línea de acordes (solo contiene letras y números)
        const isChordLine = /^[A-G][#b]?m?(maj|min|dim|sus|aug|add)?[0-9]?(\s+[A-G][#b]?m?(maj|min|dim|sus|aug|add)?[0-9]?)*$/.test(line.trim());

        if (isChordLine) {
            lastChordsLine = line; // Guarda la línea de acordes temporalmente
        } else {
            // Si es una línea de letra, coloca los acordes arriba y la letra debajo
            if (lastChordsLine) {
                formattedText += lastChordsLine + "\n";
                lastChordsLine = ""; // Limpia para evitar repetir
            }
            formattedText += line + "\n";
        }
    }

    return formattedText.trim(); // Elimina espacios extra al final
}

const getChordsAndLyrics = async (song, artist) => {
    try {
        const formattedArtist = artist
            .toLowerCase()
            .normalize("NFD") // Descompone caracteres acentuados
            .replace(/[\u0300-\u036f]/g, "") // Elimina los diacríticos (acentos)
            .replace(/ñ/g, "n") // Reemplaza ñ por n
            .replace(/ /g, "-"); // Reemplaza espacios por guiones

        const formattedSong = song
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/ñ/g, "n")
            .replace(/ /g, "-");
        
        const url = `https://www.cifraclub.com/${formattedArtist}/${formattedSong}/`;

        console.log(`Accediendo a: ${url}`);
        
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const chordsAndLyrics = $('pre').text().trim();

        if (!chordsAndLyrics) {
            throw new Error("No se encontraron acordes ni letra.");
        }

        console.log(chordsAndLyrics);
        console.log('-----------------')
        console.log(formatChordsAndLyrics(chordsAndLyrics));
        const chordsAndLyricsFormat = formatChordsAndLyrics(chordsAndLyrics);
        // return chordsAndLyrics;
        return chordsAndLyricsFormat;

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
