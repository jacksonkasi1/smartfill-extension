import React from "react"

interface MenuIconProps {
  width?: number
  height?: number
  className?: string
}

export const MenuIcon: React.FC<MenuIconProps> = ({ 
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
    <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
  </svg>
)
