import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Import images
import emp1 from '../assets/avatars/emp_1.png';
import emp2 from '../assets/avatars/emp_2.png';
import emp3 from '../assets/avatars/emp_3.png';
import emp4 from '../assets/avatars/emp_4.png';
import emp5 from '../assets/avatars/emp_5.png';

const avatars = [
  { id: 1, src: emp1, name: 'emp_1.png' },
  { id: 2, src: emp2, name: 'emp_2.png' },
  { id: 3, src: emp3, name: 'emp_3.png' },
  { id: 4, src: emp4, name: 'emp_4.png' },
  { id: 5, src: emp5, name: 'emp_5.png' },
];

const AvatarSelector = ({ onSelect, initialAvatar = 'emp_2.png' }) => {
  // Find index of initialAvatar
  const initialIndex = avatars.findIndex(a => a.name === initialAvatar);
  const [activeIndex, setActiveIndex] = useState(initialIndex !== -1 ? initialIndex : 1);

  useEffect(() => {
    onSelect(avatars[activeIndex].src);
  }, [activeIndex, onSelect]);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % avatars.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + avatars.length) % avatars.length);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full py-4 space-y-4">
      <div className="relative flex items-center justify-center w-full max-w-md h-32 overflow-hidden">
        {/* Navigation Buttons */}
        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-0 z-20 p-2 bg-white/80 hover:bg-white rounded-full shadow-md text-gray-800 transition-all active:scale-90"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="absolute right-0 z-20 p-2 bg-white/80 hover:bg-white rounded-full shadow-md text-gray-800 transition-all active:scale-90"
        >
          <ChevronRight size={20} />
        </button>

        {/* Avatars Container */}
        <div className="flex items-center justify-center gap-4 relative w-full h-full">
          {avatars.map((avatar, index) => {
            // Logic for Netflix-style carousel
            let position = 'hidden';
            let scale = 'scale-50 opacity-40';
            let zIndex = 'z-0';

            const diff = (index - activeIndex + avatars.length) % avatars.length;

            if (diff === 0) {
              position = 'translate-x-0';
              scale = 'scale-110 opacity-100';
              zIndex = 'z-10';
            } else if (diff === 1 || diff === -(avatars.length - 1)) {
              position = 'translate-x-20';
              scale = 'scale-75 opacity-40';
              zIndex = 'z-0';
            } else if (diff === avatars.length - 1 || diff === -1) {
              position = '-translate-x-20';
              scale = 'scale-75 opacity-40';
              zIndex = 'z-0';
            }

            if (position === 'hidden') return null;

            return (
              <div
                key={avatar.id}
                className={`absolute transition-all duration-500 ease-out cursor-pointer ${position} ${scale} ${zIndex}`}
                onClick={() => setActiveIndex(index)}
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border border-gray-100 bg-transparent">
                  <img
                    src={avatar.src}
                    alt={`Avatar ${avatar.id}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="text-center -mt-5">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Select Your Identity</p>
      </div>
    </div>
  );
};

export default AvatarSelector;
