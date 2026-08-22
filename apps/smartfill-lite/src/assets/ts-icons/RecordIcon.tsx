import React from "react"

interface RecordIconProps {
  width?: number
  height?: number
  className?: string
}

export const RecordIcon: React.FC<RecordIconProps> = ({ 
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
    <circle cx="10" cy="10" r="6"/>
  </svg>
)
