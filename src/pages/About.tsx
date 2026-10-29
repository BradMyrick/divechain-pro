import { ExternalLink, Mail, Shield } from "lucide-react";
import { LINKS, live } from "../config/links";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.258 5.686 5.906-5.686zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 12.04.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

const BIO =
  "Brad Myrick is a software engineer, U.S. Army veteran and diver who built DiveChain to give divers a logbook they truly own. He served as an Army Sergeant from 2005 to 2011, including a deployment in Iraq. From 2014 to 2019 he worked as a commercial diver, and later as Diver Foreman and NDT Specialist at Underwater Construction Corp, leading inspection and repair dive teams at nuclear facilities. He trained at CDA Technical Institute (DCBC Unrestricted Diver, NDT Level 2) and earned his NASE Dive Master certification in 2014. Since 2020 he has built blockchain software, including the backend for TruGard.AI's smart contract security platform, and he authored ERC-8260, the standard DiveChain implements on Avalanche.";

export default function About() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">About DiveChain</h1>
      <p className="text-sm text-text-tertiary mb-6">
        Who builds it, what the standard is, and how to reach us.
      </p>
      <div className="depth-ruler mb-8" />

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-3">What DiveChain is</h2>
        <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
          A sovereign scuba logbook. Your dives live in a contract your wallet controls on Avalanche
          C-Chain, readable by any app that implements ERC-8260.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-3">The standard</h2>
        <p className="text-sm sm:text-base text-text-secondary leading-relaxed mb-4">
          ERC-8260 (Draft) defines a common interface for on-chain dive logs. DiveChain is the
          reference app. The <code className="text-surf text-xs">IDiveLog</code> interface ID is{" "}
          <code className="text-surf text-xs">0x321ef561</code>.
        </p>
        <ul className="space-y-2 text-sm">
          {live(LINKS.eipPr) && (
            <li>
              <a
                href={LINKS.eipPr}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-surf hover:underline"
              >
                EIP PR #1735: Add ERC: Dive Log <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
          )}
          {live(LINKS.snowtraceFactory) && (
            <li>
              <a
                href={LINKS.snowtraceFactory}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-surf hover:underline"
              >
                Verified mainnet factory on Snowtrace <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
          )}
          {live(LINKS.github) && (
            <li>
              <a
                href={LINKS.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-surf hover:underline"
              >
                Source on GitHub <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
          )}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Who builds it</h2>
        <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">
          <img
            src="/about/brad-myrick.webp"
            width={160}
            height={160}
            alt="Brad Myrick"
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl object-cover border border-card-border shrink-0"
            loading="lazy"
            decoding="async"
          />
          <div>
            <h3 className="text-base font-semibold text-white mb-1">Brad Myrick</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-4">{BIO}</p>
            <div className="flex flex-wrap gap-3 text-sm">
              {live(LINKS.founderX) && (
                <a href={LINKS.founderX} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-surf hover:underline">
                  <XIcon className="w-3.5 h-3.5" /> @kodr_pro
                </a>
              )}
              {live(LINKS.linkedin) && (
                <a href={LINKS.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-surf hover:underline">
                  LinkedIn <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {live(LINKS.founderSite) && (
                <a href={LINKS.founderSite} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-surf hover:underline">
                  kodr.pro <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-surf" /> Status
        </h2>
        <p className="text-sm sm:text-base text-text-secondary leading-relaxed mb-3">
          Live on Avalanche C-Chain since 2026. Not yet third-party audited. Contracts are verified
          on Snowtrace / Routescan.
        </p>
        <a
          href="https://github.com/BradMyrick/divechain-pro/blob/main/SECURITY.md"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-surf hover:underline"
        >
          Read SECURITY.md <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </section>

      <section className="mb-4">
        <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {live(LINKS.email) && (
            <a href={LINKS.email} className="inline-flex items-center gap-1.5 text-surf hover:underline">
              <Mail className="w-4 h-4" /> brad@kodr.pro
            </a>
          )}
          {live(LINKS.x) && (
            <a href={LINKS.x} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-surf hover:underline">
              <XIcon className="w-4 h-4" /> @dive_chain
            </a>
          )}
          {live(LINKS.github) && (
            <a href={LINKS.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-surf hover:underline">
              <GitHubIcon className="w-4 h-4" /> GitHub
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
