import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const FloatingInput = ({ 
  label, 
  icon: Icon, 
  type = 'text', 
  value, 
  onChange, 
  required = false, 
  showPasswordToggle = false, 
  onTogglePassword, 
  isPasswordVisible,
  placeholder = "" // Keep it empty for floating effect
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const isActive = isFocused || value;

  return (
    <div className="relative w-full group">
      {/* Label and Icon */}
      <div 
        className={`
          absolute left-4 transition-all duration-300 pointer-events-none flex items-center gap-2 z-10
          ${isActive 
            ? 'top-0 -translate-y-1/2 text-xs text-indigo-600 font-medium bg-white px-2 py-0.5 rounded-md' 
            : 'top-1/2 -translate-y-1/2 text-gray-400 text-base md:text-sm'
          }
        `}
      >
        {Icon && (
          <Icon 
            size={isActive ? 14 : 16} 
            className={`transition-all duration-300 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} 
          />
        )}
        <span>{label}</span>
      </div>

      {/* Input Field */}
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        required={required}
        placeholder={placeholder}
        className={`
          w-full px-4 py-3.5 rounded-xl border bg-white/80 text-gray-800 text-base md:text-sm focus:outline-none transition-all duration-300
          ${isActive 
            ? 'border-indigo-300 ring-4 ring-indigo-500/10' 
            : 'border-gray-200 hover:border-gray-300'
          }
        `}
      />

      {/* Password Toggle */}
      {showPasswordToggle && (
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-all active:scale-90"
        >
          {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  );
};

export default FloatingInput;
