'use client'

// ** import lib
import React from 'react'
import { Logo } from '@/components/logo'
import Link from 'next/link'

// ** import assets
import XIcon from '@/assets/icons/XIcon'
import LinkedInIcon from '@/assets/icons/LinkedInIcon'
import GitHubIcon from '@/assets/icons/GitHubIcon'

const links = [
    {
        group: 'Product',
        items: [
            {
                title: 'Features',
                href: '#features',
            },
            {
                title: 'Solution',
                href: '#solution',
            },
            {
                title: 'FAQ',
                href: '#faq',
            }
        ],
    },
    {
        group: 'Company',
        items: [
            {
                title: 'About',
                href: '#',
            },
            {
                title: 'Contact',
                href: '#',
            },
            {
                title: 'Help',
                href: '#',
            },
        ],
    },
    {
        group: 'Legal',
        items: [
            {
                title: 'Privacy',
                href: '/privacy',
            }
        ],
    },
]

export default function FooterSection() {
    const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        if (href.startsWith('#')) {
            e.preventDefault()
            const targetId = href.replace('#', '')
            const targetElement = document.getElementById(targetId)
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                })
            }
        }
    }

    return (
        <footer className="border-b pt-20">
            <div className="mx-auto max-w-5xl px-6">
                <div className="flex justify-between gap-12">
                    <div className="shrink-0">
                        <Link
                            href="/"
                            aria-label="go home"
                            className="block size-fit">
                            <Logo />
                        </Link>
                    </div>

                    <div className="flex gap-8 sm:gap-12 md:gap-16">
                        {links.map((link, index) => (
                            <div
                                key={index}
                                className="space-y-4 text-sm">
                                <span className="block font-medium">{link.group}</span>
                                {link.items.map((item, index) => (
                                    item.href.startsWith('#') ? (
                                        <a
                                            key={index}
                                            href={item.href as any}
                                            onClick={(e) => handleSmoothScroll(e, item.href)}
                                            className="text-muted-foreground hover:text-primary block duration-150 cursor-pointer">
                                            <span>{item.title}</span>
                                        </a>
                                    ) : (
                                        <Link
                                            key={index}
                                            href={item.href as any}
                                            className="text-muted-foreground hover:text-primary block duration-150 cursor-pointer">
                                            <span>{item.title}</span>
                                        </Link>
                                    )
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-12 flex flex-wrap items-end justify-between gap-6 border-t py-6">
                    <span className="text-muted-foreground order-last block text-center text-sm md:order-first">© {new Date().getFullYear()} SmartFill, All rights reserved</span>
                    <div className="order-first flex flex-wrap justify-center gap-6 text-sm md:order-last">
                        <Link
                            href="https://x.com/jacksonkasi11"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="X/Twitter"
                            className="text-muted-foreground hover:text-primary block">
                            <XIcon className="size-6" />
                        </Link>
                        <Link
                            href="https://www.linkedin.com/in/jacksonkasi/"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="LinkedIn"
                            className="text-muted-foreground hover:text-primary block">
                            <LinkedInIcon className="size-6" />
                        </Link>
                        <Link
                            href="https://github.com/jacksonkasi1"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="GitHub"
                            className="text-muted-foreground hover:text-primary block">
                            <GitHubIcon className="size-6" />
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}