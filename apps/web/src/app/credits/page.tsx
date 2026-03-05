import Link from 'next/link';

export default function CreditsPage() {
  return (
    <main className="min-h-screen flex flex-col items-center p-6 md:p-12">
      <div className="max-w-2xl w-full">
        <Link href="/" className="font-pixel text-xs text-forge-amber/60 hover:text-forge-amber mb-6 inline-block">
          ← Back
        </Link>

        <h1 className="font-pixel text-xl text-forge-amber mb-8">MIDFORGE — CREDITS</h1>

        <section className="mb-8">
          <h2 className="font-pixel text-sm text-forge-amber mb-3">Character Sprites</h2>
          <p className="text-forge-light/80 text-sm leading-relaxed mb-2">
            Character sprites composited from the{' '}
            <a
              href="https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator"
              target="_blank"
              rel="noopener noreferrer"
              className="text-forge-amber underline"
            >
              Universal LPC Spritesheet Character Generator
            </a>
          </p>
          <p className="text-forge-light/80 text-sm leading-relaxed mb-4">
            License:{' '}
            <a
              href="https://creativecommons.org/licenses/by-sa/3.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-forge-amber underline"
            >
              CC-BY-SA 3.0
            </a>
            {' '}and{' '}
            <a
              href="https://www.gnu.org/licenses/gpl-3.0.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-forge-amber underline"
            >
              GNU GPL 3.0
            </a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-pixel text-sm text-forge-amber mb-3">Original Artists</h2>
          <p className="text-forge-light/60 text-xs leading-relaxed">
            Johannes Sjölund (wulax), Michael Whitlock (bigbeargames), Matthew Krohn (makrohn),
            Nila122, David Conway Jr. (JaidynReiman), Carlo Enrico Victoria (Nemisys),
            Thane Brimhall (pennomi), laetissima, bluecarrot16, Luke Mehl,
            Benjamin K. Smith (BenCreating), MuffinElZangano, Durrani, kheftel,
            Stephen Challener (Redshrike), William.Thompsonj, Marcel van de Steeg (MadMarcel),
            TheraHedwig, Evert, Pierre Vigier (pvigier), Eliza Wyatt (ElizaWy),
            Sander Frenken (castelonia), dalonedrau, Lanea Zimmerman (Sharm),
            Manuel Riecke (MrBeast), Barbara Riviera, Joe White, Mandi Paugh,
            Shaun Williams, Daniel Eddeland (daneeklu), Emilio J. Sanchez-Sierra,
            drjamgo, gr3yh47, tskaufma, Fabzy, Yamilian, Skorpio, Tuomo Untinen (reemax),
            Tracy, thecilekli, LordNeo, Stafford McIntyre, PlatForge project, DCSS authors,
            DarkwallLKE, Charles Sanchez (CharlesGabriel), Radomir Dopieralski, macmanmatty,
            Cobra Hubbard (BlueVortexGames), Inboxninja, kcilds/Rocetti/Eredah,
            Napsio (Vitruvian Studio), The Foreman, AntumDeluge.
          </p>
          <p className="text-forge-light/60 text-xs mt-3">
            Full credits CSV:{' '}
            <a
              href="https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/blob/master/CREDITS.csv"
              target="_blank"
              rel="noopener noreferrer"
              className="text-forge-amber underline"
            >
              CREDITS.csv
            </a>
          </p>
          <p className="text-forge-light/60 text-xs mt-1">
            Original collection:{' '}
            <a
              href="http://opengameart.org/content/lpc-collection"
              target="_blank"
              rel="noopener noreferrer"
              className="text-forge-amber underline"
            >
              OpenGameArt.org — LPC Collection
            </a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-pixel text-sm text-forge-amber mb-3">Tilesets</h2>
          <p className="text-forge-light/80 text-sm leading-relaxed">
            <a
              href="https://kenney.nl/assets"
              target="_blank"
              rel="noopener noreferrer"
              className="text-forge-amber underline"
            >
              Kenney.nl
            </a>
            {' '}— CC0 License
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-pixel text-sm text-forge-amber mb-3">Sound Effects</h2>
          <p className="text-forge-light/80 text-sm leading-relaxed">
            <a
              href="https://kenney.nl/assets"
              target="_blank"
              rel="noopener noreferrer"
              className="text-forge-amber underline"
            >
              Kenney.nl
            </a>
            {' '}— CC0 License
          </p>
        </section>

        <div className="border-t border-forge-amber/20 pt-6 mt-8">
          <p className="text-forge-light/40 text-xs">
            Midforge © {new Date().getFullYear()} — All game logic and UI by the Midforge team.
          </p>
        </div>
      </div>
    </main>
  );
}
