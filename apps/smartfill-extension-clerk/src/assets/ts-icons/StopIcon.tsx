import React from "react"

interface StopIconProps {
  width?: number
  height?: number
  className?: string
}

export const StopIcon: React.FC<StopIconProps> = ({ 
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
    <rect x="6" y="6" width="8" height="8"/>
  </svg>
)
