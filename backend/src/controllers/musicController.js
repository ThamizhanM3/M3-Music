import SongCache from '../models/SongCache.js';
import User from '../models/User.js';
import Like from '../models/Like.js';
import mongoose from 'mongoose';
import { getCloudinaryFiles, uploadFromBuffer, deleteCloudinaryFile, uploadFileBuffer } from '../services/cloudinaryService.js';
import { extractMetadata } from '../services/metadataService.js';
import { s3 } from '../services/cloudinaryService.js';
import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// @desc    Upload music to R2 and sync metadata to MongoDB
// @route   POST /api/music/upload
// @access  Private/Admin
export const uploadMusic = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const { generateGradientPlaceholder } = await import('../services/metadataService.js');

    const addedSongs = [];
    for (const file of req.files) {
      // 1. Upload audio buffer to R2 and get public URL
      const { key, url } = await uploadFileBuffer(file.buffer, file.originalname, 'audio');

      // 2. Extract rich metadata from the in-memory buffer (super-fast, no local disk write needed)
      const metadata = await extractMetadata(file.buffer, {
        mimeType: file.mimetype,
        originalFileName: file.originalname,
        fileSize: file.size
      });

      let title = req.body.title || metadata?.title || file.originalname.replace(/\.[^/.]+$/, "");
      let artist = req.body.artist || metadata?.artist || 'Unknown Artist';
      let singer = req.body.singer || metadata?.singer || artist;
      let musicDirector = req.body.musicDirector || metadata?.musicDirector || 'Unknown Composer';
      let lyricist = req.body.lyricist || metadata?.lyricist || 'Unknown Lyricist';
      let genre = req.body.genre || metadata?.genre || 'Unknown Genre';
      let language = req.body.language || metadata?.language || 'Unknown';
      let album = req.body.album || metadata?.album || 'Unknown Album';
      let year = req.body.year || metadata?.year || new Date().getFullYear();
      let duration = metadata?.duration || 0;
      let bitrate = metadata?.bitrate || 192;
      let fileSize = file.size;
      let mimeType = file.mimetype;
      
      let thumbnailUrl = '';
      let artworkUrl = '';

      // 3. Handle artwork extraction or dynamic gradient generation
      let artworkBuffer;
      if (metadata?.artwork?.buffer) {
        artworkBuffer = metadata.artwork.buffer;
      } else {
        try {
          artworkBuffer = await generateGradientPlaceholder();
        } catch (gradErr) {
          console.error('Failed to generate placeholder gradient:', gradErr);
        }
      }

      if (artworkBuffer) {
        try {
          const artworkResult = await uploadFromBuffer(artworkBuffer, `${file.originalname}-artwork.jpg`, 'artwork');
          artworkUrl = artworkResult.url || artworkResult.secure_url || artworkResult;
          thumbnailUrl = artworkUrl; // compatibility mapping
        } catch (err) {
          console.error('Artwork upload failed:', err);
        }
      }

      // 4. Create rich song record
      const song = await SongCache.create({
        cloudinaryId: key,
        url: url,
        title,
        artist,
        singer,
        musicDirector,
        lyricist,
        genre,
        language,
        album,
        year,
        duration,
        bitrate,
        fileSize,
        mimeType,
        artworkUrl,
        cloudflareKey: key,
        thumbnailUrl,
        composer: musicDirector,
        folder: 'm3-music-library',
        uploadedBy: req.user._id
      });
      addedSongs.push(song);
    }

    res.status(201).json({ message: 'Files uploaded successfully', songs: addedSongs });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: 'Failed to upload files', error: error.message });
  }
};

