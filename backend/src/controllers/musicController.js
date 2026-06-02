import SongCache from '../models/SongCache.js';
import User from '../models/User.js';
import Like from '../models/Like.js';
import mongoose from 'mongoose';

import {
  getCloudinaryFiles,
  uploadFromBuffer,
  deleteCloudinaryFile,
  uploadFileBuffer,
  s3
} from '../services/cloudinaryService.js';

import { extractMetadata } from '../services/metadataService.js';

import {
  GetObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';

// ✅ Load S3 bucket from env
const S3_BUCKET = process.env.S3_BUCKET_NAME;

// ✅ Upload music (NO LOGIC CHANGE NEEDED)
export const uploadMusic = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const { generateGradientPlaceholder } = await import('../services/metadataService.js');

    const addedSongs = [];

    for (const file of req.files) {
      const { key, url } = await uploadFileBuffer(
        file.buffer,
        file.originalname,
        'audio'
      );

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

      let artworkBuffer;

      if (metadata?.artwork?.buffer) {
        artworkBuffer = metadata.artwork.buffer;
      } else {
        try {
          artworkBuffer = await generateGradientPlaceholder();
        } catch (err) {
          console.error('Gradient error:', err);
        }
      }

      if (artworkBuffer) {
        try {
          const artworkResult = await uploadFromBuffer(
            artworkBuffer,
            `${file.originalname}-artwork.jpg`,
            'artwork'
          );

          artworkUrl = artworkResult.url;
          thumbnailUrl = artworkUrl;
        } catch (err) {
          console.error('Artwork upload failed:', err);
        }
      }

      const song = await SongCache.create({
        cloudinaryId: key, // ✅ keep same field (no schema change needed)
        url,
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
        cloudflareKey: key, // ✅ optional: rename later if you want
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

// ✅ Sync (NO CHANGE except naming stays same)
export const syncCloudinary = async (req, res) => {
  try {
    const { generateGradientPlaceholder } = await import('../services/metadataService.js');

    const files = await getCloudinaryFiles('audio');
    const existingSongs = await SongCache.find({});
    const existingIds = existingSongs.map(s => s.cloudinaryId);

    const currentIds = files.map(f => f.public_id);
    const newFiles = files.filter(f => !existingIds.includes(f.public_id));

    const addedSongs = [];

    for (const file of newFiles) {
      const metadata = await extractMetadata(file.secure_url);

      let artworkUrl = '';
      let thumbnailUrl = '';

      let artworkBuffer;

      if (metadata?.artwork?.buffer) {
        artworkBuffer = metadata.artwork.buffer;
      } else {
        artworkBuffer = await generateGradientPlaceholder();
      }

      if (artworkBuffer) {
        const result = await uploadFromBuffer(artworkBuffer, 'artwork.jpg', 'artwork');
        artworkUrl = result.url;
        thumbnailUrl = artworkUrl;
      }

      const song = await SongCache.create({
        cloudinaryId: file.public_id,
        url: file.secure_url,
        title: metadata?.title || 'Unknown',
        artist: metadata?.artist || 'Unknown',
        artworkUrl,
        thumbnailUrl,
        uploadedBy: req.user._id
      });

      addedSongs.push(song);
    }

    const toRemove = existingIds.filter(id => !currentIds.includes(id));

    if (toRemove.length > 0) {
      await SongCache.deleteMany({ cloudinaryId: { $in: toRemove } });
    }

    res.json({
      message: 'Sync complete',
      added: addedSongs.length,
      removed: toRemove.length
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ IMPORTANT CHANGE HERE (S3 STREAMING)
export const streamSong = async (req, res) => {
  try {
    const song = await SongCache.findById(req.params.id);
    if (!song) return res.status(404).json({ message: 'Song not found' });

    const key = song.cloudinaryId;
    if (!key) return res.status(400).json({ message: 'Missing key' });

    // ✅ CHANGE: use S3_BUCKET NOT R2
    const headCmd = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    });

    const headRes = await s3.send(headCmd);
    const total = headRes.ContentLength;

    const range = req.headers.range;

    if (!range) {
      const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
      const data = await s3.send(cmd);

      res.writeHead(200, {
        'Content-Type': song.mimeType || 'audio/mpeg',
        'Content-Length': total
      });

      data.Body.pipe(res);
      return;
    }

    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0]);
    const end = parts[1] ? parseInt(parts[1]) : total - 1;

    const chunkSize = end - start + 1;

    const cmd = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Range: `bytes=${start}-${end}`
    });

    const data = await s3.send(cmd);

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': song.mimeType || 'audio/mpeg'
    });

    data.Body.pipe(res);

  } catch (err) {
    console.error('Stream error:', err);
    res.status(500).json({ message: err.message });
  }
};
