'use client'
import React from 'react'

interface InfiniteSliderProps {
    children: React.ReactNode
    speed?: number
    speedOnHover?: number
    gap?: number
    className?: string
}

export const InfiniteSlider: React.FC<InfiniteSliderProps> = ({
    children,
    speed = 40,
    speedOnHover = 20,
    gap = 24,
    className = ''
}) => {
    return (
        <div className={`relative overflow-hidden ${className}`}>
            <div
                className="flex animate-scroll hover:animation-pause"
                style={{
                    gap: `${gap}px`,
                    animationDuration: `${speed}s`,
                    '--speed-on-hover': `${speedOnHover}s`
                } as React.CSSProperties & { '--speed-on-hover': string }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.animationDuration = `${speedOnHover}s`
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.animationDuration = `${speed}s`
                }}
            >
                {children}
                {children}
            </div>
        </div>
    )
}