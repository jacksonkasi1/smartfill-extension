import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Bot, MousePointer, Play } from 'lucide-react'
import { ReactNode } from 'react'

export default function Features() {
    return (
        <section id="features" className="py-16 md:py-32 bg-muted/30 dark:bg-muted/5">
            <div className="mx-auto max-w-5xl px-6">
                <div className="text-center">
                    <h2 className="text-balance text-4xl font-semibold lg:text-5xl">Powerful Form Automation Features</h2>
                    <p className="mt-4 text-muted-foreground">Advanced Chrome extension that combines AI-powered form filling, intelligent text generation, and complete browser session recording for maximum productivity.</p>
                </div>
                <div className="mx-auto mt-8 grid max-w-sm gap-6 md:mt-16 md:max-w-full md:grid-cols-3 lg:grid-cols-3 *:text-center">
                    <Card className="group shadow-zinc-950/5 border-border/50">
                        <CardHeader className="pb-3">
                            <CardDecorator>
                                <MousePointer
                                    className="size-6 text-orange-500"
                                    aria-hidden
                                />
                            </CardDecorator>

                            <h3 className="mt-6 font-medium">Intelligent Form Autofill</h3>
                        </CardHeader>

                        <CardContent>
                            <p className="text-sm text-muted-foreground">Automatically populate web forms with realistic data including names, emails, addresses, and phone numbers. Perfect for testing, development, and repetitive data entry tasks.</p>
                        </CardContent>
                    </Card>

                    <Card className="group shadow-zinc-950/5 border-border/50">
                        <CardHeader className="pb-3">
                            <CardDecorator>
                                <Bot
                                    className="size-6 text-blue-500"
                                    aria-hidden
                                />
                            </CardDecorator>

                            <h3 className="mt-6 font-medium">AI Text Generation</h3>
                        </CardHeader>

                        <CardContent>
                            <p className="mt-3 text-sm text-muted-foreground">Leverage your preferred AI provider (Gemini, Groq, OpenAI, or OpenRouter) to generate, rewrite, and summarize text directly in form fields. Create professional content with custom prompts and instructions.</p>
                        </CardContent>
                    </Card>

                    <Card className="group shadow-zinc-950/5 border-border/50">
                        <CardHeader className="pb-3">
                            <CardDecorator>
                                <Play
                                    className="size-6 text-green-500"
                                    aria-hidden
                                />
                            </CardDecorator>

                            <h3 className="mt-6 font-medium">Browser Session Recording</h3>
                        </CardHeader>

                        <CardContent>
                            <p className="mt-3 text-sm text-muted-foreground">Capture complete browser interactions including clicks, typing, and navigation. Replay recorded sessions instantly or export as portable JSON files for automation workflows.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    )
}

const CardDecorator = ({ children }: { children: ReactNode }) => (
    <div className="relative mx-auto size-36 duration-200">
        {/* Light mode grid */}
        <div
            aria-hidden
            className="absolute inset-0 opacity-10 group-hover:opacity-20 dark:hidden"
            style={{
                backgroundImage: `linear-gradient(to right, rgb(24 24 27) 1px, transparent 1px), linear-gradient(to bottom, rgb(24 24 27) 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
            }}
        />
        {/* Dark mode grid - much more subtle */}
        <div
            aria-hidden
            className="absolute inset-0 hidden opacity-[0.03] group-hover:opacity-[0.05] dark:block"
            style={{
                backgroundImage: `linear-gradient(to right, rgb(255 255 255) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255) 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
            }}
        />
        <div
            aria-hidden
            className="absolute inset-0"
            style={{
                background: 'radial-gradient(circle at center, transparent 0%, hsl(var(--background)) 75%)'
            }}
        />
        <div className="absolute inset-0 m-auto flex size-12 items-center justify-center border-l border-t border-zinc-950/10 bg-background dark:border-white/15 dark:group-hover:bg-white/5">{children}</div>
    </div>
)