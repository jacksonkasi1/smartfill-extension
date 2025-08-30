'use client'
import React from 'react'

interface ProgressiveBlurProps {
    className?: string
    direction: 'left' | 'right' | 'top' | 'bottom'
    blurIntensity?: number
}

export const ProgressiveBlur: React.FC<ProgressiveBlurProps> = ({
    className = '',
    direction,
    blurIntensity = 1
}) => {
    const getGradientDirection = () => {
        switch (direction) {
            case 'left':
                return 'to right'
            case 'right':
                return 'to left'
            case 'top':
                return 'to bottom'
            case 'bottom':
                return 'to top'
        }
    }

    return (
        <div
            className={className}
            style={{
                background: `linear-gradient(${getGradientDirection()}, rgba(255,255,255,${blurIntensity}), transparent)`,
                backdropFilter: `blur(${blurIntensity * 4}px)`,
                WebkitBackdropFilter: `blur(${blurIntensity * 4}px)`
            }}
        />
    )
}