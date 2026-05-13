import { Shield } from 'lucide-react';

const PageLoader = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="flex items-center gap-8 sm:gap-12">
        
        {/* Left Side: 4 Vertical Centered Bars */}
        <div className="flex items-center gap-2 sm:gap-3 h-24">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={`left-${i}`}
              className="w-1.5 sm:w-2 rounded-full bg-indigo-600 animate-pulse-fade"
              style={{ 
                height: `${85 - (i * 15)}%`,
                animationDelay: `${i * 0.1}s` 
              }}
            />
          ))}
        </div>

        {/* Center: Pulsing Logo (Reduced Intensity) */}
        <div className="relative animate-pulse-fade" style={{ animationDelay: '0.2s' }}>
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-indigo-500/90 flex items-center justify-center shadow-xl shadow-indigo-100/50">
            <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white/90" />
          </div>
          {/* Subtle Decorative Ring */}
          <div className="absolute -inset-4 rounded-[40px] border border-indigo-50/50 animate-ping-slow" />
        </div>

        {/* Right Side: 4 Vertical Centered Bars */}
        <div className="flex items-center gap-2 sm:gap-3 h-24">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={`right-${i}`}
              className="w-1.5 sm:w-2 rounded-full bg-indigo-500/80 animate-pulse-fade"
              style={{ 
                height: `${40 + (i * 15)}%`,
                animationDelay: `${(i + 4) * 0.1}s` 
              }}
            />
          ))}
        </div>
      </div>

      {/* Loading Text */}
      <div className="absolute bottom-16 flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
           <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" />
           <p className="text-xs font-bold text-gray-800 tracking-[0.3em] uppercase opacity-80">Initializing</p>
           <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] opacity-60">Optimizing Workspace</p>
      </div>

      <style>{`
        @keyframes pulse-fade {
          0%, 100% { 
            transform: scale(0.9); 
            opacity: 0.2;
          }
          50% { 
            transform: scale(1.05); 
            opacity: 1;
          }
        }
        @keyframes ping-slow {
          75%, 100% { transform: scale(1.3); opacity: 0; }
        }
        .animate-pulse-fade {
          animation: pulse-fade 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .animate-ping-slow {
          animation: ping-slow 4s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default PageLoader;
