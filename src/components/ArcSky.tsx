import React, { useEffect, useState, useId } from 'react';
import { motion } from 'framer-motion';
import SunCalc from 'suncalc';

type CelestialBodyPosition = {
  x: number;
  y: number;
};

type MoonPhase = {
  phase: number;
  fraction: number;
};

interface ArcSkyProps {
  latitude?: number;
  longitude?: number;
  weatherCondition?: string;
  className?: string;
  showLabels?: boolean;
}

const getArcPosition = (azimuth: number, altitude: number): CelestialBodyPosition => {
  // Debug logging to see what values we're getting
  console.log('🌞 Sun Position Debug:', {
    azimuthRadians: azimuth,
    altitudeRadians: altitude,
    azimuthDegrees: (azimuth * 180 / Math.PI + 360) % 360,
    altitudeDegrees: altitude * 180 / Math.PI
  });

  // Simple left-to-right movement across the card
  // Convert azimuth to degrees for easier calculation
  let azimuthDegrees = (azimuth * 180 / Math.PI + 360) % 360;
  let altitudeDegrees = altitude * 180 / Math.PI;

  // Map azimuth to horizontal position (0 to 1)
  // East (90°) = 0 (left), South (180°) = 0.5 (center), West (270°) = 1 (right)
  let horizontalPosition;

  if (azimuthDegrees >= 90 && azimuthDegrees <= 270) {
    // Visible part of the sky (East to West through South)
    horizontalPosition = (azimuthDegrees - 90) / 180; // 0 to 1
  } else {
    // Behind us (North side) - position off-screen
    horizontalPosition = azimuthDegrees < 90 ? -0.2 : 1.2;
  }

  // Calculate X position across the full width of the card
  const cardWidth = 800; // SVG viewBox width
  const margin = 50; // Margin from edges
  const x = margin + horizontalPosition * (cardWidth - 2 * margin);

  // Calculate Y position based on altitude
  // For debugging, let's force the sun higher if it's during the day
  let y;

  // If altitude is negative (below horizon), position at bottom
  if (altitudeDegrees <= 0) {
    y = 350; // Below horizon
    console.log('🌞 Sun below horizon, Y =', y);
  } else {
    // Above horizon - map altitude to height
    // Let's be more aggressive about positioning higher
    const maxAltitude = 90; // Maximum possible altitude
    const minY = 60; // Highest point on card (sun at noon) - made even higher
    const maxY = 200; // Lowest visible point (sunrise/sunset) - made higher

    // Linear interpolation based on altitude
    const altitudeRatio = Math.min(altitudeDegrees / maxAltitude, 1);
    y = maxY - (altitudeRatio * (maxY - minY));

    console.log('🌞 Sun above horizon:', {
      altitudeDegrees,
      altitudeRatio,
      calculatedY: y
    });
  }

  const result = {
    x: Math.max(20, Math.min(780, x)),
    y: Math.max(20, Math.min(380, y))
  };

  console.log('🌞 Final position:', result);
  return result;
};