// @desc    Sync R2 folder to MongoDB Cache
// @route   POST /api/music/sync
// @access  Private/Admin
export const syncCloudinary = async (req, res) => {
  try {
    const { generateGradientPlaceholder } = await import('../services/metadataService.js');
    const cloudinaryFiles = await getCloudinaryFiles('audio');
    const existingSongs = await SongCache.find({});
    const existingCloudinaryIds = existingSongs.map(s => s.cloudinaryId);
    
    const currentCloudinaryIds = cloudinaryFiles.map(f => f.public_id);
    const newFiles = cloudinaryFiles.filter(f => !existingCloudinaryIds.includes(f.public_id));
    
    const addedSongs = [];
    
    for (const file of newFiles) {
      const metadata = await extractMetadata(file.secure_url);
      
      const partsArr = file.public_id.split('/');
      const baseName = partsArr[partsArr.length - 1];
      
      let title = metadata?.title || baseName;
      let artist = metadata?.artist || 'Unknown Artist';
      let singer = metadata?.singer || artist;
      let musicDirector = metadata?.musicDirector || 'Unknown Composer';
      let lyricist = metadata?.lyricist || 'Unknown Lyricist';
      let genre = metadata?.genre || 'Unknown Genre';
      let language = metadata?.language || 'Unknown';
      let album = metadata?.album || 'Unknown Album';
      let year = metadata?.year || new Date().getFullYear();
      let duration = metadata?.duration || file.duration || 0;
      let bitrate = metadata?.bitrate || 192;
      let fileSize = file.bytes || 0;
      let mimeType = `audio/${file.format || 'mp3'}`;

      let artworkUrl = '';
      let thumbnailUrl = '';

      let artworkBuffer;
      if (metadata?.artwork?.buffer) {
        artworkBuffer = metadata.artwork.buffer;
      } else {
        try {
          artworkBuffer = await generateGradientPlaceholder();
        } catch (gradErr) {
          console.error('Failed to generate gradient:', gradErr);
        }
      }

      if (artworkBuffer) {
        try {
          const artworkResult = await uploadFromBuffer(artworkBuffer, `${baseName}-artwork.jpg`, 'artwork');
          artworkUrl = artworkResult.url || artworkResult.secure_url || artworkResult;
          thumbnailUrl = artworkUrl;
        } catch (err) {
          console.error('Artwork sync upload failed:', err);
        }
      }

      const song = await SongCache.create({
        cloudinaryId: file.public_id,
        url: file.secure_url,
        title,
        artist,
        singer,
        musicDirector,
        lyricist,
        genre,
        language,
        album,
        year,
        duration,
        bitrate,
        fileSize,
        mimeType,
        artworkUrl,
        cloudflareKey: file.public_id,
        thumbnailUrl,
        composer: musicDirector,
        folder: 'm3-music-library',
        uploadedBy: req.user._id
      });
      addedSongs.push(song);
    }

    const toRemove = existingCloudinaryIds.filter(id => !currentCloudinaryIds.includes(id));
    if (toRemove.length > 0) {
      await SongCache.deleteMany({ cloudinaryId: { $in: toRemove } });
    }

    res.json({
      message: 'Sync complete',
      added: addedSongs.length,
      removed: toRemove.length,
      total: cloudinaryFiles.length
    });
  } catch (error) {
    console.error('Sync Error:', error);
    res.status(500).json({ message: 'Failed to sync with Cloudinary', error: error.message });
  }
};

// @desc    Get all cached songs
// @route   GET /api/music/songs
// @access  Private
export const getSongs = async (req, res) => {
  const songs = await SongCache.find({}).sort({ artist: 1, title: 1 });
  res.json(songs);
};

// @desc    Search songs
// @route   GET /api/music/search?q=query
// @access  Private
export const searchSongs = async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  const songs = await SongCache.find({
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { artist: { $regex: query, $options: 'i' } },
      { singer: { $regex: query, $options: 'i' } },
      { musicDirector: { $regex: query, $options: 'i' } },
      { lyricist: { $regex: query, $options: 'i' } },
      { album: { $regex: query, $options: 'i' } },
      { genre: { $regex: query, $options: 'i' } },
      { language: { $regex: query, $options: 'i' } }
    ]
  }).limit(50);
  
  res.json(songs);
};

