// Landing page: one full-bleed screen with two actions.
// Spec: docs/specs/landing/landing-page.md
import Image from "next/image";
import Link from "next/link";
import hero from "../public/landing/hero.jpg";

export default function Landing() {
  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-night px-4 text-white">
      <Image
        src={hero}
        alt=""
        priority
        sizes="100vw"
        placeholder="blur"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-[50%_55%]"
      />
      {/* Scrim: heaviest behind the text, so white copy stays at AA on any part of the photo. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgb(22_27_33/0.65),rgb(22_27_33/0.4))]"
      />

      <div className="flex max-w-3xl flex-col items-center text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em]">ClickJournal</p>
        <h1 className="animate-rise-in mt-6 text-[clamp(2.5rem,7vw,5.5rem)] font-semibold leading-none tracking-[-0.02em]">
          Get out there.
        </h1>
        <p className="mt-5 text-lg text-white/90">Photograph your city, one place at a time.</p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/sign-up"
            className="inline-flex min-h-11 items-center rounded-full bg-signal px-7 text-[0.9375rem] font-medium text-on-signal shadow-lg transition-colors hover:bg-signal-strong"
          >
            Sign up
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex min-h-11 items-center rounded-full border border-white/80 px-7 text-[0.9375rem] font-medium text-white transition-colors hover:bg-white/10"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