const ArcSky: React.FC<ArcSkyProps> = ({
  latitude = 40.7128,
  longitude = -74.0060,
  weatherCondition = 'clear',
  className = '',
  showLabels = false
}) => {
  // Validate coordinates
  const validLatitude = Math.max(-90, Math.min(90, latitude || 40.7128));
  const validLongitude = Math.max(-180, Math.min(180, longitude || -74.0060));
  const safeWeatherCondition = weatherCondition?.toLowerCase() || 'clear';
  const componentId = useId();
  const [sunPos, setSunPos] = useState<CelestialBodyPosition>({ x: 0, y: 0 });
  const [moonPos, setMoonPos] = useState<CelestialBodyPosition>({ x: 0, y: 0 });
  const [moonPhase, setMoonPhase] = useState<MoonPhase>({ phase: 0, fraction: 0 });
  const [isDay, setIsDay] = useState(true);
  const [sunTimes, setSunTimes] = useState<{ sunrise: Date; sunset: Date } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const updatePositions = () => {
      try {
        const now = new Date();

        const sun = SunCalc.getPosition(now, validLatitude, validLongitude);
        const moon = SunCalc.getMoonPosition(now, validLatitude, validLongitude);
        const moonIllum = SunCalc.getMoonIllumination(now);
        const times = SunCalc.getTimes(now, validLatitude, validLongitude);

        // Update current time and sun times
        setCurrentTime(now);

        // Check if times are valid
        if (times.sunrise && times.sunset && !isNaN(times.sunrise.getTime()) && !isNaN(times.sunset.getTime())) {
          setSunTimes({ sunrise: times.sunrise, sunset: times.sunset });

          // Determine if it's day or night
          const currentTimeMs = now.getTime();
          const sunrise = times.sunrise.getTime();
          const sunset = times.sunset.getTime();
          setIsDay(currentTimeMs >= sunrise && currentTimeMs <= sunset);
        } else {
          // Fallback: assume day if between 6 AM and 6 PM
          const hour = now.getHours();
          setIsDay(hour >= 6 && hour < 18);
        }

        // Calculate positions on the arc
        const sunCoords = getArcPosition(sun.azimuth, sun.altitude);
        const moonCoords = getArcPosition(moon.azimuth, moon.altitude);

        // Fallback: If sun position seems wrong, use time-based positioning
        const hour = now.getHours();
        const minute = now.getMinutes();
        const timeDecimal = hour + minute / 60;

        // Simple time-based fallback (6 AM to 6 PM = left to right)
        if (sunCoords.y > 300 || sunCoords.x < 50 || sunCoords.x > 750) {
          console.log('🌞 Using fallback positioning for sun');
          let fallbackX, fallbackY;

          if (timeDecimal >= 6 && timeDecimal <= 18) {
            // Daytime: 6 AM to 6 PM
            const dayProgress = (timeDecimal - 6) / 12; // 0 to 1
            fallbackX = 50 + dayProgress * 700; // Left to right

            // Create an arc: highest at noon (12 PM)
            const noonProgress = Math.abs(timeDecimal - 12) / 6; // 0 at noon, 1 at 6AM/6PM
            fallbackY = 80 + noonProgress * 170; // 80 at noon, 250 at sunrise/sunset

            setSunPos({ x: fallbackX, y: fallbackY });
          } else {
            // Nighttime: use calculated position or hide
            setSunPos(sunCoords);
          }
        } else {
          setSunPos(sunCoords);
        }

        setMoonPos(moonCoords);

        setMoonPhase({ phase: moonIllum.phase, fraction: moonIllum.fraction });
      } catch (error) {
        console.error('Error updating celestial positions:', error);
        // Fallback to default positions
        setSunPos({ x: 200, y: 100 });
        setMoonPos({ x: 600, y: 100 });
        setMoonPhase({ phase: 0.5, fraction: 0.5 });
      }
    };

    updatePositions();

    // Update every minute
    const interval = setInterval(updatePositions, 60000);
    return () => clearInterval(interval);
  }, [validLatitude, validLongitude]);

  // Get weather-based opacity for celestial bodies
  const getCelestialOpacity = () => {
    let baseOpacity = 1.0;
    if (safeWeatherCondition.includes('storm') || safeWeatherCondition.includes('thunderstorm')) baseOpacity = 0.1;
    else if (safeWeatherCondition.includes('rain') || safeWeatherCondition.includes('cloudy')) baseOpacity = 0.3;
    else if (safeWeatherCondition.includes('partly')) baseOpacity = 0.7;

    return baseOpacity;
  };

  // Get individual opacity for sun and moon based on their altitude
  const getSunOpacity = () => {
    const sun = SunCalc.getPosition(currentTime, validLatitude, validLongitude);
    const baseOpacity = getCelestialOpacity();

    // Fade out when below horizon
    if (sun.altitude <= 0) return 0;

    // Fade in/out near horizon
    const altitudeFactor = Math.min(1, sun.altitude / (Math.PI / 12)); // Fade over 15 degrees
    return baseOpacity * altitudeFactor;
  };

  const getMoonOpacity = () => {
    const moon = SunCalc.getMoonPosition(currentTime, validLatitude, validLongitude);
    const baseOpacity = getCelestialOpacity();

    // Fade out when below horizon
    if (moon.altitude <= 0) return 0;

    // Fade in/out near horizon
    const altitudeFactor = Math.min(1, moon.altitude / (Math.PI / 12)); // Fade over 15 degrees
    return baseOpacity * altitudeFactor;
  };

  // 🌗 Render moon shape based on illumination
  const renderMoonSVG = () => {
    const fraction = moonPhase.fraction;
    const r = 30; // Bigger radius
    const clipX = fraction > 0.5 ? (1 - fraction) * 2 * r : fraction * 2 * r;
    const moonClipId = `moonClip-${componentId}`;
    const moonGlowId = `moonGlow-${componentId}`;
    const moonShadowId = `moonShadow-${componentId}`;

    return (
      <svg width={64} height={64} viewBox="0 0 64 64">
        <defs>
          <clipPath id={moonClipId}>
            <circle cx="32" cy="32" r={r} />
          </clipPath>
          <filter id={moonGlowId}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <radialGradient id={moonShadowId}>
            <stop offset="0%" stopColor="#2a2a3e" />
            <stop offset="100%" stopColor="#1a1a2e" />
          </radialGradient>
        </defs>
        {/* Moon shadow/dark side */}
        <circle
          cx="32"
          cy="32"
          r={r}
          fill={`url(#${moonShadowId})`}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="2"
        />
        {/* Moon illuminated side */}
        <ellipse
          cx="32"
          cy="32"
          rx={clipX}
          ry={r}
          fill="#f5f5f5"
          clipPath={`url(#${moonClipId})`}
          filter={`url(#${moonGlowId})`}
        />
        {/* Moon surface details - subtle craters */}
        <circle cx="26" cy="26" r="2.5" fill="rgba(0,0,0,0.15)" opacity="0.6" />
        <circle cx="38" cy="30" r="2" fill="rgba(0,0,0,0.12)" opacity="0.6" />
        <circle cx="30" cy="38" r="1.5" fill="rgba(0,0,0,0.1)" opacity="0.6" />
        <circle cx="35" cy="25" r="1" fill="rgba(0,0,0,0.08)" opacity="0.6" />
        {/* Outer glow ring */}
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
        />
      </svg>
    );
  };



  // Get moon phase emoji
  const getMoonPhaseEmoji = () => {
    const phase = moonPhase.phase;
    if (phase < 0.125) return '🌑'; // New Moon
    if (phase < 0.25) return '🌒'; // Waxing Crescent
    if (phase < 0.375) return '🌓'; // First Quarter
    if (phase < 0.5) return '🌔'; // Waxing Gibbous
    if (phase < 0.625) return '🌕'; // Full Moon
    if (phase < 0.75) return '🌖'; // Waning Gibbous
    if (phase < 0.875) return '🌗'; // Last Quarter
    return '🌘'; // Waning Crescent
  };

  const sunOpacity = getSunOpacity();
  const moonOpacity = getMoonOpacity();

  return (
    <div className={`relative h-96 w-full overflow-hidden ${className}`}>

      {/* Arc Path (sun's path across the sky) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 400" preserveAspectRatio="none">
        {/* Main arc path */}
        <path
          d="M 50 250 Q 400 80 750 250"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="3"
          fill="none"
          strokeDasharray="8,12"
          vectorEffect="non-scaling-stroke"
          filter="drop-shadow(0 0 6px rgba(255,255,255,0.2))"
        />

        {/* Time markers */}
        <g stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="rgba(255,255,255,0.1)">
          {/* Sunrise (East) */}
          <circle cx="50" cy="250" r="4" />
          <text x="50" y="270" textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.6)">6AM</text>

          {/* Noon (South) */}
          <circle cx="400" cy="80" r="4" />
          <text x="400" y="100" textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.6)">12PM</text>

          {/* Sunset (West) */}
          <circle cx="750" cy="250" r="4" />
          <text x="750" y="270" textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.6)">6PM</text>
        </g>

        {/* Horizon line */}
        <line
          x1="0"
          y1="300"
          x2="800"
          y2="300"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
          strokeDasharray="5,5"
        />
      </svg>

      {/* Sun */}
      <motion.div
        className="absolute w-20 h-20 rounded-full shadow-xl"
        style={{
          background: isDay
            ? 'radial-gradient(circle, #ffd700 0%, #ffed4e 50%, #ff8c00 100%)'
            : 'radial-gradient(circle, #ff6b35 0%, #ff8c42 50%, #ffa726 100%)',
          opacity: sunOpacity,
          filter: isDay
            ? 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 60px rgba(255, 215, 0, 0.4))'
            : 'drop-shadow(0 0 25px rgba(255, 107, 53, 0.6)) drop-shadow(0 0 50px rgba(255, 107, 53, 0.3))',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          boxShadow: 'inset 0 0 20px rgba(255, 255, 255, 0.2)'
        }}
        initial={false}
        animate={{ x: sunPos.x - 40, y: sunPos.y - 40 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />

      {/* Moon */}
      <motion.div
        className="absolute w-18 h-18"
        style={{
          opacity: moonOpacity,
          filter: 'drop-shadow(0 0 20px rgba(240, 240, 240, 0.5)) drop-shadow(0 0 40px rgba(240, 240, 240, 0.2))',
          transform: 'scale(1.5)'
        }}
        initial={false}
        animate={{ x: moonPos.x - 30, y: moonPos.y - 30 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      >
        {renderMoonSVG()}
      </motion.div>

      {/* Time and Sun Info Panel */}
      <div className="absolute top-4 left-4 text-white">
        <div className="bg-black/50 backdrop-blur-md rounded-lg p-3 space-y-2 border border-white/20 shadow-lg">
          <div className="text-lg font-bold">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          {sunTimes && (
            <div className="text-xs space-y-1">
              <div className="flex items-center space-x-2">
                <span>🌅</span>
                <span>
                  Sunrise: {
                    isNaN(sunTimes.sunrise.getTime())
                      ? 'N/A'
                      : sunTimes.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span>🌇</span>
                <span>
                  Sunset: {
                    isNaN(sunTimes.sunset.getTime())
                      ? 'N/A'
                      : sunTimes.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Moon Phase Info */}
      <div className="absolute top-4 right-4 text-white">
        <div className="bg-black/50 backdrop-blur-md rounded-lg p-3 text-center border border-white/20 shadow-lg">
          <div className="text-xs mb-1">Moon Phase</div>
          <div className="text-lg">{getMoonPhaseEmoji()}</div>
          <div className="text-xs">{Math.round(moonPhase.fraction * 100)}% lit</div>
          <div className="text-xs text-gray-400 mt-2 space-y-1">
            <div>☀️ Opacity: {(sunOpacity * 100).toFixed(0)}%</div>
            <div>🌙 Opacity: {(moonOpacity * 100).toFixed(0)}%</div>
            <div className="mt-2 pt-2 border-t border-gray-600">
              <div>☀️ Pos: ({sunPos.x.toFixed(0)}, {sunPos.y.toFixed(0)})</div>
              <div>🌙 Pos: ({moonPos.x.toFixed(0)}, {moonPos.y.toFixed(0)})</div>
              <div className="text-xs text-blue-400">
                Time: {currentTime.getHours()}:{currentTime.getMinutes().toString().padStart(2, '0')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Labels */}
      {showLabels && (
        <>
          <motion.div
            className="absolute text-white text-sm font-medium bg-black/60 px-3 py-2 rounded-lg backdrop-blur-md border border-white/30 shadow-xl"
            initial={false}
            animate={{ x: sunPos.x - 20, y: sunPos.y + 50 }}
            transition={{ duration: 2 }}
          >
            ☀️ Sun
          </motion.div>
          <motion.div
            className="absolute text-white text-sm font-medium bg-black/60 px-3 py-2 rounded-lg backdrop-blur-md border border-white/30 shadow-xl"
            initial={false}
            animate={{ x: moonPos.x - 25, y: moonPos.y + 50 }}
            transition={{ duration: 2 }}
          >
            🌙 Moon
          </motion.div>
        </>
      )}
    </div>
  );
};

export default ArcSky;
