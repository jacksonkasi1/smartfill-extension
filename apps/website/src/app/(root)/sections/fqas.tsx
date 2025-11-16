'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { DynamicIcon, type IconName } from 'lucide-react/dynamic'
import Link from 'next/link'

type FAQItem = {
    id: string
    icon: IconName
    question: string
    answer: string
}

export default function FAQsThree() {
    const faqItems: FAQItem[] = [
        {
            id: 'item-1',
            icon: 'key',
            question: 'How do I connect my AI API key?',
            answer: 'Click the ⚙️ settings icon in the left panel, pick your provider (Gemini, Groq, OpenAI, or OpenRouter), paste the API key, choose a model, and press Save. The green dot shows when your key is active.',
        },
        {
            id: 'item-2',
            icon: 'mouse-pointer',
            question: 'How does the auto-fill feature work?',
            answer: 'Browse to any page with forms, hit the Fill Forms button (big orange button in the center). SmartFill scans the page and fills in realistic demo data in one click.',
        },
        {
            id: 'item-3',
            icon: 'play',
            question: 'How do I record and replay sessions?',
            answer: 'Click Record (red button, right panel) to start, perform your actions, then press Stop. Sessions are saved under "Saved Sessions" and can be replayed by hitting the ▶️ icon.',
        },
        {
            id: 'item-4',
            icon: 'bot',
            question: 'Can I use custom instructions with AI?',
            answer: 'Yes! SmartFill supports custom instructions for AI-powered text generation. You can ask your selected model (Gemini, Groq, ChatGPT, etc.) to draft, rewrite, or summarize text with your specific requirements.',
        },
        {
            id: 'item-5',
            icon: 'download',
            question: 'Can I export my recorded sessions?',
            answer: 'Absolutely! You can export and import recordings as lightweight JSON files, making it easy to share automation scripts or backup your workflows.',
        },
    ]

    return (
        <section id="faq" className="bg-muted/30 dark:bg-muted/5 py-20">
            <div className="mx-auto max-w-5xl px-4 md:px-6">
                <div className="flex flex-col gap-10 md:flex-row md:gap-16">
                    <div className="md:w-1/3">
                        <div className="sticky top-20">
                            <h2 className="mt-4 text-3xl font-bold">Getting Started with SmartFill</h2>
                            <p className="text-muted-foreground mt-4">
                                SmartFill is in public beta. Need help?{' '}
                                <Link
                                    href="#"
                                    target="_blank"
                                    className="text-primary font-medium hover:underline">
                                    Contact support
                                </Link>
                            </p>
                        </div>
                    </div>
                    <div className="md:w-2/3">
                        <Accordion
                            type="single"
                            collapsible
                            className="w-full space-y-2">
                            {faqItems.map((item) => (
                                <AccordionItem
                                    key={item.id}
                                    value={item.id}
                                    className="bg-background shadow-xs rounded-lg border px-4 last:border-b">
                                    <AccordionTrigger className="cursor-pointer items-center py-5 hover:no-underline">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-6">
                                                <DynamicIcon
                                                    name={item.icon}
                                                    className="m-auto size-4"
                                                />
                                            </div>
                                            <span className="text-base">{item.question}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-5">
                                        <div className="px-9">
                                            <p className="text-base">{item.answer}</p>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </div>
            </div>
        </section>
    )
}
