// ** import core packages
import React from 'react'
import Image from 'next/image'

// ** import assets
import logo from '@/assets/logo.png'

export const LogoIcon = () => {
    return <Image src={logo} alt="SmartFill" width={32} height={32} />
}

export const Logo = () => {
    return (
        <div className="flex items-center space-x-2">
            <Image src={logo} alt="SmartFill" width={32} height={32} />
            <span className="font-bold text-lg">SmartFill</span>
        </div>
    )
}