// @desc    Update song metadata
// @route   PUT /api/music/songs/:id
// @access  Private/Admin
export const updateSong = async (req, res) => {
  const song = await SongCache.findById(req.params.id);

  if (song) {
    song.title = req.body.title !== undefined ? req.body.title : song.title;
    song.artist = req.body.artist !== undefined ? req.body.artist : song.artist;
    song.singer = req.body.singer !== undefined ? req.body.singer : song.singer;
    song.musicDirector = req.body.musicDirector !== undefined ? req.body.musicDirector : song.musicDirector;
    song.lyricist = req.body.lyricist !== undefined ? req.body.lyricist : song.lyricist;
    song.genre = req.body.genre !== undefined ? req.body.genre : song.genre;
    song.language = req.body.language !== undefined ? req.body.language : song.language;
    song.album = req.body.album !== undefined ? req.body.album : song.album;
    song.year = req.body.year !== undefined ? req.body.year : song.year;
    song.thumbnailUrl = req.body.thumbnailUrl !== undefined ? req.body.thumbnailUrl : song.thumbnailUrl;
    song.artworkUrl = req.body.artworkUrl !== undefined ? req.body.artworkUrl : song.artworkUrl;
    song.composer = song.musicDirector; // sync composer alias
    
    const updatedSong = await song.save();
    res.json(updatedSong);
  } else {
    res.status(404).json({ message: 'Song not found' });
  }
};

// @desc    Delete song
// @route   DELETE /api/music/songs/:id
// @access  Private/Admin
export const deleteSong = async (req, res) => {
  const song = await SongCache.findById(req.params.id);

  if (song) {
    // Delete from Cloudinary
    await deleteCloudinaryFile(song.cloudinaryId);
    // Delete from DB
    await song.deleteOne();
    res.json({ message: 'Song removed' });
  } else {
    res.status(404).json({ message: 'Song not found' });
  }
};

// @desc Stream audio with HTTP range support
// @route GET /api/music/stream/:id
// @access Private
export const streamSong = async (req, res) => {
  try {
    const song = await SongCache.findById(req.params.id);
    if (!song) return res.status(404).json({ message: 'Song not found' });

    const key = song.cloudinaryId || song.key;
    if (!key) return res.status(400).json({ message: 'No storage key for song' });

    // Get object size via HeadObject
    const headCmd = new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key });
    const headRes = await s3.send(headCmd);
    const total = headRes.ContentLength;

    const range = req.headers.range;
    if (!range) {
      // No range requested: stream entire file
      res.writeHead(200, {
        'Content-Type': song.mimeType || 'audio/mpeg',
        'Content-Length': total,
      });
      const getCmd = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key });
      const data = await s3.send(getCmd);
      data.Body.pipe(res);
      return;
    }

    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
    const chunkSize = (end - start) + 1;

    const getCmd = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key, Range: `bytes=${start}-${end}` });
    const data = await s3.send(getCmd);

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': song.mimeType || 'audio/mpeg'
    });

    data.Body.pipe(res);
  } catch (err) {
    console.error('Stream error:', err);
    res.status(500).json({ message: 'Failed to stream media', error: err.message });
  }
};

// @desc    Get liked songs
// @route   GET /api/music/likes
// @access  Private
export const getLikedSongs = async (req, res) => {
  try {
    console.log(`[DEBUG] Fetching likes for user: ${req.user._id}`);
    const likes = await Like.find({ userId: req.user._id }).populate('songId');
    
    // Filter out likes where the song might have been deleted
    const songs = likes
      .filter(like => like.songId)
      .map(like => like.songId);
      
    res.json(songs);
  } catch (error) {
    console.error('[ERROR] getLikedSongs:', error);
    res.status(500).json({ message: 'Error fetching liked songs', error: error.message });
  }
};

// @desc    Toggle like song
// @route   POST /api/music/likes/:id
// @access  Private
export const toggleLikeSong = async (req, res) => {
  try {
    const songId = req.params.id;
    const userId = req.user._id;
 
    if (!mongoose.Types.ObjectId.isValid(songId)) {
      console.warn(`[WARN] Invalid Song ID provided: ${songId}`);
      return res.status(400).json({ message: 'Invalid Song ID' });
    }

    console.log(`[DEBUG] Toggling like. User: ${userId}, Song: ${songId}`);

    const existingLike = await Like.findOne({ userId, songId });

    if (existingLike) {
      await Like.deleteOne({ _id: existingLike._id });
      console.log(`[DEBUG] Like removed: User ${userId} -> Song ${songId}`);
      res.json({ message: 'Like removed', liked: false });
    } else {
      await Like.create({ userId, songId });
      console.log(`[DEBUG] Like added: User ${userId} -> Song ${songId}`);
      res.json({ message: 'Like added', liked: true });
    }
  } catch (error) {
    console.error('[ERROR] toggleLikeSong:', error);
    res.status(500).json({ message: 'Error toggling like', error: error.message });
  }
};

