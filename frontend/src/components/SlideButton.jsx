import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Check } from 'lucide-react';

export default function SlideButton({ onSlide, text, disabled, color = 'primary' }) {
  const [isDragging, setIsDragging] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const containerRef = useRef(null);
  const thumbRef = useRef(null);

  useEffect(() => {
    // Update width on mount and window resize
    const updateWidth = () => {
      if (containerRef.current && thumbRef.current) {
        setSliderWidth(containerRef.current.offsetWidth - thumbRef.current.offsetWidth - 8); // 8px for padding left+right
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handlePointerDown = (e) => {
    if (disabled || isSuccess) return;
    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || disabled || isSuccess) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    let newX = e.clientX - containerRect.left - (thumbRef.current.offsetWidth / 2);
    
    if (newX < 0) newX = 0;
    if (newX > sliderWidth) newX = sliderWidth;
    
    setOffsetX(newX);
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);

    if (offsetX >= sliderWidth * 0.85) {
      setOffsetX(sliderWidth);
      setIsSuccess(true);
      onSlide();
      // Reset logic can be handled by parent re-rendering based on state
      // but we'll provide a local fallback just in case
      setTimeout(() => {
        setIsSuccess(false);
        setOffsetX(0);
      }, 3000);
    } else {
      setOffsetX(0);
    }
  };

  const bgColor = color === 'primary' ? 'bg-indigo-600' : 'bg-gray-800';
  const trackBg = color === 'primary' ? 'bg-indigo-50' : 'bg-gray-100';
  const textColor = color === 'primary' ? 'text-indigo-900' : 'text-gray-800';
  const safeSliderWidth = sliderWidth > 0 ? sliderWidth : 1;
  const rawTextOpacity = Math.max(0, 1 - (offsetX / safeSliderWidth) * 1.5);
  const textOpacity = Number.isFinite(rawTextOpacity) ? Math.min(1, rawTextOpacity) : 1;

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-14 rounded-full flex items-center overflow-hidden border shadow-inner ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${trackBg} border-gray-200`}
      style={{ userSelect: 'none' }}
    >
      {/* Background fill based on slide progress */}
      <div 
        className={`absolute top-0 bottom-0 left-0 ${bgColor} transition-opacity duration-300`}
        style={{ width: `${offsetX + 56}px`, opacity: offsetX > 10 ? 0.15 : 0 }}
      />

      {/* Text inside the slider */}
      <div 
        className="absolute inset-0 flex items-center justify-center font-bold text-sm uppercase tracking-wider z-0 pointer-events-none select-none transition-opacity duration-300"
        style={{ opacity: isSuccess ? 0 : textOpacity }}
      >
        <span className={`${textColor} shimmer-text`}>{text}</span>
      </div>

      <div 
        className="absolute inset-0 flex items-center justify-center font-bold text-sm uppercase tracking-wider z-0 pointer-events-none select-none transition-opacity duration-300"
        style={{ opacity: isSuccess ? 1 : 0 }}
      >
        <span className="text-emerald-600 ml-8">Processing...</span>
      </div>

      {/* Draggable thumb */}
      <div
        ref={thumbRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`absolute left-1 top-1 bottom-1 w-12 rounded-full ${bgColor} flex items-center justify-center text-white shadow-md z-10 touch-none`}
        style={{ 
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {isSuccess ? <Check className="w-5 h-5 animate-bounce" /> : <ArrowRight className="w-5 h-5" />}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 150% 0; }
          100% { background-position: -150% 0; }
        }
        .shimmer-text {
          background: linear-gradient(
            to right, 
            #4f46e5 0%, 
            #4f46e5 40%, 
            #a5b4fc 50%, 
            #4f46e5 60%, 
            #4f46e5 100%
          );
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s infinite linear;
          display: inline-block;
        }
      `}</style>
    </div>
  );
}
