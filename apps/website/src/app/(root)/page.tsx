// ** import core packages
import React, { Suspense } from "react";

// ** import components
import { HeroHeader } from "@/components/header";
import { AuthExtensionHandler } from "@/components/auth-extension-handler";
import { ExtensionOpener } from "@/components/extension-opener";
import Footer from "@/components/footer";

// ** import sections
import HeroSection from "./sections/hero";
import Integration from "./sections/integrations";
import Features from "./sections/features";
import Fqas from "./sections/fqas";


export default function Page() {
  return (
    <>
      <Suspense fallback={null}>
        <AuthExtensionHandler />
        <ExtensionOpener />
      </Suspense>
      <HeroHeader />
      <HeroSection />
      <Features />
      <Integration />
      <Fqas />
      <Footer />
    </>
  );
}