// @desc    Get unique artists
// @route   GET /api/music/artists
// @access  Private
export const getArtists = async (req, res) => {
  try {
    const artists = await SongCache.distinct('artist');
    // Get one thumbnail per artist for visual variety
    const artistData = await Promise.all(artists.map(async (name) => {
      const song = await SongCache.findOne({ artist: name, thumbnailUrl: { $ne: '' } });
      return { name, thumbnailUrl: song?.thumbnailUrl || song?.artworkUrl || '' };
    }));
    res.json(artistData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching artists', error: error.message });
  }
};

// @desc    Get unique albums
// @route   GET /api/music/albums
// @access  Private
export const getAlbums = async (req, res) => {
  try {
    const albums = await SongCache.aggregate([
      { $group: { _id: "$album", artist: { $first: "$artist" }, thumbnailUrl: { $first: "$thumbnailUrl" }, artworkUrl: { $first: "$artworkUrl" }, year: { $first: "$year" } } },
      { $project: { name: "$_id", _id: 0, artist: 1, thumbnailUrl: { $ifNull: ["$artworkUrl", "$thumbnailUrl"] }, year: 1 } }
    ]);
    res.json(albums);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching albums', error: error.message });
  }
};

// @desc    Get unique genres
// @route   GET /api/music/genres
// @access  Private
export const getGenres = async (req, res) => {
  try {
    const genres = await SongCache.distinct('genre');
    res.json(genres);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching genres', error: error.message });
  }
};

// @desc    Filter songs
// @route   GET /api/music/filter
// @access  Private
export const filterSongs = async (req, res) => {
  try {
    const { artist, album, genre, language, year, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (artist) query.artist = artist;
    if (album) query.album = album;
    if (genre) query.genre = genre;
    if (language) query.language = language;
    if (year) query.year = Number(year);
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } },
        { singer: { $regex: search, $options: 'i' } },
        { musicDirector: { $regex: search, $options: 'i' } },
        { lyricist: { $regex: search, $options: 'i' } },
        { album: { $regex: search, $options: 'i' } },
        { genre: { $regex: search, $options: 'i' } },
        { language: { $regex: search, $options: 'i' } }
      ];
    }

    const songs = await SongCache.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await SongCache.countDocuments(query);

    res.json({
      songs,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error filtering songs', error: error.message });
  }
};

// @desc    Get songs by artist
// @route   GET /api/music/by-artist/:artist
// @access  Private
export const getSongsByArtist = async (req, res) => {
  try {
    const songs = await SongCache.find({ artist: req.params.artist }).sort({ album: 1, trackNumber: 1 });
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching songs by artist', error: error.message });
  }
};

// @desc    Get songs by album
// @route   GET /api/music/by-album/:album
// @access  Private
export const getSongsByAlbum = async (req, res) => {
  try {
    const songs = await SongCache.find({ album: req.params.album }).sort({ trackNumber: 1 });
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching songs by album', error: error.message });
  }
};

// @desc    Get songs by genre
// @route   GET /api/music/by-genre/:genre
// @access  Private
export const getSongsByGenre = async (req, res) => {
  try {
    const songs = await SongCache.find({ genre: req.params.genre }).sort({ artist: 1, title: 1 });
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching songs by genre', error: error.message });
  }
};

// @desc    Upload custom artwork to Cloudflare R2
// @route   POST /api/music/upload-artwork
// @access  Private/Admin
export const uploadArtwork = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    const sharp = (await import('sharp')).default;
    const optimizedBuffer = await sharp(req.file.buffer)
      .resize(1000, 1000, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    const filename = `custom_${Date.now()}_artwork.jpg`;
    const result = await uploadFromBuffer(optimizedBuffer, filename, 'artwork');
    const url = result.url || result.secure_url || result;

    res.json({ url });
  } catch (error) {
    console.error('Artwork upload failed:', error);
    res.status(500).json({ message: 'Failed to upload custom artwork', error: error.message });
  }
};
