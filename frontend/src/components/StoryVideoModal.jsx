import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX, RotateCcw, Maximize } from 'lucide-react';

export default function StoryVideoModal({ isOpen, onClose }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef(null);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration || 1;
      setProgress((current / total) * 100);
      setDuration(total);
    }
  };

  const handleSeek = (e) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * (videoRef.current.duration || 1);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 25, 18, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '920px',
          backgroundColor: '#0D2B20',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          border: '1px solid rgba(201, 164, 76, 0.3)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png" alt="BPS Fresh Mills" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            <div>
              <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.98rem' }}>BPS Fresh Mills — Our Story</div>
              <div style={{ fontSize: '0.72rem', color: '#C9A44C' }}>The Journey from Organic Wheat Farm to Your Daily Roti</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Player */}
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000000' }}>
          <video
            ref={videoRef}
            src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4"
            poster="/farm-to-table-banner.jpg"
            playsInline
            autoPlay
            muted
            loop
            onTimeUpdate={handleTimeUpdate}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onClick={togglePlay}
          />

          {/* Centered Play Pause Overlay on Hover */}
          {!isPlaying && (
            <button
              onClick={togglePlay}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 68,
                height: 68,
                borderRadius: '50%',
                backgroundColor: 'rgba(22, 163, 74, 0.9)',
                border: 'none',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
              }}
            >
              <Play size={32} style={{ marginLeft: 4 }} />
            </button>
          )}

          {/* Bottom Custom Controls Bar */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
            padding: '1.25rem 1.25rem 0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {/* Scrubber Progress Bar */}
            <div
              onClick={handleSeek}
              style={{
                width: '100%',
                height: '5px',
                background: 'rgba(255,255,255,0.25)',
                borderRadius: '4px',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: '#16A34A',
                borderRadius: '4px',
                position: 'relative'
              }} />
            </div>

            {/* Buttons Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  onClick={togglePlay}
                  style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>

                <button
                  onClick={toggleMute}
                  style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>

                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                  BPS Fresh Mills Stone Ground Quality Process
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#C9A44C', fontWeight: 700, background: 'rgba(201,164,76,0.15)', padding: '3px 8px', borderRadius: '4px' }}>
                  100% Traditional Chakki
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Story Description Footer */}
        <div style={{ padding: '1rem 1.5rem', background: '#092118', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.84rem', color: '#A3B8B0', maxWidth: '650px', lineHeight: 1.4 }}>
            Every batch of BPS Fresh Mills flour is stone ground at low RPM to ensure natural vitamins, dietary fiber, and authentic village aroma remain intact in every roti.
          </div>
          <button
            onClick={() => {
              onClose();
              window.location.href = '/shop';
            }}
            style={{
              padding: '0.65rem 1.3rem',
              backgroundColor: '#16A34A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(22,163,74,0.3)'
            }}
          >
            Shop Fresh Atta →
          </button>
        </div>
      </div>
    </div>
  );
}
