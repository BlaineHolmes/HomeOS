import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SpotifyApi, AccessToken } from '@spotify/web-api-ts-sdk';
import {
  MusicalNoteIcon,
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  SpeakerWaveIcon,
  HeartIcon,
  ArrowPathIcon,
  QueueListIcon,
  MagnifyingGlassIcon,
  UserIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

// Spotify API types
interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  duration_ms: number;
  preview_url?: string;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  tracks: { total: number };
  images: Array<{ url: string; height: number; width: number }>;
  owner: { display_name: string };
}

interface CurrentlyPlaying {
  item: SpotifyTrack;
  is_playing: boolean;
  progress_ms: number;
  device: {
    name: string;
    type: string;
    volume_percent: number;
  };
}

interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  followers: { total: number };
  images: Array<{ url: string }>;
}

const Spotify: React.FC = () => {
  const [sdk, setSdk] = useState<SpotifyApi | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<CurrentlyPlaying | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [recentTracks, setRecentTracks] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Spotify SDK
  const initializeSpotify = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // For demo purposes, we'll use client credentials flow
      // In production, you'd want to use Authorization Code Flow with PKCE
      const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
      const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || window.location.origin;

      if (!clientId) {
        throw new Error('Spotify Client ID not configured. Please set VITE_SPOTIFY_CLIENT_ID in your .env file.');
      }

      // Create SDK instance with user authorization
      const spotifySDK = SpotifyApi.withUserAuthorization(
        clientId,
        redirectUri,
        [
          'user-read-private',
          'user-read-email',
          'user-read-playback-state',
          'user-modify-playback-state',
          'user-read-currently-playing',
          'user-read-recently-played',
          'playlist-read-private',
          'playlist-read-collaborative',
          'user-library-read',
          'user-top-read'
        ]
      );

      setSdk(spotifySDK);
      setIsAuthenticated(true);

      // Load user data
      await loadUserData(spotifySDK);

    } catch (err: any) {
      console.error('Failed to initialize Spotify:', err);
      setError(err.message || 'Failed to connect to Spotify');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load user data
  const loadUserData = async (spotifySDK: SpotifyApi) => {
    try {
      // Get user profile
      const profile = await spotifySDK.currentUser.profile();
      setUserProfile(profile as UserProfile);

      // Get user's playlists
      const playlistsResponse = await spotifySDK.currentUser.playlists.playlists(20);
      setPlaylists(playlistsResponse.items as SpotifyPlaylist[]);

      // Get recently played tracks
      const recentResponse = await spotifySDK.player.getRecentlyPlayedTracks(20);
      setRecentTracks(recentResponse.items.map(item => item.track) as SpotifyTrack[]);

      // Get current playback
      try {
        const currentPlayback = await spotifySDK.player.getCurrentlyPlayingTrack();
        if (currentPlayback) {
          setCurrentTrack(currentPlayback as CurrentlyPlaying);
        }
      } catch (err) {
        // User might not have an active device
        console.log('No active playback device');
      }

    } catch (err: any) {
      console.error('Failed to load user data:', err);
      setError('Failed to load Spotify data');
    }
  };

  // Playback controls
  const togglePlayback = async () => {
    if (!sdk || !currentTrack) return;

    try {
      if (currentTrack.is_playing) {
        await sdk.player.pausePlayback();
      } else {
        await sdk.player.startResumePlayback();
      }

      // Refresh current track
      const updated = await sdk.player.getCurrentlyPlayingTrack();
      if (updated) {
        setCurrentTrack(updated as CurrentlyPlaying);
      }
    } catch (err: any) {
      console.error('Playback control failed:', err);
      setError('Playback control failed');
    }
  };

  // Format duration
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      className="min-h-screen p-6 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-green-900"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <MusicalNoteIcon className="w-8 h-8 text-green-500" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Spotify Player
            </h1>
          </div>

          {userProfile && (
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {userProfile.display_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {userProfile.followers.total} followers
                </p>
              </div>
              {userProfile.images[0] ? (
                <img
                  src={userProfile.images[0].url}
                  alt={userProfile.display_name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <UserIcon className="w-10 h-10 text-gray-400" />
              )}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Authentication Required */}
        {!isAuthenticated ? (
          <div className="card-glass p-8 text-center">
            <MusicalNoteIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Connect to Spotify
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Connect your Spotify account to control playback and view your music.
            </p>
            <div className="space-y-4">
              <button
                onClick={initializeSpotify}
                disabled={isLoading}
                className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 mx-auto"
              >
                {isLoading ? (
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <LinkIcon className="w-5 h-5" />
                )}
                <span>{isLoading ? 'Opening Spotify Login...' : 'Connect Spotify'}</span>
              </button>

              {isLoading && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mt-0.5"></div>
                    <div>
                      <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">
                        🎵 Connecting to Spotify
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        A secure login window will open. Please complete the authentication process there and return here.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Track Player */}
            {currentTrack && (
              <motion.div
                className="card-glass p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Now Playing
                </h3>
                <div className="flex items-center space-x-4">
                  {currentTrack.item.album.images[0] && (
                    <img
                      src={currentTrack.item.album.images[0].url}
                      alt={currentTrack.item.album.name}
                      className="w-20 h-20 rounded-lg shadow-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                      {currentTrack.item.name}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      {currentTrack.item.artists.map(artist => artist.name).join(', ')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      {currentTrack.item.album.name}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <ClockIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {formatDuration(currentTrack.progress_ms)} / {formatDuration(currentTrack.item.duration_ms)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={togglePlayback}
                      className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full transition-colors"
                    >
                      {currentTrack.is_playing ? (
                        <PauseIcon className="w-6 h-6" />
                      ) : (
                        <PlayIcon className="w-6 h-6" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Playlists */}
            {playlists.length > 0 && (
              <motion.div
                className="card-glass p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Your Playlists
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playlists.slice(0, 6).map((playlist) => (
                    <div
                      key={playlist.id}
                      className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-colors cursor-pointer"
                    >
                      {playlist.images[0] && (
                        <img
                          src={playlist.images[0].url}
                          alt={playlist.name}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      )}
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {playlist.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {playlist.tracks.total} tracks
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        by {playlist.owner.display_name}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Recently Played */}
            {recentTracks.length > 0 && (
              <motion.div
                className="card-glass p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Recently Played
                </h3>
                <div className="space-y-3">
                  {recentTracks.slice(0, 5).map((track, index) => (
                    <div
                      key={`${track.id}-${index}`}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      {track.album.images[0] && (
                        <img
                          src={track.album.images[0].url}
                          alt={track.album.name}
                          className="w-12 h-12 rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {track.name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {track.artists.map(artist => artist.name).join(', ')}
                        </p>
                      </div>
                      <span className="text-sm text-gray-400">
                        {formatDuration(track.duration_ms)}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Spotify;
