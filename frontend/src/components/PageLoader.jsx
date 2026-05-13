import logo from '../assets/ems-logo.png';

const PageLoader = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
      <div className="relative mb-8">
        <div className="w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
          <img
            src={logo}
            alt="EMS Logo"
            className="w-full h-full object-contain animate-pulse-fade"
          />
        </div>
        {/* Subtle Decorative Ring */}
        <div className="absolute -inset-4 rounded-full border border-indigo-50/50 animate-ping-slow" />
      </div>

      {/* Loading Text */}
      <div className="flex flex-col items-center gap-4">
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
            transform: scale(0.95); 
            opacity: 0.8;
          }
          50% { 
            transform: scale(1.02); 
            opacity: 1;
          }
        }
        @keyframes ping-slow {
          75%, 100% { transform: scale(1.3); opacity: 0; }
        }
        .animate-pulse-fade {
          animation: pulse-fade 2s ease-in-out infinite;
        }
        .animate-ping-slow {
          animation: ping-slow 4s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default PageLoader;

