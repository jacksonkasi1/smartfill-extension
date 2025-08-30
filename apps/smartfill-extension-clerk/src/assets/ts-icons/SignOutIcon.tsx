import React from "react"

interface SignOutIconProps {
  width?: number
  height?: number
  className?: string
}

export const SignOutIcon: React.FC<SignOutIconProps> = ({ 
  width = 20, 
  height = 20, 
  className = "" 
}) => (
  <svg 
    viewBox="0 0 20 20" 
    fill="currentColor" 
    width={width} 
    height={height}
    className={className}
  >
    <path 
      fillRule="evenodd" 
      d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" 
      clipRule="evenodd" 
    />
  </svg>
)
