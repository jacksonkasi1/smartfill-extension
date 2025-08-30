// ** import core packages
'use client'
import React from 'react'
import Link from 'next/link'

// ** import icons
import { Menu, X } from 'lucide-react'

// ** import third party
import { SignInButton, SignUpButton, useUser, UserButton } from '@clerk/nextjs'

// ** import shared components
import { Button } from '@/components/ui/button'

// ** import components
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/ThemeToggle'

// ** import utilities
import { cn } from '@/lib/utils'

const menuItems = [
    { name: 'Features', href: '#features' as any },
    { name: 'Solution', href: '#solution' as any },
    { name: 'FAQ', href: '#faq' as any },
]

export const HeroHeader = () => {
    const [menuState, setMenuState] = React.useState(false)
    const [isScrolled, setIsScrolled] = React.useState(false)
    const { isSignedIn } = useUser()

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault()
        const targetId = href.replace('#', '')
        const targetElement = document.getElementById(targetId)
        
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            })
        }
        
        setMenuState(false)
    }

    return (
        <header>
            <nav className="fixed z-20 w-full px-2">
                <div className={cn(
                    'mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12',
                    isScrolled && 'bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5'
                )}>
                    <div className="relative flex items-center justify-between py-3 lg:py-4">
                        {/* Logo */}
                        <Link
                            href="/"
                            aria-label="home"
                            className="flex items-center space-x-2">
                            <Logo />
                        </Link>

                        {/* Desktop Navigation Menu - Center */}
                        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
                            <ul className="flex gap-8 text-sm">
                                {menuItems.map((item, index) => (
                                    <li key={index}>
                                        <a
                                            href={item.href}
                                            onClick={(e) => handleSmoothScroll(e, item.href)}
                                            className="text-muted-foreground hover:text-accent-foreground block duration-150 cursor-pointer">
                                            <span>{item.name}</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Desktop Right Side Actions - Hidden on Mobile */}
                        <div className="hidden items-center gap-3 lg:flex">
                            <ThemeToggle />
                            {!isSignedIn && (
                                <>
                                    <SignInButton mode="modal">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                                'text-muted-foreground hover:text-accent-foreground',
                                                isScrolled && 'hidden'
                                            )}>
                                            <span>Login</span>
                                        </Button>
                                    </SignInButton>
                                    <SignUpButton mode="modal">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className={cn(
                                                'bg-primary text-primary-foreground hover:bg-primary/90',
                                                isScrolled && 'hidden'
                                            )}>
                                            <span>Sign Up</span>
                                        </Button>
                                    </SignUpButton>
                                    <Button
                                        asChild
                                        size="sm"
                                        className={cn(
                                            'bg-primary text-primary-foreground hover:bg-primary/90',
                                            !isScrolled && 'hidden'
                                        )}>
                                        <Link href="/dashboard">
                                            <span>Get Started</span>
                                        </Link>
                                    </Button>
                                </>
                            )}
                            {isSignedIn && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild>
                                        <Link href="/dashboard">
                                            <span>Dashboard</span>
                                        </Link>
                                    </Button>
                                    <div className="[&_button]:focus:outline-none flex items-center">
                                        <UserButton />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Mobile Menu Button - Only visible on mobile */}
                        <button
                            onClick={() => setMenuState(!menuState)}
                            aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                            className="relative z-20 block cursor-pointer p-2 lg:hidden">
                            {menuState ? (
                                <X className="size-6" />
                            ) : (
                                <Menu className="size-6" />
                            )}
                        </button>

                        {/* Mobile Menu Dropdown - Only visible on mobile when open */}
                        {menuState && (
                            <div className="absolute left-0 right-0 top-full mt-2 w-full lg:hidden">
                                <div className="bg-background mx-4 rounded-2xl border p-6 shadow-2xl shadow-zinc-300/20 dark:shadow-none">
                                    {/* Mobile Navigation Links */}
                                    <ul className="space-y-4 border-b pb-6 mb-6">
                                        {menuItems.map((item, index) => (
                                            <li key={index}>
                                                <a
                                                    href={item.href}
                                                    onClick={(e) => handleSmoothScroll(e, item.href)}
                                                    className="text-muted-foreground hover:text-accent-foreground block py-2 text-base duration-150 cursor-pointer">
                                                    <span>{item.name}</span>
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                    
                                    {/* Mobile Action Buttons */}
                                    <div className="flex flex-col space-y-3">
                                        <div className="flex justify-center mb-3">
                                            <ThemeToggle />
                                        </div>
                                        {!isSignedIn && (
                                            <>
                                                <SignInButton mode="modal">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full text-muted-foreground hover:text-accent-foreground">
                                                        <span>Login</span>
                                                    </Button>
                                                </SignInButton>
                                                <SignUpButton mode="modal">
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                                                        <span>Sign Up</span>
                                                    </Button>
                                                </SignUpButton>
                                            </>
                                        )}
                                        {isSignedIn && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                    className="w-full">
                                                    <Link href="/dashboard">
                                                        <span>Dashboard</span>
                                                    </Link>
                                                </Button>
                                                <div className="[&_button]:focus:outline-none flex items-center justify-center">
                                                    <UserButton />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </nav>
        </header>
    )
}