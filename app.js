const express = require('express');

const Genius = require("genius-lyrics");
// const Client = new Genius.Client("ClientAccessToken");
const Client = new Genius.Client(process.env.CLIENTACCESSTOKEN);

const app = express();
const PORT = 3000;

// Middleware para parsear el cuerpo de las solicitudes JSON
app.use(express.json());

async function getLyrics(track, artist) {
    const searches = await Client.songs.search(`${track} ${artist}`);
    const firstSong = searches[0];
    const lyrics = await firstSong.lyrics();
    const lyricsData = lyrics + "\n";

    // const cleanedLyrics = lyricsData.replace(/\[.*?\]/g, '').trim();
    return {lyricsData};
    // return cleanedLyrics;
}

app.get('/', (req, res) => { 
    res.send('Funcionando...')

});

app.get('/search', (req, res) => { //Búsqueda de la letra de alguna canción
    const { title, artist } = req.query;
    getLyrics(title, artist)
        .then(lyricsData => {
            res.send(lyricsData);
        })
        .catch(error => {
            res.status(500).send(error);
        });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});