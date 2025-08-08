# Weather Effects Documentation

## Overview

The HomeOS weather page includes immersive visual and audio effects that respond to current weather conditions, creating a realistic and engaging user experience.

## Components

### 🌧️ Rain Effect (`RainEffect.tsx`)

A realistic rain animation using HTML5 Canvas that creates falling raindrops with:

- **Physics-based animation**: Raindrops fall with realistic gravity and wind effects
- **Motion blur**: Droplets have trailing effects based on their speed
- **Intensity levels**: Light, moderate, and heavy rain with different drop counts and speeds
- **Performance optimized**: Uses requestAnimationFrame and efficient rendering

**Props:**
- `isRaining: boolean` - Controls whether rain is active
- `intensity: 'light' | 'moderate' | 'heavy'` - Rain intensity level
- `className?: string` - Additional CSS classes

### 💧 Water Droplets (`WaterDroplets.tsx`)

Simulates water droplets on a surface (like a window) with:

- **Realistic droplet rendering**: Gradient-based droplets with highlights and refraction
- **Ripple effects**: Droplets create expanding ripples when they disappear
- **Lifecycle animation**: Droplets fade in, persist, then fade out with ripples
- **Surface interaction**: Droplets appear to sit on the screen surface

**Props:**
- `isActive: boolean` - Controls droplet generation
- `intensity: number` - Droplet spawn rate (0-1)
- `className?: string` - Additional CSS classes

### ⚡ Lightning Effect (`LightningEffect.tsx`)

Creates realistic lightning bolts during thunderstorms with:

- **Fractal lightning generation**: Procedurally generated lightning paths with branches
- **Flash effects**: Screen-wide white flashes synchronized with lightning
- **Randomized timing**: Lightning strikes at realistic intervals (5-12 strikes per 2 minutes)
- **SVG-based rendering**: Smooth, scalable lightning bolts with glow effects

**Props:**
- `isActive: boolean` - Controls lightning activity
- `intensity: 'light' | 'moderate' | 'heavy'` - Lightning frequency
- `className?: string` - Additional CSS classes
- `onLightningStrike?: () => void` - Callback triggered on each lightning strike

## Audio Effects

### 🔊 Rain Sound Generator (`rainSoundGenerator.ts`)

Procedurally generates realistic rain sounds using Web Audio API:

- **Layered audio**: Multiple noise layers filtered to create rain sounds
- **Droplet sounds**: Individual droplet impacts with random timing
- **Thunder generation**: Realistic thunder sounds with multiple oscillators and delay
- **Intensity scaling**: Sound complexity increases with weather intensity

**Features:**
- No audio files required - all sounds generated procedurally
- Web Audio API for precise control and low latency
- Automatic fade in/out transitions
- Thunder triggered by lightning strikes

### 🎵 Rain Sound Hook (`useRainSound.ts`)

React hook for managing rain audio:

```typescript
const rainSound = useRainSound({
  enabled: true,
  intensity: 'moderate',
  volume: 0.2,
  autoPlay: false
});

// Control methods
rainSound.play();
rainSound.stop();
rainSound.setVolume(0.5);
rainSound.setIntensity('heavy');
rainSound.triggerThunder(); // Manual thunder trigger
```

## Weather Integration

### Condition Detection

The weather page automatically detects weather conditions and activates appropriate effects:

```typescript
const getWeatherInfo = () => {
  const condition = weatherData?.current?.condition?.toLowerCase() || '';
  const isRaining = ['rainy', 'rain', 'light rain', 'heavy rain', 'stormy', 'thunderstorm'].includes(condition);
  const isThunderstorm = ['stormy', 'thunderstorm', 'storm'].includes(condition);
  
  let intensity: 'light' | 'moderate' | 'heavy' = 'moderate';
  if (condition.includes('light')) intensity = 'light';
  else if (condition.includes('heavy') || condition.includes('storm')) intensity = 'heavy';
  
  return { isRaining, isThunderstorm, intensity };
};
```

### Effect Coordination

- **Rain + Droplets**: Both activate for any rain condition
- **Lightning + Thunder**: Lightning triggers thunder sounds automatically
- **Sound Control**: Users can toggle rain sounds on/off during rain
- **Intensity Scaling**: All effects scale with weather intensity

## Usage Example

```tsx
// In Weather.tsx
const { isRaining, isThunderstorm, intensity } = getWeatherInfo();

return (
  <div className="weather-container">
    {/* Rain Effects */}
    <RainEffect 
      isRaining={isRaining} 
      intensity={intensity}
      className="z-10"
    />
    <WaterDroplets 
      isActive={isRaining} 
      intensity={intensity === 'light' ? 0.3 : intensity === 'moderate' ? 0.6 : 1.0}
      className="z-20"
    />
    
    {/* Lightning Effects */}
    <LightningEffect
      isActive={isThunderstorm}
      intensity={intensity}
      className="z-30"
      onLightningStrike={handleLightningStrike}
    />
  </div>
);
```

## Performance Considerations

- **Canvas optimization**: Effects use efficient rendering techniques
- **Audio management**: Sounds are properly cleaned up to prevent memory leaks
- **Animation throttling**: Effects respect device performance capabilities
- **Conditional rendering**: Effects only render when weather conditions are active

## Browser Compatibility

- **Canvas**: Supported in all modern browsers
- **Web Audio API**: Supported in Chrome, Firefox, Safari, Edge
- **Framer Motion**: Requires React 16.8+ for hooks support
- **SVG animations**: Supported in all modern browsers

## Customization

Effects can be customized by:
- Adjusting intensity parameters
- Modifying color schemes in component styles
- Changing timing intervals for lightning/thunder
- Customizing audio parameters in the sound generator
