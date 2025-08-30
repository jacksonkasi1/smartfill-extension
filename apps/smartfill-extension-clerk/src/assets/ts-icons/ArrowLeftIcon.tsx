import React from "react"

interface ArrowLeftIconProps {
  width?: number
  height?: number
  className?: string
}

export const ArrowLeftIcon: React.FC<ArrowLeftIconProps> = ({ 
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
      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" 
      clipRule="evenodd" 
    />
  </svg>
)
