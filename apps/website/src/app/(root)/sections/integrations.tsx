import { Gemini, Replit, MagicUI, VSCodium, MediaWiki, GooglePaLM } from '@/components/logos'
import { cn } from '@/lib/utils'
import { LogoIcon } from '@/components/logo'

export default function IntegrationsSection() {
    return (
        <section id="solution" className="bg-muted/30 dark:bg-muted/5">
            <div className="py-24 md:py-28">
                <div className="mx-auto max-w-5xl px-6 z-0!">
                    <div className="relative mx-auto flex max-w-sm items-center justify-between  z-0!">
                        <div className="space-y-6">
                            <IntegrationCard position="left-top">
                                <Gemini />
                            </IntegrationCard>
                            <IntegrationCard position="left-middle">
                                <Replit />
                            </IntegrationCard>
                            <IntegrationCard position="left-bottom">
                                <MagicUI />
                            </IntegrationCard>
                        </div>
                        <div className="mx-auto my-2 flex w-fit justify-center gap-2">
                            <div className="bg-muted relative z-20 rounded-2xl border p-1">
                                <IntegrationCard
                                    className="shadow-black-950/10 dark:bg-background size-16 border-black/25 shadow-xl dark:border-white/25 dark:shadow-white/10"
                                    isCenter={true}>
                                    <LogoIcon />
                                </IntegrationCard>
                            </div>
                        </div>
                        <div
                            role="presentation"
                            className="absolute inset-1/3 bg-[radial-gradient(var(--dots-color)_1px,transparent_1px)] opacity-50 [--dots-color:black] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] dark:[--dots-color:white]"></div>

                        <div className="space-y-6">
                            <IntegrationCard position="right-top">
                                <VSCodium />
                            </IntegrationCard>
                            <IntegrationCard position="right-middle">
                                <MediaWiki />
                            </IntegrationCard>
                            <IntegrationCard position="right-bottom">
                                <GooglePaLM />
                            </IntegrationCard>
                        </div>
                    </div>
                    <div className="mx-auto mt-12 max-w-lg space-y-4 text-center">
                        <h2 className="text-balance text-3xl font-semibold md:text-4xl">Powered by Leading AI & Development Tools</h2>
                        <p className="text-muted-foreground">SmartFill integrates with cutting-edge AI models and development platforms to deliver intelligent form filling and automation.</p>
                    </div>
                </div>
            </div>
        </section>
    )
}

const IntegrationCard = ({ children, className, position, isCenter = false }: { children: React.ReactNode; className?: string; position?: 'left-top' | 'left-middle' | 'left-bottom' | 'right-top' | 'right-middle' | 'right-bottom'; isCenter?: boolean }) => {
    return (
        <div className={cn('bg-background relative flex size-12 rounded-xl border dark:bg-transparent', className)}>
            <div className={cn('relative z-20 m-auto size-fit *:size-6', isCenter && '*:size-8')}>{children}</div>
            {position && !isCenter && (
                <div
                    className={cn(
                        'bg-linear-to-r to-muted-foreground/25 absolute z-10 h-px',
                        position === 'left-top' && 'left-full top-1/2 w-[130px] origin-left rotate-[25deg]',
                        position === 'left-middle' && 'left-full top-1/2 w-[120px] origin-left',
                        position === 'left-bottom' && 'left-full top-1/2 w-[130px] origin-left rotate-[-25deg]',
                        position === 'right-top' && 'bg-linear-to-l right-full top-1/2 w-[130px] origin-right rotate-[-25deg]',
                        position === 'right-middle' && 'bg-linear-to-l right-full top-1/2 w-[120px] origin-right',
                        position === 'right-bottom' && 'bg-linear-to-l right-full top-1/2 w-[130px] origin-right rotate-[25deg]'
                    )}
                />
            )}
        </div>
    )
}
