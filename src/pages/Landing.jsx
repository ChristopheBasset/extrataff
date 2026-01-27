import { ArrowRightIcon } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import lightningSvg from '../assets/lightning.svg';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-blue-700 text-white flex flex-col justify-center items-center px-6 py-12">
      
      {/* Header */}
      <h1 className="text-4xl font-bold mb-2">ExtraTaff</h1>
      <img src={lightningSvg} alt="Lightning" className="w-20 h-20 mb-6" />
      
      {/* Subtitle */}
      <h2 className="text-3xl font-semibold mb-6">Bienvenue</h2>
      
      {/* Tagline */}
      <p className="text-xl mb-4 text-center">
        Staff & Taff en temps réel!
      </p>
      
      {/* Description */}
      <p className="text-center mb-12 max-w-md opacity-90">
        La plateforme qui connecte en instantanée les établissements CHR et les Talents!
      </p>

      {/* CTA Buttons */}
      <div className="w-full max-w-md space-y-4 mb-12">
        
        {/* Recruter */}
        <button
          onClick={() => navigate('/register?role=establishment')}
          className="w-full bg-white text-blue-700 font-bold py-3 rounded-full flex items-center justify-center gap-2 hover:bg-gray-100 transition"
        >
          <span>→ Je recrute</span>
          <ArrowRightIcon className="w-5 h-5" />
        </button>

        {/* Chercher */}
        <button
          onClick={() => navigate('/register?role=talent')}
          className="w-full bg-white text-blue-700 font-bold py-3 rounded-full flex items-center justify-center gap-2 hover:bg-gray-100 transition"
        >
          <span>→ Je cherche</span>
          <ArrowRightIcon className="w-5 h-5" />
        </button>

        {/* Login */}
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-white bg-opacity-20 text-white font-bold py-3 rounded-full hover:bg-opacity-30 transition border-2 border-white"
        >
          Je me connecte
        </button>
      </div>

      {/* Features */}
      <div className="space-y-3 text-center text-lg">
        <p>⚡ Ultra rapide</p>
        <p>⚡ Matching intelligent</p>
        <p>⚡ Messagerie en direct</p>
      </div>
    </div>
  );
}