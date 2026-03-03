import { useState, useRef, useEffect } from 'react'

/**
 * HelpBubble — Bulle d'aide contextuelle (clic)
 * 
 * Usage :
 *   <HelpBubble text="Remplissez entièrement votre profil..." />
 * 
 * À côté d'un titre :
 *   <h2>Mon profil <HelpBubble text="Remplissez entièrement votre profil..." /></h2>
 * 
 * Props :
 *   text     (string)  — Le message d'aide à afficher
 *   position (string)  — Position du popup : 'bottom' (défaut), 'top', 'left', 'right'
 *   size     (string)  — Taille : 'sm' (défaut), 'md', 'lg'
 */
export default function HelpBubble({ text, position = 'bottom', size = 'sm' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Fermer au clic en dehors
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [open])

  // Tailles du bouton
  const sizeClasses = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-6 h-6 text-sm',
    lg: 'w-7 h-7 text-base',
  }

  // Position du popup
  const positionClasses = {
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  // Flèche du popup
  const arrowClasses = {
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-white',
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-white',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-white',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-white',
  }

  return (
    <span className="relative inline-flex items-center" ref={ref}>
      {/* Bouton ? */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(!open)
        }}
        className={`
          ${sizeClasses[size] || sizeClasses.sm}
          inline-flex items-center justify-center
          rounded-full
          bg-blue-100 text-blue-600
          hover:bg-blue-200 hover:text-blue-700
          transition-colors duration-150
          font-semibold leading-none
          cursor-pointer select-none
          ml-1.5
        `}
        aria-label="Aide"
      >
        ?
      </button>

      {/* Popup */}
      {open && (
        <span
          className={`
            absolute z-50
            ${positionClasses[position] || positionClasses.bottom}
            w-64 max-w-[85vw]
            bg-white
            border border-gray-200
            rounded-xl
            shadow-lg
            px-4 py-3
            text-sm text-gray-700 font-normal
            leading-relaxed
            animate-fade-in
          `}
        >
          {/* Flèche */}
          <span
            className={`
              absolute w-0 h-0
              border-[6px]
              ${arrowClasses[position] || arrowClasses.bottom}
            `}
          />
          {text}
        </span>
      )}
    </span>
  )
}
