'use client';

// ** import core packages
import React from "react";

// ** import external libraries
import { MousePointer } from "lucide-react";
import Link from "next/link";

// ** import components
import { Button } from "@/components/ui/button";
import { HeroHeader } from "@/components/header";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import { AnimatedGroup } from "@/components/motion-primitives/animated-group";
import { BackgroundLines } from "@/components/ui/background-lines";

// ** import config
import { EXTENSION_CONFIG } from "@/config/extension";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring" as const,
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

export default function HeroSection() {
  return (
    <>
      <HeroHeader />
      <BackgroundLines className="overflow-hidden bg-muted/30 dark:bg-muted/5 pb-20">
        <main className="relative z-10">
        <div
          aria-hidden
          className="absolute inset-0 isolate hidden opacity-65 contain-strict lg:block"
        >
          <div className="w-140 h-320 -translate-y-87.5 absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="h-320 absolute left-0 top-0 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="h-320 -translate-y-87.5 absolute left-0 top-0 w-60 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
        </div>
        <section>
          <div className="relative pt-32 md:pt-40">
            <div className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_75%)]"></div>
            <div className="mx-auto max-w-5xl px-6">
              <div className="text-center">
                
                <TextEffect
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  as="h1"
                  className="text-balance text-6xl font-bold md:text-7xl lg:text-8xl"
                >
                  Fill Forms in 1 Click
                </TextEffect>
                
                <TextEffect
                  per="line"
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  delay={0.5}
                  as="p"
                  className="mx-auto mt-6 max-w-xl text-xl text-muted-foreground"
                >
                  Stop typing the same info over and over. 
                  SmartFill remembers and fills everything instantly.
                </TextEffect>

                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                  className="mt-10 flex flex-col items-center gap-4"
                >
                  <Button
                    asChild
                    size="lg"
                    className="h-14 rounded-full px-10 text-lg font-semibold shadow-xl transition-all hover:shadow-2xl hover:scale-105"
                  >
                    <Link 
                      href={`https://chrome.google.com/webstore/detail/${EXTENSION_CONFIG.EXTENSION_ID}`}
                      target="_blank"
                    >
                      <MousePointer className="mr-2 size-5" />
                      Add to Chrome (Free)
                    </Link>
                  </Button>
                  
                  <p className="text-sm text-muted-foreground">
                    Takes 5 seconds • No signup required
                  </p>
                </AnimatedGroup>

              </div>
            </div>
          </div>
        </section>
        </main>
      </BackgroundLines>
    </>
  );
}